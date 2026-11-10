import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  ApiEmployeeJourney,
  ApiJourneyStage,
  ApiJourneyTask,
  ApiUser,
  AuthService,
} from '../services/auth.service';
import { NavigationOrb } from '../shared/navigation-orb';

@Component({
  selector: 'app-journey',
  imports: [NavigationOrb],
  templateUrl: './journey.html',
})
export class Journey implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly router = inject(Router);
  protected readonly journeys = signal<ApiEmployeeJourney[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly actionError = signal('');
  protected readonly navigationOpen = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly selectedEmployeeId = signal<string | null>(null);
  protected readonly expandedStages = signal<Set<string>>(new Set());
  protected readonly pendingTaskUncheck = signal<string | null>(null);
  protected readonly pendingStageReopen = signal<string | null>(null);
  protected readonly savingTask = signal<string | null>(null);
  protected readonly savingStage = signal<string | null>(null);
  protected readonly navigationItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Funcionários', icon: 'employees', route: '/funcionarios' },
    { label: 'Empresa', icon: 'company', route: '/empresa' },
    { label: 'Jornada', icon: 'journey', route: '/jornada' },
    { label: 'Calendário', icon: 'calendar', route: '/calendario' },
    { label: 'Recrutamento', icon: 'recruitment', route: '/recrutamento' },
    { label: 'Área do colaborador', icon: 'employee-area', route: '/area-colaborador' },
    { label: 'Configurações', icon: 'settings', route: '/configuracoes' },
  ];

  protected readonly filteredJourneys = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase('pt-BR');
    return this.journeys().filter((journey) =>
      [
        journey.employee.nome,
        journey.employee.login,
        journey.employee.cargo ?? '',
        journey.employee.setor ?? '',
      ].some((value) => value.toLocaleLowerCase('pt-BR').includes(term)),
    );
  });
  protected readonly selectedJourney = computed(
    () =>
      this.journeys().find((journey) => journey.employee.id === this.selectedEmployeeId()) ??
      this.journeys()[0] ??
      null,
  );
  protected readonly selectedEmployee = computed(() => this.selectedJourney()?.employee ?? null);
  protected readonly averageProgress = computed(() => {
    const journeys = this.journeys();
    return journeys.length
      ? Math.round(
          journeys.reduce((total, journey) => total + this.employeeProgress(journey), 0) / journeys.length,
        )
      : 0;
  });
  protected readonly completedJourneyCount = computed(
    () => this.journeys().filter((journey) => this.employeeProgress(journey) === 100).length,
  );
  protected readonly inProgressCount = computed(
    () =>
      this.journeys().filter((journey) => {
        const progress = this.employeeProgress(journey);
        return progress > 0 && progress < 100;
      }).length,
  );
  protected readonly daysInCompany = computed(() => {
    const admission = this.selectedEmployee()?.data_admissao;
    if (!admission) return null;

    const admissionDate = this.parseDate(admission);
    if (!admissionDate) return null;

    const today = new Date();
    const admissionTime = Date.UTC(admissionDate.getFullYear(), admissionDate.getMonth(), admissionDate.getDate());
    const todayTime = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

    return Math.max(0, Math.floor((todayTime - admissionTime) / 86_400_000));
  });

  ngOnInit(): void {
    void this.loadJourney();
  }

  protected async loadJourney(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    this.actionError.set('');
    try {
      const journeys = await this.authService.listarJornadas();
      this.journeys.set(journeys);
      const selectedId = this.selectedEmployeeId();
      if (!selectedId || !journeys.some((journey) => journey.employee.id === selectedId)) {
        this.selectedEmployeeId.set(journeys[0]?.employee.id ?? null);
      }
      const selectedJourney =
        journeys.find((journey) => journey.employee.id === this.selectedEmployeeId()) ?? journeys[0];
      if (selectedJourney) this.expandCurrentStage(selectedJourney);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível carregar a jornada.');
    } finally {
      this.loading.set(false);
    }
  }

  protected onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected selectEmployee(id: string): void {
    this.selectedEmployeeId.set(id);
    this.pendingTaskUncheck.set(null);
    this.pendingStageReopen.set(null);
    this.actionError.set('');
    const journey = this.journeys().find((item) => item.employee.id === id);
    if (journey) this.expandCurrentStage(journey);
  }

  protected isSelected(employee: ApiUser): boolean {
    return this.selectedEmployee()?.id === employee.id;
  }

  protected toggleNavigation(): void {
    this.navigationOpen.update((open) => !open);
  }

  protected navigateTo(route: string | null): void {
    if (!route) return;
    this.navigationOpen.set(false);
    void this.router.navigateByUrl(route);
  }

  protected async logout(): Promise<void> {
    try {
      await this.authService.logout();
    } catch {
      this.navigationOpen.set(false);
    }

    await this.router.navigate(['/']);
  }

  protected employeeProgress(journey: ApiEmployeeJourney): number {
    const tasks = journey.stages.flatMap((stage) => stage.tasks);
    if (tasks.length === 0) return 0;
    return Math.round((tasks.filter((task) => task.concluida).length / tasks.length) * 100);
  }

  protected completedStages(journey: ApiEmployeeJourney): number {
    return journey.stages.filter((stage) => this.isStageCompleted(stage)).length;
  }

  protected progressForStage(stage: ApiJourneyStage): number {
    if (stage.tasks.length === 0) return 0;
    return Math.round((stage.tasks.filter((task) => task.concluida).length / stage.tasks.length) * 100);
  }

  protected completedTaskCount(stage: ApiJourneyStage): number {
    return stage.tasks.filter((task) => task.concluida).length;
  }

  protected isStageCompleted(stage: ApiJourneyStage): boolean {
    return stage.tasks.length > 0 && stage.tasks.every((task) => task.concluida);
  }

  protected stageCompletionDate(stage: ApiJourneyStage): string | null {
    return (
      stage.tasks
        .map((task) => task.concluida_em)
        .filter((date): date is string => date !== null)
        .sort()
        .at(-1) ?? null
    );
  }

  protected stageStatus(journey: ApiEmployeeJourney, stage: ApiJourneyStage): string {
    if (this.isStageCompleted(stage)) return 'Concluído';
    if (stage.tasks.some((task) => task.concluida)) return 'Em andamento';
    const nextStage = journey.stages.find((item) => !this.isStageCompleted(item));
    return nextStage?.key === stage.key ? 'Em andamento' : 'Pendente';
  }

  protected currentStageTitle(journey: ApiEmployeeJourney): string {
    return journey.stages.find((stage) => !this.isStageCompleted(stage))?.title ?? 'Jornada concluída';
  }

  protected indicatorValue(stage: ApiJourneyStage): string {
    if (stage.indicator.type === 'boolean') return this.isStageCompleted(stage) ? 'Sim ✓' : 'Não';
    if (stage.indicator.type === 'count') {
      const completed = stage.tasks.filter((task) => task.concluida).length;
      return `${completed}/${stage.tasks.length}`;
    }
    return `${this.progressForStage(stage)}%`;
  }

  protected isStageExpanded(employeeId: string, stageKey: string): boolean {
    return this.expandedStages().has(this.stageIdentity(employeeId, stageKey));
  }

  protected toggleStage(employeeId: string, stageKey: string): void {
    const identity = this.stageIdentity(employeeId, stageKey);
    this.expandedStages.update((expanded) => {
      const next = new Set(expanded);
      if (next.has(identity)) next.delete(identity);
      else next.add(identity);
      return next;
    });
  }

  protected async toggleTask(
    journey: ApiEmployeeJourney,
    stage: ApiJourneyStage,
    task: ApiJourneyTask,
  ): Promise<void> {
    const identity = this.taskIdentity(journey.employee.id, stage.key, task.key);
    if (this.savingTask() || this.savingStage()) return;

    if (task.concluida) {
      if (this.pendingTaskUncheck() !== identity) {
        this.pendingTaskUncheck.set(identity);
        this.pendingStageReopen.set(null);
        return;
      }
      await this.persistTask(journey.employee.id, stage, task, false, identity);
      return;
    }

    this.pendingTaskUncheck.set(null);
    this.pendingStageReopen.set(null);
    await this.persistTask(journey.employee.id, stage, task, true, identity);
  }

  protected isTaskUncheckPending(employeeId: string, stageKey: string, taskKey: string): boolean {
    return this.pendingTaskUncheck() === this.taskIdentity(employeeId, stageKey, taskKey);
  }

  protected isTaskSaving(employeeId: string, stageKey: string, taskKey: string): boolean {
    return this.savingTask() === this.taskIdentity(employeeId, stageKey, taskKey);
  }

  protected async reopenStage(journey: ApiEmployeeJourney, stage: ApiJourneyStage): Promise<void> {
    const identity = this.stageIdentity(journey.employee.id, stage.key);
    if (this.savingTask() || this.savingStage()) return;
    if (this.pendingStageReopen() !== identity) {
      this.pendingStageReopen.set(identity);
      this.pendingTaskUncheck.set(null);
      return;
    }

    this.savingStage.set(identity);
    this.actionError.set('');
    try {
      await this.authService.reabrirEtapaJornada(journey.employee.id, stage.key);
      this.journeys.update((items) =>
        items.map((item) =>
          item.employee.id !== journey.employee.id
            ? item
            : {
                ...item,
                stages: item.stages.map((currentStage) =>
                  currentStage.key !== stage.key
                    ? currentStage
                    : {
                        ...currentStage,
                        tasks: currentStage.tasks.map((task) => ({ ...task, concluida: false, concluida_em: null })),
                      },
                ),
              },
        ),
      );
      this.pendingStageReopen.set(null);
    } catch (error: unknown) {
      this.actionError.set(error instanceof Error ? error.message : 'Não foi possível reabrir a etapa.');
    } finally {
      this.savingStage.set(null);
    }
  }

  protected formatDate(value: string): string {
    const date = this.parseDate(value);
    return date ? date.toLocaleDateString('pt-BR') : 'Não informada';
  }

  protected formatTimestamp(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  protected initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase();
  }

  private async persistTask(
    employeeId: string,
    stage: ApiJourneyStage,
    task: ApiJourneyTask,
    concluida: boolean,
    identity: string,
  ): Promise<void> {
    this.savingTask.set(identity);
    this.actionError.set('');
    try {
      const completedAt = await this.authService.atualizarTarefaJornada(
        employeeId,
        stage.key,
        task.key,
        concluida,
      );
      this.journeys.update((journeys) =>
        journeys.map((journey) =>
          journey.employee.id !== employeeId
            ? journey
            : {
                ...journey,
                stages: journey.stages.map((currentStage) =>
                  currentStage.key !== stage.key
                    ? currentStage
                    : {
                        ...currentStage,
                        tasks: currentStage.tasks.map((currentTask) =>
                          currentTask.key !== task.key
                            ? currentTask
                            : {
                                ...currentTask,
                                concluida,
                                concluida_em: completedAt,
                              },
                        ),
                      },
                ),
              },
        ),
      );
      this.pendingTaskUncheck.set(null);
    } catch (error: unknown) {
      this.actionError.set(error instanceof Error ? error.message : 'Não foi possível salvar a marcação.');
    } finally {
      this.savingTask.set(null);
    }
  }

  private expandCurrentStage(journey: ApiEmployeeJourney): void {
    const activeStage = journey.stages.find((stage) => !this.isStageCompleted(stage));
    this.expandedStages.set(
      activeStage ? new Set([this.stageIdentity(journey.employee.id, activeStage.key)]) : new Set(),
    );
  }

  private taskIdentity(employeeId: string, stageKey: string, taskKey: string): string {
    return `${employeeId}:${stageKey}:${taskKey}`;
  }

  private stageIdentity(employeeId: string, stageKey: string): string {
    return `${employeeId}:${stageKey}`;
  }

  private parseDate(value: string): Date | null {
    const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDate) {
      const [, year, month, day] = isoDate.map(Number);
      const date = new Date(year, month - 1, day);
      return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
        ? date
        : null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
