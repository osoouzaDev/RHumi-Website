import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiUser, AuthService } from '../services/auth.service';

interface SectorMetric {
  name: string;
  count: number;
  percentage: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly router = inject(Router);
  protected readonly employees = signal<ApiUser[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly navigationOpen = signal(false);
  protected readonly navigationItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Funcionários', icon: 'employees', route: '/funcionarios' },
    { label: 'Empresa', icon: 'company', route: '/empresa' },
    { label: 'Jornada', icon: 'journey', route: null },
    { label: 'Calendário', icon: 'calendar', route: null },
    { label: 'Recrutamento', icon: 'recruitment', route: null },
    { label: 'Área do colaborador', icon: 'employee-area', route: null },
    { label: 'Configurações', icon: 'settings', route: null },
  ];
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

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Data não informada' : date.toLocaleDateString('pt-BR');
  }

  protected initials(name: string): string {
    return name.trim().split(/\\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
  }
}
