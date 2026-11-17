import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ApiUser, AuthService } from '../services/auth.service';
import { LearningEmployeePerformance, LearningPerformanceResult, LearningService } from '../services/learning.service';
import { SystemNavigation } from '../shared/system-navigation';

interface SectorMetric {
  name: string;
  count: number;
  percentage: number;
}

interface EmployeePerformanceResult extends LearningPerformanceResult {
  colaborador: string;
}

type DashboardTab = 'overview' | 'performance';

@Component({
  selector: 'app-dashboard',
  imports: [SystemNavigation],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly learningService = inject(LearningService);
  protected readonly employees = signal<ApiUser[]>([]);
  protected readonly performance = signal<LearningEmployeePerformance[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly activeTab = signal<DashboardTab>('overview');
  protected readonly selectedEmployeeId = signal<string | null>(null);
  protected readonly sectorMetrics = computed<SectorMetric[]>(() => {
    const employees = this.employees();
    const counts = new Map<string, number>();
    employees.forEach((employee) => {
      const sector = employee.setor?.trim() || 'Sem setor';
      counts.set(sector, (counts.get(sector) ?? 0) + 1);
    });

    return [...counts.entries()]
      .map(([name, count]) => ({
        name,
        count,
        percentage: employees.length ? Math.round((count / employees.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));
  });
  protected readonly classificationMetrics = computed<SectorMetric[]>(() => {
    const employees = this.employees();
    const counts = new Map<string, number>();
    employees.forEach((employee) => {
      const classification = employee.classificacao.trim() || 'Sem classificação';
      counts.set(classification, (counts.get(classification) ?? 0) + 1);
    });

    return [...counts.entries()]
      .map(([name, count]) => ({
        name,
        count,
        percentage: employees.length ? Math.round((count / employees.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));
  });
  protected readonly orderedPerformance = computed(() =>
    [...this.performance()].sort((a, b) =>
      (b.media_percentual ?? -1) - (a.media_percentual ?? -1) ||
      a.nome.localeCompare(b.nome, 'pt-BR'),
    ),
  );
  protected readonly selectedPerformance = computed(
    () =>
      this.orderedPerformance().find((employee) => employee.id_usuario === this.selectedEmployeeId()) ??
      this.orderedPerformance()[0] ??
      null,
  );
  protected readonly performanceResults = computed<EmployeePerformanceResult[]>(() =>
    this.performance()
      .flatMap((employee) =>
        employee.resultados.map((result) => ({ ...result, colaborador: employee.nome })),
      )
      .sort((a, b) => b.entregue_em.localeCompare(a.entregue_em)),
  );
  protected readonly topPerformance = computed(() =>
    this.orderedPerformance().filter((employee) => employee.total_respostas > 0).slice(0, 5),
  );
  protected readonly recentResults = computed(() => this.performanceResults().slice(0, 5));
  protected readonly topPerformerCount = computed(
    () => this.performance().filter((employee) => (employee.media_percentual ?? -1) >= 80).length,
  );
  protected readonly developingCount = computed(
    () => this.performance().filter((employee) =>
      employee.media_percentual !== null &&
      employee.media_percentual >= 60 &&
      employee.media_percentual < 80,
    ).length,
  );
  protected readonly attentionCount = computed(
    () => this.performance().filter((employee) =>
      employee.media_percentual !== null && employee.media_percentual < 60,
    ).length,
  );
  protected readonly overallScore = computed(() => {
    const results = this.performanceResults();
    const totalQuestions = results.reduce((sum, result) => sum + result.total_perguntas, 0);
    if (!totalQuestions) return null;
    const correctAnswers = results.reduce((sum, result) => sum + result.acertos, 0);
    return Math.round((correctAnswers * 100) / totalQuestions);
  });
  protected readonly administratorCount = computed(
    () => this.employees().filter((employee) => ['sakai', 'admin', 'hr_admin', 'supervisor'].includes(employee.classificacao.toLowerCase())).length,
  );
  protected readonly unassignedCount = computed(
    () => this.employees().filter((employee) => !employee.setor?.trim()).length,
  );
  ngOnInit(): void {
    void this.loadDashboard();
  }

  protected async loadDashboard(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [employees, performance] = await Promise.all([
        this.authService.listarUsuariosAtivos(),
        this.learningService.listarDesempenho(),
      ]);
      this.employees.set(employees);
      this.performance.set(performance);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível carregar os dados da dashboard.');
    } finally {
      this.loading.set(false);
    }
  }

  protected setTab(tab: DashboardTab): void {
    this.activeTab.set(tab);
  }

  protected selectEmployee(id: string): void {
    this.selectedEmployeeId.set(id);
  }

  protected resultStatus(result: LearningPerformanceResult): string {
    if (result.aprovado === null) return 'Concluída';
    return result.aprovado ? 'Aprovado' : 'Não aprovado';
  }

  protected trainingResults(employee: LearningEmployeePerformance): LearningPerformanceResult[] {
    return employee.resultados.filter((result) => result.tipo === 'TREINAMENTO');
  }

  protected trainingTitles(employee: LearningEmployeePerformance): string {
    return this.trainingResults(employee).map((result) => result.titulo).join(', ');
  }

  protected assessmentResults(employee: LearningEmployeePerformance): LearningPerformanceResult[] {
    return employee.resultados.filter((result) => result.tipo === 'AVALIACAO');
  }

  protected formatDateTime(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Data não informada'
      : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  protected initials(name: string): string {
    return name.trim().split(/\\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
  }
}
