import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiUser, AuthService } from '../services/auth.service';
import { NavigationOrb } from '../shared/navigation-orb';

interface JourneyStage {
  title: string;
  description: string;
}

@Component({
  selector: 'app-journey',
  imports: [NavigationOrb],
  templateUrl: './journey.html',
})
export class Journey implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly router = inject(Router);
  protected readonly employees = signal<ApiUser[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly navigationOpen = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly selectedEmployeeId = signal<string | null>(null);
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
  protected readonly stages: JourneyStage[] = [
    { title: 'Pré-boarding', description: 'Preparação do colaborador antes do primeiro dia oficial' },
    { title: 'Onboarding Institucional', description: 'Integração à empresa, cultura e regras organizacionais' },
    { title: 'Execução Supervisionada', description: 'Execução de tarefas reais sob supervisão do gestor ou tutor' },
    { title: 'Operação Autônoma', description: 'Colaborador apto a trabalhar de forma independente' },
    { title: 'Desenvolvimento Contínuo', description: 'Fase de crescimento profissional e preparação para novos desafios' },
  ];
  protected readonly averageProgress = 0;
  protected readonly filteredEmployees = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase('pt-BR');
    return this.employees().filter((employee) =>
      [employee.nome, employee.login, employee.cargo ?? '', employee.setor ?? '']
        .some((value) => value.toLocaleLowerCase('pt-BR').includes(term)),
    );
  });
  protected readonly selectedEmployee = computed(
    () => this.employees().find((employee) => employee.id === this.selectedEmployeeId()) ?? this.employees()[0] ?? null,
  );
  protected readonly daysInCompany = computed(() => {
    const admission = this.selectedEmployee()?.data_admissao;
    if (!admission) return null;

    const admissionDate = this.parseDate(admission);
    if (!admissionDate) return null;

    const today = new Date();
    const admissionTime = Date.UTC(
      admissionDate.getFullYear(),
      admissionDate.getMonth(),
      admissionDate.getDate(),
    );
    const todayTime = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

    return Math.max(0, Math.floor((todayTime - admissionTime) / 86_400_000));
  });

  ngOnInit(): void {
    void this.loadJourney();
  }

  protected async loadJourney(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.employees.set(await this.authService.listarUsuariosAtivos());
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

  protected formatDate(value: string): string {
    const date = this.parseDate(value);
    return date ? date.toLocaleDateString('pt-BR') : 'Não informada';
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

  protected initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase();
  }
}
