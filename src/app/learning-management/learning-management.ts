import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService, CompanySector } from '../services/auth.service';
import {
  LearningItem,
  LearningKind,
  LearningMaterialType,
  LearningQuestion,
  LearningResult,
  LearningService,
  SaveLearningItem,
} from '../services/learning.service';
import { SystemNavigation } from '../shared/system-navigation';
import { parseLearningImport } from './learning-import';

type LearningTab = LearningKind;

@Component({
  selector: 'app-learning-management',
  imports: [FormsModule, SystemNavigation],
  templateUrl: './learning-management.html',
})
export class LearningManagement implements OnInit {
  private readonly learningService = inject(LearningService);
  private readonly authService = inject(AuthService);
  private historyRequestVersion = 0;
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');
  protected readonly items = signal<LearningItem[]>([]);
  protected readonly sectors = signal<CompanySector[]>([]);
  protected readonly activeTab = signal<LearningTab>('TREINAMENTO');
  protected readonly showInactive = signal(true);
  protected readonly editingId = signal<string | null>(null);
  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly selectedSectors = signal<string[]>([]);
  protected readonly active = signal(true);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly materialType = signal<LearningMaterialType>('YOUTUBE');
  protected readonly url = signal('');
  protected readonly pdf = signal<File | null>(null);
  protected readonly questions = signal<LearningQuestion[]>([]);
  protected readonly proofEnabled = signal(true);
  protected readonly proofTitle = signal('Prova da Aula');
  protected readonly proofDescription = signal('');
  protected readonly minimumScore = signal(70);
  protected readonly questionImportOpen = signal(false);
  protected readonly questionImportText = signal('');
  protected readonly questionImportError = signal('');
  protected readonly questionImportNotice = signal('');
  protected readonly historyItemId = signal<string | null>(null);
  protected readonly history = signal<LearningResult[]>([]);
  protected readonly historyLoading = signal(false);
  protected readonly formOpen = signal(false);
  protected readonly expandedDescriptions = signal<Set<string>>(new Set());
  protected readonly canManage = computed(() => {
    const profile = this.authService.currentUser()?.classificacao.trim().toLowerCase();
    return ['sakai', 'admin', 'hr_admin', 'supervisor'].includes(profile ?? '');
  });
  protected readonly filteredItems = computed(() =>
    this.items().filter((item) =>
      item.tipo === this.activeTab() && (this.showInactive() || item.ativo),
    ),
  );
  protected readonly sectorSelectionLabel = computed(() => {
    const selected = this.selectedSectors();
    const allSectors = this.sectors();
    if (selected.length === allSectors.length && selected.length > 0) return 'Todos os setores';
    if (!selected.length) return 'Selecione os setores';
    return allSectors
      .filter((sector) => selected.includes(sector.id))
      .map((sector) => sector.nome_setor)
      .join(', ');
  });
  protected readonly hasPdf = computed(
    () => this.items().find((item) => item.id === this.editingId())?.tem_pdf ?? false,
  );
  protected readonly currentPdfName = computed(
    () => this.items().find((item) => item.id === this.editingId())?.nome_arquivo_pdf ?? 'arquivo anexado',
  );

  ngOnInit(): void {
    if (this.canManage()) void this.load();
    else this.loading.set(false);
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [itemsResult, companyResult] = await Promise.allSettled([
        this.learningService.listar(),
        this.authService.buscarEmpresa(),
      ]);

      const errors: string[] = [];
      if (itemsResult.status === 'fulfilled') {
        this.items.set(itemsResult.value);
      } else {
        errors.push(itemsResult.reason instanceof Error
          ? itemsResult.reason.message
          : 'Não foi possível carregar os conteúdos.');
      }

      if (companyResult.status === 'fulfilled') {
        this.sectors.set(companyResult.value.setores);
      } else {
        errors.push(companyResult.reason instanceof Error
          ? companyResult.reason.message
          : 'Não foi possível carregar os setores da empresa.');
      }

      this.error.set(errors.join(' '));
    } finally {
      this.loading.set(false);
    }
  }

  protected openNew(type: LearningKind): void {
    this.resetQuestionImport();
    this.formOpen.set(true);
    this.activeTab.set(type);
    this.editingId.set(null);
    this.title.set('');
    this.description.set('');
    this.selectedSectors.set(this.sectors().map((sector) => sector.id));
    this.active.set(true);
    this.materialType.set('YOUTUBE');
    this.url.set('');
    this.pdf.set(null);
    this.proofEnabled.set(type === 'TREINAMENTO');
    this.proofTitle.set('Prova da Aula');
    this.proofDescription.set('');
    this.minimumScore.set(70);
    this.questions.set(type === 'AVALIACAO'
      ? this.newQuestions()
      : type === 'TREINAMENTO' ? this.newQuestions() : []);
    this.error.set('');
    this.notice.set('');
  }

  protected edit(item: LearningItem): void {
    this.resetQuestionImport();
    this.formOpen.set(true);
    this.activeTab.set(item.tipo);
    this.editingId.set(item.id);
    this.title.set(item.titulo);
    this.description.set(item.descricao ?? '');
    this.selectedSectors.set(item.setores.map((sector) => sector.id));
    this.active.set(item.ativo);
    this.materialType.set(item.tipo_material ?? 'YOUTUBE');
    this.url.set(item.url_material ?? '');
    this.pdf.set(null);
    this.questions.set(item.perguntas.map((question) => ({
      ...question,
      alternativas: question.alternativas.map((alternative) => ({ ...alternative })),
    })));
    this.proofEnabled.set(item.prova?.ativa ?? false);
    this.proofTitle.set(item.prova?.titulo ?? '');
    this.proofDescription.set(item.prova?.descricao ?? '');
    this.minimumScore.set(item.prova?.nota_minima ?? 70);
    if (item.tipo === 'TREINAMENTO' && item.prova?.perguntas.length) {
      this.questions.set(item.prova.perguntas.map((question) => ({
        ...question,
        alternativas: question.alternativas.map((alternative) => ({ ...alternative })),
      })));
    }
    this.error.set('');
    this.notice.set('');
  }

  protected cancelEdit(): void {
    this.resetQuestionImport();
    this.formOpen.set(false);
    this.editingId.set(null);
    this.pdf.set(null);
    this.error.set('');
    this.notice.set('');
  }

  protected toggleSectorFromEvent(event: Event, id: string): void {
    this.toggleSector(id, (event.target as HTMLInputElement).checked);
  }

  protected toggleInactive(event: Event): void {
    this.showInactive.set((event.target as HTMLInputElement).checked);
  }

  protected toggleSector(id: string, checked: boolean): void {
    this.selectedSectors.update((sectors) =>
      checked ? [...new Set([...sectors, id])] : sectors.filter((sectorId) => sectorId !== id),
    );
  }

  protected toggleAllSectors(checked: boolean): void {
    this.selectedSectors.set(checked ? this.sectors().map((sector) => sector.id) : []);
  }

  protected toggleDescription(id: string): void {
    this.expandedDescriptions.update((expanded) => {
      const next = new Set(expanded);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected changeMaterialType(type: LearningMaterialType): void {
    this.materialType.set(type);
    this.url.set('');
    this.pdf.set(null);
  }

  protected selectPdf(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.pdf.set(file);
    if (file) this.url.set('');
  }

  protected toggleQuestionImport(): void {
    this.questionImportOpen.update((open) => !open);
    this.questionImportError.set('');
    this.questionImportNotice.set('');
  }

  protected async loadQuestionImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json')) {
      this.questionImportError.set('Selecione um arquivo .json válido.');
      return;
    }

    try {
      this.questionImportText.set(await file.text());
      this.questionImportError.set('');
      this.questionImportNotice.set(`Arquivo ${file.name} carregado. Revise e importe as questões.`);
    } catch (error: unknown) {
      this.questionImportError.set(error instanceof Error ? error.message : 'Não foi possível ler o arquivo JSON.');
    }
  }

  protected importQuestions(): void {
    this.questionImportError.set('');
    this.questionImportNotice.set('');
    try {
      const imported = parseLearningImport(this.questionImportText());
      const hasExistingQuestions = this.questions().some((question) =>
        question.texto.trim() || question.alternativas.some((alternative) => alternative.texto.trim()),
      );
      if (hasExistingQuestions && !window.confirm(
        'A importação substituirá as questões que estão no formulário. Deseja continuar?',
      )) return;

      this.questions.set(imported.perguntas.map((question) => ({
        id: crypto.randomUUID(),
        texto: question.texto,
        alternativas: question.alternativas.map((alternative) => ({
          id: crypto.randomUUID(),
          texto: alternative.texto,
          correta: alternative.correta,
        })),
      })));
      if (this.activeTab() === 'TREINAMENTO') {
        this.proofEnabled.set(true);
        this.proofTitle.set(imported.titulo);
        if (imported.prova?.descricao !== undefined) this.proofDescription.set(imported.prova.descricao);
        if (imported.prova?.notaMinima !== undefined) this.minimumScore.set(imported.prova.notaMinima);
        if (imported.treinamento?.titulo !== undefined) this.title.set(imported.treinamento.titulo);
        if (imported.treinamento?.descricao !== undefined) this.description.set(imported.treinamento.descricao);
        if (imported.treinamento?.tipoMaterial !== undefined) {
          this.materialType.set(imported.treinamento.tipoMaterial);
        }
        if (imported.treinamento?.urlMaterial !== undefined) this.url.set(imported.treinamento.urlMaterial);
      } else {
        this.title.set(imported.titulo);
        if (imported.prova?.descricao !== undefined) this.description.set(imported.prova.descricao);
      }
      this.questionImportText.set('');
      this.questionImportNotice.set(
        `${imported.perguntas.length} questões importadas${imported.treinamento ? ' com os dados do treinamento' : ''}. Revise o formulário antes de salvar.`,
      );
    } catch (error: unknown) {
      this.questionImportError.set(error instanceof Error ? error.message : 'Não foi possível importar as questões.');
    }
  }

  protected async save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.error.set('');
    this.notice.set('');

    const validationMessage = this.validateForm();
    if (validationMessage) {
      this.error.set(validationMessage);
      return;
    }

    const type = this.activeTab();
    const data: SaveLearningItem = {
      tipo: type,
      titulo: this.title().trim(),
      descricao: this.description().trim() || null,
      setores: this.selectedSectors(),
      ativo: this.active(),
      tipo_material: type === 'TREINAMENTO' ? this.materialType() : null,
      url_material: type === 'TREINAMENTO' && this.materialType() !== 'PDF'
        ? this.url().trim()
        : type === 'TREINAMENTO' && this.materialType() === 'PDF' && !this.pdf()
          ? this.url().trim() || null
          : null,
      perguntas: type === 'AVALIACAO'
        ? this.questionsForSave()
        : undefined,
      prova: type === 'TREINAMENTO'
        ? {
            ativa: this.proofEnabled(),
            titulo: this.proofTitle().trim() || null,
            descricao: this.proofDescription().trim() || null,
            nota_minima: this.minimumScore(),
            perguntas: this.proofEnabled() ? this.questionsForSave() : [],
          }
        : undefined,
      pdf: this.pdf(),
    };

    this.saving.set(true);
    try {
      const saved = await this.learningService.salvar(data, this.editingId() ?? undefined);
      this.items.update((items) => {
        const index = items.findIndex((item) => item.id === saved.id);
        if (index < 0) return [saved, ...items];
        const updated = [...items];
        updated[index] = saved;
        return updated;
      });
      this.cancelEdit();
      this.notice.set('Conteúdo salvo com sucesso.');
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível salvar o conteúdo.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async toggleActive(item: LearningItem): Promise<void> {
    this.error.set('');
    this.notice.set('');
    try {
      await this.learningService.atualizarStatus(item.id, !item.ativo);
      this.items.update((items) =>
        items.map((current) => current.id === item.id ? { ...current, ativo: !item.ativo } : current),
      );
      if (this.editingId() === item.id) this.active.set(!item.ativo);
      this.notice.set(item.ativo ? 'Conteúdo desativado.' : 'Conteúdo ativado.');
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível alterar o status.');
    }
  }

  protected async deleteItem(item: LearningItem): Promise<void> {
    const typeLabel = item.tipo === 'TREINAMENTO' ? 'treinamento' : 'avaliação';
    const confirmed = window.confirm(
      `Excluir o ${typeLabel} "${item.titulo}"?\n\nTodas as respostas e resultados vinculados também serão apagados permanentemente, se houver. Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    this.error.set('');
    this.notice.set('');
    this.deletingId.set(item.id);
    try {
      await this.learningService.excluir(item.id, true);
      this.items.update((items) => items.filter((current) => current.id !== item.id));
      if (this.historyItemId() === item.id) {
        this.historyRequestVersion++;
        this.historyItemId.set(null);
        this.history.set([]);
        this.historyLoading.set(false);
      }
      this.notice.set(`${typeLabel.charAt(0).toUpperCase()}${typeLabel.slice(1)} excluído com sucesso.`);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível excluir o conteúdo.');
    } finally {
      this.deletingId.set(null);
    }
  }

  protected async loadResults(item: LearningItem): Promise<void> {
    if (this.historyItemId() === item.id) {
      this.historyRequestVersion++;
      this.historyItemId.set(null);
      this.history.set([]);
      this.historyLoading.set(false);
      return;
    }
    const requestVersion = ++this.historyRequestVersion;
    this.historyItemId.set(item.id);
    this.history.set([]);
    this.historyLoading.set(true);
    this.error.set('');
    try {
      const results = await this.learningService.listarResultados(item.id);
      if (requestVersion === this.historyRequestVersion && this.historyItemId() === item.id) {
        this.history.set(results);
      }
    } catch (error: unknown) {
      if (requestVersion === this.historyRequestVersion && this.historyItemId() === item.id) {
        this.error.set(error instanceof Error ? error.message : 'Não foi possível carregar o histórico.');
      }
    } finally {
      if (requestVersion === this.historyRequestVersion) this.historyLoading.set(false);
    }
  }

  protected updateQuestionText(questionId: string, text: string): void {
    this.questions.update((questions) =>
      questions.map((question) => question.id === questionId ? { ...question, texto: text } : question),
    );
  }

  protected addQuestion(): void {
    this.questions.update((questions) => [...questions, this.newQuestion()]);
  }

  protected removeQuestion(questionId: string): void {
    this.questions.update((questions) => questions.filter((question) => question.id !== questionId));
  }

  protected updateAlternativeText(questionId: string, alternativeId: string, text: string): void {
    this.questions.update((questions) => questions.map((question) =>
      question.id === questionId
        ? {
            ...question,
            alternativas: question.alternativas.map((alternative) =>
              alternative.id === alternativeId ? { ...alternative, texto: text } : alternative,
            ),
          }
        : question,
    ));
  }

  protected setCorrectAlternative(questionId: string, alternativeId: string): void {
    this.questions.update((questions) => questions.map((question) =>
      question.id === questionId
        ? {
            ...question,
            alternativas: question.alternativas.map((alternative) => ({
              ...alternative,
              correta: alternative.id === alternativeId,
            })),
          }
        : question,
    ));
  }

  protected addAlternative(questionId: string): void {
    this.questions.update((questions) => questions.map((question) =>
      question.id === questionId
        ? {
            ...question,
            alternativas: [
              ...question.alternativas,
              { id: crypto.randomUUID(), texto: '', correta: false },
            ],
          }
        : question,
    ));
  }

  protected removeAlternative(questionId: string, alternativeId: string): void {
    this.questions.update((questions) => questions.map((question) => {
      if (question.id !== questionId) return question;
      const alternatives = question.alternativas.filter((alternative) => alternative.id !== alternativeId);
      const firstAlternative = alternatives[0];
      if (firstAlternative && !alternatives.some((alternative) => alternative.correta)) {
        alternatives[0] = { ...firstAlternative, correta: true };
      }
      return { ...question, alternativas: alternatives };
    }));
  }

  protected materialTypeLabel(type: LearningMaterialType | null): string {
    if (type === 'YOUTUBE') return 'Vídeo do YouTube';
    if (type === 'ARTIGO') return 'Artigo externo';
    if (type === 'PDF') return 'PDF';
    return 'Avaliação';
  }

  protected formatDateTime(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Data indisponível'
      : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }

  private validateForm(): string | null {
    if (this.title().trim().length < 2) return 'Informe um título com pelo menos 2 caracteres.';
    if (!this.selectedSectors().length) return 'Selecione ao menos um setor destinatário.';
    if (this.activeTab() === 'TREINAMENTO') {
      if (this.materialType() === 'PDF') {
        const file = this.pdf();
        if (file && (file.type !== 'application/pdf' || file.size > 10 * 1024 * 1024)) {
          return 'Selecione um arquivo PDF de até 10 MiB.';
        }
        if (!this.url().trim() && !file && !this.hasPdf()) {
          return 'Informe uma URL de PDF ou anexe um arquivo.';
        }
      } else {
        try {
          const parsed = new URL(this.url().trim());
          if (!['http:', 'https:'].includes(parsed.protocol)) return 'Informe uma URL HTTP ou HTTPS válida.';
          if (this.materialType() === 'YOUTUBE' &&
            !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(parsed.hostname.toLowerCase())) {
            return 'Informe uma URL válida do YouTube.';
          }
        } catch {
          return this.materialType() === 'YOUTUBE'
            ? 'Informe uma URL válida do YouTube.'
            : 'Informe uma URL válida para o artigo.';
        }
      }
      return null;
    }
    if (this.activeTab() === 'TREINAMENTO' && !this.proofEnabled()) return null;
    if (this.activeTab() === 'TREINAMENTO' && this.proofTitle().trim().length < 2) {
      return 'Informe o título da prova com pelo menos 2 caracteres.';
    }
    if (this.activeTab() === 'TREINAMENTO' &&
      (!Number.isInteger(this.minimumScore()) || this.minimumScore() < 0 || this.minimumScore() > 100)) {
      return 'A nota mínima deve ser um número entre 0 e 100.';
    }
    if (!this.questions().length) return 'Adicione ao menos uma pergunta.';
    for (const [index, question] of this.questions().entries()) {
      if (!question.texto.trim()) return `Informe o texto da pergunta ${index + 1}.`;
      if (question.alternativas.length < 2) return `A pergunta ${index + 1} precisa ter ao menos duas alternativas.`;
      if (question.alternativas.some((alternative) => !alternative.texto.trim())) {
        return `Preencha todas as alternativas da pergunta ${index + 1}.`;
      }
      if (question.alternativas.filter((alternative) => alternative.correta).length !== 1) {
        return `Defina exatamente uma resposta correta para a pergunta ${index + 1}.`;
      }
    }
    return null;
  }

  private newQuestion(): LearningQuestion {
    return {
      id: crypto.randomUUID(),
      texto: '',
      alternativas: [
        { id: crypto.randomUUID(), texto: '', correta: true },
        { id: crypto.randomUUID(), texto: '', correta: false },
        { id: crypto.randomUUID(), texto: '', correta: false },
        { id: crypto.randomUUID(), texto: '', correta: false },
      ],
    };
  }

  private resetQuestionImport(): void {
    this.questionImportOpen.set(false);
    this.questionImportText.set('');
    this.questionImportError.set('');
    this.questionImportNotice.set('');
  }

  private newQuestions(): LearningQuestion[] {
    return [this.newQuestion(), this.newQuestion(), this.newQuestion()];
  }

  private questionsForSave(): Array<{
    id: string;
    texto: string;
    alternativas: Array<{ id: string; texto: string; correta: boolean }>;
  }> {
    return this.questions().map((question) => ({
      id: question.id,
      texto: question.texto.trim(),
      alternativas: question.alternativas.map((alternative) => ({
        id: alternative.id,
        texto: alternative.texto.trim(),
        correta: alternative.correta === true,
      })),
    }));
  }
}
