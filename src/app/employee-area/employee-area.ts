import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  QueryList,
  signal,
  ViewChildren,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiUser, AuthService } from '../services/auth.service';
import { LearningItem, LearningQuestion, LearningService } from '../services/learning.service';
import { SystemNavigation } from '../shared/system-navigation';

interface PersonalTask {
  id: string;
  title: string;
  completed: boolean;
}

@Component({
  selector: 'app-employee-area',
  imports: [FormsModule, SystemNavigation, RouterLink],
  templateUrl: './employee-area.html',
})
export class EmployeeArea implements AfterViewInit, OnInit, OnDestroy {
  protected readonly authService = inject(AuthService);
  private readonly learningService = inject(LearningService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly employee = signal<ApiUser | null>(null);
  protected readonly isEmployee = computed(
    () => this.authService.currentUser()?.classificacao.trim().toUpperCase() === 'EMPLOYEE',
  );
  protected readonly tasks = signal<PersonalTask[]>(this.readTasks());
  protected readonly newTaskTitle = signal('');
  protected readonly completedTasks = computed(() => this.tasks().filter((task) => task.completed).length);
  protected readonly sortedTasks = computed(() => [...this.tasks()].sort((a, b) => Number(a.completed) - Number(b.completed)));
  protected readonly learningItems = signal<LearningItem[]>([]);
  protected readonly activeTrainings = computed(() =>
    this.learningItems().filter((item) => item.tipo === 'TREINAMENTO'),
  );
  protected readonly activeAssessments = computed(() =>
    this.learningItems().filter((item) => item.tipo === 'AVALIACAO'),
  );
  protected readonly learningLoading = signal(true);
  protected readonly learningError = signal('');
  protected readonly learningNotice = signal('');
  protected readonly expandedDescriptions = signal<Set<string>>(new Set());
  protected readonly truncatedDescriptions = signal<Set<string>>(new Set());
  protected readonly selectedContentId = signal<string | null>(null);
  protected readonly selectedLearningItem = computed(() =>
    this.learningItems().find((item) => item.id === this.selectedContentId()) ?? null,
  );
  protected readonly visibleTrainings = computed(() => {
    const selected = this.selectedLearningItem();
    if (selected) return selected.tipo === 'TREINAMENTO' ? [selected] : [];
    return this.activeTrainings();
  });
  protected readonly visibleAssessments = computed(() => {
    const selected = this.selectedLearningItem();
    if (selected) return selected.tipo === 'AVALIACAO' ? [selected] : [];
    return this.activeAssessments();
  });
  protected readonly resourceFrame = signal<SafeResourceUrl | null>(null);
  protected readonly resourceOpenUrl = signal<string | null>(null);
  protected readonly selectedResourceTitle = signal('');
  protected readonly pdfLoading = signal(false);
  protected readonly submittingAssessment = signal<string | null>(null);
  protected readonly assessmentAnswers = signal<Record<string, string>>({});
  @ViewChildren('learningDescription') private descriptionElements!: QueryList<ElementRef<HTMLParagraphElement>>;
  private readonly pdfObjectUrls = new Set<string>();
  private descriptionObserver: ResizeObserver | null = null;
  private descriptionElementsSubscription?: Subscription;

  ngOnInit(): void {
    void this.loadEmployee();
    void this.loadEmployeeLearning();
  }

  ngAfterViewInit(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.descriptionObserver = new ResizeObserver(() => this.refreshDescriptionOverflow());
    }
    this.descriptionElementsSubscription = this.descriptionElements.changes.subscribe(() =>
      this.observeDescriptionElements(),
    );
    this.observeDescriptionElements();
  }

  ngOnDestroy(): void {
    this.descriptionElementsSubscription?.unsubscribe();
    this.descriptionObserver?.disconnect();
    for (const url of this.pdfObjectUrls) URL.revokeObjectURL(url);
    this.pdfObjectUrls.clear();
  }

  protected async loadEmployeeLearning(): Promise<void> {
    this.learningLoading.set(true);
    this.learningError.set('');
    try {
      const items = await this.learningService.listar();
      this.learningItems.set(items.filter((item) => item.ativo));
    } catch (error: unknown) {
      this.learningError.set(error instanceof Error ? error.message : 'Não foi possível carregar os conteúdos.');
    } finally {
      this.learningLoading.set(false);
    }
  }

  protected toggleDescription(id: string): void {
    this.expandedDescriptions.update((expanded) => {
      const next = new Set(expanded);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  private observeDescriptionElements(): void {
    this.descriptionObserver?.disconnect();
    if (this.descriptionObserver) {
      for (const reference of this.descriptionElements) {
        this.descriptionObserver.observe(reference.nativeElement);
      }
    }
    this.refreshDescriptionOverflow();
  }

  private refreshDescriptionOverflow(): void {
    const expanded = this.expandedDescriptions();
    const previous = this.truncatedDescriptions();
    const truncated = new Set<string>();
    for (const reference of this.descriptionElements) {
      const element = reference.nativeElement;
      const id = element.getAttribute('data-description-id');
      if (!id) continue;
      if (expanded.has(id) && previous.has(id)) {
        truncated.add(id);
      } else if (this.hasDescriptionOverflow(element)) {
        truncated.add(id);
      }
    }
    if (previous.size !== truncated.size || [...previous].some((id) => !truncated.has(id))) {
      this.truncatedDescriptions.set(truncated);
    }
  }

  private hasDescriptionOverflow(element: HTMLParagraphElement): boolean {
    const visibleHeight = element.getBoundingClientRect().height;
    const clone = element.cloneNode(true) as HTMLParagraphElement;
    const style = getComputedStyle(element);
    clone.classList.remove('line-clamp-2');
    Object.assign(clone.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      visibility: 'hidden',
      width: `${element.getBoundingClientRect().width}px`,
      height: 'auto',
      maxHeight: 'none',
      overflow: 'visible',
      display: 'block',
      font: style.font,
      lineHeight: style.lineHeight,
      letterSpacing: style.letterSpacing,
      whiteSpace: style.whiteSpace,
      wordBreak: style.wordBreak,
      overflowWrap: style.overflowWrap,
      padding: style.padding,
      border: style.border,
      boxSizing: style.boxSizing,
    });
    document.body.append(clone);
    try {
      return clone.getBoundingClientRect().height > visibleHeight + 1;
    } finally {
      clone.remove();
    }
  }

  protected async openTraining(item: LearningItem): Promise<void> {
    this.selectLearningContent(item);

    if (item.tipo_material === 'YOUTUBE' && item.url_material) {
      const videoId = this.youtubeVideoId(item.url_material);
      if (!videoId) {
        this.learningError.set('Não foi possível reconhecer este link do YouTube. Abra o vídeo em uma nova aba.');
        return;
      }
      const url = `https://www.youtube-nocookie.com/embed/${videoId}`;
      this.resourceFrame.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      this.resourceOpenUrl.set(item.url_material);
      return;
    }

    if (item.tipo_material === 'ARTIGO' && item.url_material) {
      window.open(item.url_material, '_blank', 'noopener,noreferrer');
      return;
    }

    if (item.tipo_material === 'PDF' && item.url_material) {
      try {
        const parsed = new URL(item.url_material);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
        this.resourceFrame.set(this.sanitizer.bypassSecurityTrustResourceUrl(parsed.href));
        this.resourceOpenUrl.set(parsed.href);
      } catch {
        this.learningError.set('O link deste PDF é inválido. Solicite a revisão do conteúdo ao RH.');
      }
      return;
    }

    if (item.tipo_material === 'PDF' && item.tem_pdf) {
      this.pdfLoading.set(true);
      try {
        const file = await this.learningService.baixarPdf(item.id);
        const objectUrl = URL.createObjectURL(file);
        this.pdfObjectUrls.add(objectUrl);
        this.resourceFrame.set(
          this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl),
        );
        this.resourceOpenUrl.set(objectUrl);
      } catch (error: unknown) {
        this.learningError.set(error instanceof Error ? error.message : 'Não foi possível abrir o PDF.');
      } finally {
        this.pdfLoading.set(false);
      }
      return;
    }

    this.learningError.set('Este treinamento não possui um conteúdo disponível.');
  }

  protected selectLearningContent(item: LearningItem): void {
    this.learningError.set('');
    this.learningNotice.set('');
    this.selectedContentId.set(item.id);
    this.selectedResourceTitle.set(item.titulo);
    this.resourceFrame.set(null);
    this.resourceOpenUrl.set(null);
  }

  protected closeSelectedContent(): void {
    this.selectedContentId.set(null);
    this.resourceFrame.set(null);
    this.resourceOpenUrl.set(null);
  }

  protected openResourceInNewTab(): void {
    const url = this.resourceOpenUrl();
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }

  protected setAssessmentAnswer(questionId: string, alternativeId: string): void {
    this.assessmentAnswers.update((answers) => ({ ...answers, [questionId]: alternativeId }));
  }

  protected hasAllAnswers(item: LearningItem): boolean {
    const answers = this.assessmentAnswers();
    const questions = this.assessmentQuestions(item);
    return questions.length > 0 && questions.every((question) => Boolean(answers[question.id]));
  }

  protected assessmentQuestions(item: LearningItem): LearningQuestion[] {
    return item.tipo === 'TREINAMENTO' ? item.prova?.perguntas ?? [] : item.perguntas;
  }

  protected async submitAssessment(item: LearningItem): Promise<void> {
    this.learningError.set('');
    this.learningNotice.set('');
    if (!this.hasAllAnswers(item)) {
      this.learningError.set('Responda a todas as perguntas antes de enviar.');
      return;
    }
    this.submittingAssessment.set(item.id);
    try {
      const answers = this.assessmentAnswers();
      const questions = this.assessmentQuestions(item);
      const result = await this.learningService.enviarAvaliacao(
        item.id,
        questions.map((question) => ({
          pergunta_id: question.id,
          alternativa_id: answers[question.id] ?? '',
        })),
      );
      this.learningItems.update((items) => items.map((current) =>
        current.id === item.id
          ? {
              ...current,
              ...(current.tipo === 'TREINAMENTO'
                ? {
                    prova: current.prova ? {
                      ...current.prova,
                      tentada: true,
                      resultado: { ...result, entregue_em: new Date().toISOString() },
                    } : null,
                  }
                : {
                    tentada: true,
                    resultado: { ...result, entregue_em: new Date().toISOString() },
                  }),
            }
          : current,
      ));
      this.assessmentAnswers.update((current) => {
        const next = { ...current };
        for (const question of questions) delete next[question.id];
        return next;
      });
      const resultText = `${result.acertos} de ${result.total_perguntas} acertos (${result.percentual}%).`;
      this.learningNotice.set(
        result.aprovado === null
          ? `Avaliação enviada. Você acertou ${resultText}`
          : `Prova enviada: ${resultText} ${result.aprovado ? 'Aprovado.' : 'Não atingiu a nota mínima de ' + result.nota_minima + '%.'}`,
      );
    } catch (error: unknown) {
      this.learningError.set(error instanceof Error ? error.message : 'Não foi possível enviar a avaliação.');
    } finally {
      this.submittingAssessment.set(null);
    }
  }

  private youtubeVideoId(value: string): string | null {
    try {
      const parsed = new URL(value);
      const hostname = parsed.hostname.toLowerCase();
      let candidate = '';
      if (hostname === 'youtu.be') candidate = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
      else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(hostname)) {
        candidate = parsed.searchParams.get('v') ?? parsed.pathname.split('/').filter(Boolean).at(-1) ?? '';
      } else return null;
      return /^[\w-]{11}$/.test(candidate) ? candidate : null;
    } catch {
      return null;
    }
  }

  protected async loadEmployee(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const userId = this.authService.currentUser()?.id;
      this.employee.set((await this.authService.listarUsuariosAtivos()).find((user) => user.id === userId) ?? null);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível carregar seu perfil.');
    } finally {
      this.loading.set(false);
    }
  }

  protected addTask(event: SubmitEvent): void {
    event.preventDefault();
    const title = this.newTaskTitle().trim();
    if (!title) return;
    const next = [...this.tasks(), { id: crypto.randomUUID(), title, completed: false }];
    this.tasks.set(next);
    this.persistTasks(next);
    this.newTaskTitle.set('');
  }

  protected toggleTask(id: string): void {
    const next = this.tasks().map((task) => task.id === id ? { ...task, completed: !task.completed } : task);
    this.tasks.set(next);
    this.persistTasks(next);
  }

  protected removeTask(id: string): void {
    const next = this.tasks().filter((task) => task.id !== id);
    this.tasks.set(next);
    this.persistTasks(next);
  }

  protected initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return 'Não informada';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Não informada' : date.toLocaleDateString('pt-BR');
  }

  private readTasks(): PersonalTask[] {
    try {
      const key = `rhumi_personal_tasks_${this.authService.currentUser()?.id ?? 'guest'}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) as PersonalTask[] : [];
    } catch {
      return [];
    }
  }

  private persistTasks(tasks: PersonalTask[]): void {
    const key = `rhumi_personal_tasks_${this.authService.currentUser()?.id ?? 'guest'}`;
    localStorage.setItem(key, JSON.stringify(tasks));
  }
}
