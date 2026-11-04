import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ApiUser, AuthService } from '../services/auth.service';
import { SystemNavigation } from '../shared/system-navigation';

interface SectorMetric {
  name: string;
  count: number;
  percentage: number;
}

type DashboardTab = 'overview' | 'performance';

@Component({
  selector: 'app-dashboard',
  imports: [SystemNavigation],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly employees = signal<ApiUser[]>([]);
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
  protected readonly orderedEmployees = computed(() =>
    [...this.employees()].sort((a, b) =>
      (a.nome || a.login).localeCompare(b.nome || b.login, 'pt-BR'),
    ),
  );
  protected readonly selectedEmployee = computed(
    () =>
      this.orderedEmployees().find((employee) => employee.id === this.selectedEmployeeId()) ??
      this.orderedEmployees()[0] ??
      null,
  );
  protected readonly administratorCount = computed(
    () => this.employees().filter((employee) => ['sakai', 'admin', 'hr_admin', 'supervisor'].includes(employee.classificacao.toLowerCase())).length,
  );
  protected readonly unassignedCount = computed(
    () => this.employees().filter((employee) => !employee.setor?.trim()).length,
  );
  protected readonly recentEmployees = computed(() =>
    [...this.employees()]
      .sort((a, b) => b.data_criacao.localeCompare(a.data_criacao))
      .slice(0, 5),
  );

  ngOnInit(): void {
    void this.loadDashboard();
  }

  protected async loadDashboard(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.employees.set(await this.authService.listarUsuariosAtivos());
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

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Data não informada' : date.toLocaleDateString('pt-BR');
  }

  protected initials(name: string): string {
    return name.trim().split(/\\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
  }
}
