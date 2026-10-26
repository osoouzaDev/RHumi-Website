import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiUser, AuthService, CreateApiUser, UpdateApiUser } from '../services/auth.service';

type EmployeeTab = 'treinamentos' | 'tarefas' | 'avaliacao' | 'acesso';
type ContractType = NonNullable<ApiUser['tipo_contrato']>;

interface Employee extends ApiUser {
  initials: string;
  name: string;
  access: string;
  since: string;
}

interface EmployeeForm {
  nome: string;
  email: string;
  classificacao: string;
  ativo: boolean;
  telefone: string;
  setor: string;
  cargo: string;
  tipo_contrato: ContractType | '';
  data_admissao: string;
  descricao_cargo: string;
}

interface CreateEmployeeForm extends EmployeeForm {
  senha: string;
}

@Component({
  selector: 'app-employees',
  templateUrl: './employees.html',
})
export class Employees implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly router = inject(Router);
  protected readonly employees = signal<Employee[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly searchTerm = signal('');
  protected readonly accessFilter = signal('Todos os perfis');
  protected readonly selectedEmployee = signal<Employee | null>(null);
  protected readonly canManageEmployees = computed(() => {
    const classification = this.authService.currentUser()?.classificacao.trim().toLowerCase();
    return ['sakai', 'admin', 'hr_admin', 'supervisor'].includes(classification ?? '');
  });
  protected readonly isEditingSelf = computed(() => {
    const selected = this.selectedEmployee();
    return selected !== null && selected.id === this.authService.currentUser()?.id;
  });
  protected readonly activeEmployeeTab = signal<EmployeeTab>('treinamentos');
  protected readonly editingEmployee = signal(false);
  protected readonly savingEmployee = signal(false);
  protected readonly editError = signal('');
  protected readonly creatingEmployee = signal(false);
  protected readonly savingNewEmployee = signal(false);
  protected readonly createError = signal('');
  protected readonly createForm = signal<CreateEmployeeForm>(this.emptyCreateEmployeeForm());
  protected readonly createdCollaboratorCode = signal('');
  protected readonly createdEmployee = signal<Employee | null>(null);
  protected readonly accessEmail = signal('');
  protected readonly newAccessPassword = signal('');
  protected readonly savingAccessEmail = signal(false);
  protected readonly savingAccessPassword = signal(false);
  protected readonly accessError = signal('');
  protected readonly accessSuccess = signal('');
  protected readonly navigationOpen = signal(false);
  protected readonly navigationItems = [
    { label: 'Dashboard', icon: 'dashboard' },
    { label: 'Funcionários', icon: 'employees' },
    { label: 'Empresa', icon: 'company' },
    { label: 'Jornada', icon: 'journey' },
    { label: 'Calendário', icon: 'calendar' },
    { label: 'Recrutamento', icon: 'recruitment' },
    { label: 'Área do colaborador', icon: 'employee-area' },
    { label: 'Configurações', icon: 'settings' },
  ];
  protected readonly sectors = signal<string[]>([]);
  protected readonly loadingSectors = signal(false);
  protected readonly sectorError = signal('');
  protected readonly editForm = signal<EmployeeForm>(this.emptyEmployeeForm());
  protected readonly accessOptions = computed(() => [
    'Todos os perfis',
    ...new Set(this.employees().map((employee) => employee.access)),
  ]);
  protected readonly filteredEmployees = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase('pt-BR');
    const access = this.accessFilter();

    return this.employees().filter((employee) => {
      const matchesQuery =
        !query ||
        employee.name.toLocaleLowerCase('pt-BR').includes(query) ||
        employee.email.toLocaleLowerCase('pt-BR').includes(query);
      const matchesAccess = access === 'Todos os perfis' || employee.access === access;

      return matchesQuery && matchesAccess;
    });
  });
  protected readonly collaboratorsCount = computed(() => this.employees().length);
  protected readonly administratorsCount = computed(
    () => this.employees().filter((employee) => ['Admin', 'Admin RH', 'Sakai'].includes(employee.access)).length
  );
  protected readonly employeeCount = computed(
    () => this.employees().filter((employee) => employee.access === 'Colaborador').length
  );
  protected readonly classifications = [
    { value: 'sakai', label: 'Sakai' },
    { value: 'admin', label: 'Admin' },
    { value: 'gestor', label: 'Gestor' },
    { value: 'usuario', label: 'Usuário' },
    { value: 'HR_ADMIN', label: 'Admin RH' },
    { value: 'SUPERVISOR', label: 'Supervisor' },
    { value: 'EMPLOYEE', label: 'Colaborador' },
    { value: 'CANDIDATE', label: 'Candidato' },
  ];
  protected readonly contractTypes: { value: ContractType; label: string }[] = [
    { value: 'CLT', label: 'CLT' },
    { value: 'PJ', label: 'PJ' },
    { value: 'TEMPORARIO', label: 'Temporário' },
    { value: 'ESTAGIARIO', label: 'Estágio' },
  ];

  ngOnInit(): void {
    void this.loadEmployees();
  }

  protected async loadEmployees(): Promise<void> {
    this.loading.set(true);
    this.error.set('');

    try {
      const users = await this.authService.listarUsuariosAtivos();
      this.employees.set(users.map((user) => this.toEmployee(user)));
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível carregar os funcionários.');
    } finally {
      this.loading.set(false);
    }
  }

  protected openEmployee(employee: Employee): void {
    this.navigationOpen.set(false);
    this.selectedEmployee.set(employee);
    this.activeEmployeeTab.set('treinamentos');
    this.editingEmployee.set(false);
    this.initializeAccessForm(employee);
  }

  protected closeEmployee(): void {
    this.selectedEmployee.set(null);
    this.editingEmployee.set(false);
    this.editError.set('');
  }

  protected setEmployeeTab(tab: EmployeeTab): void {
    this.activeEmployeeTab.set(tab);
    if (tab === 'acesso') {
      const employee = this.selectedEmployee();
      if (employee) this.initializeAccessForm(employee);
    }
  }

  protected toggleNavigation(): void {
    this.navigationOpen.update((open) => !open);
  }

  protected openCreateDialog(): void {
    this.navigationOpen.set(false);
    this.createForm.set(this.emptyCreateEmployeeForm());
    this.createError.set('');
    this.createdCollaboratorCode.set('');
    this.createdEmployee.set(null);
    this.creatingEmployee.set(true);
    void this.loadSectors();
  }

  protected closeCreateDialog(): void {
    this.creatingEmployee.set(false);
    this.createError.set('');
  }

  protected setCreateField<K extends keyof CreateEmployeeForm>(
    field: K,
    value: CreateEmployeeForm[K]
  ): void {
    this.createForm.update((form) => ({ ...form, [field]: value }));
  }

  protected startEditing(): void {
    const employee = this.selectedEmployee();
    if (!employee) return;

    this.editForm.set({
      nome: employee.nome,
      email: employee.email,
      classificacao: employee.classificacao,
      ativo: employee.ativo,
      telefone: employee.telefone ?? '',
      setor: employee.setor ?? '',
      cargo: employee.cargo ?? '',
      tipo_contrato: employee.tipo_contrato ?? '',
      data_admissao: this.toDateInputValue(employee.data_admissao),
      descricao_cargo: employee.descricao_cargo ?? '',
    });
    this.editError.set('');
    this.sectorError.set('');
    this.editingEmployee.set(true);
    void this.loadSectors();
  }

  protected cancelEditing(): void {
    this.editingEmployee.set(false);
    this.editError.set('');
  }

  protected setEditField<K extends keyof EmployeeForm>(field: K, value: EmployeeForm[K]): void {
    this.editForm.update((form) => ({ ...form, [field]: value }));
  }

  protected async loadSectors(): Promise<void> {
    this.loadingSectors.set(true);
    this.sectorError.set('');
    try {
      this.sectors.set(await this.authService.listarSetores());
    } catch (error: unknown) {
      this.sectorError.set(error instanceof Error ? error.message : 'Não foi possível carregar os setores.');
    } finally {
      this.loadingSectors.set(false);
    }
  }

  protected async saveEmployee(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const employee = this.selectedEmployee();
    if (!employee) return;

    this.savingEmployee.set(true);
    this.editError.set('');
    const form = this.editForm();
    if (this.loadingSectors() || this.sectorError()) {
      this.savingEmployee.set(false);
      this.editError.set(this.sectorError() || 'Aguarde o carregamento dos setores para salvar.');
      return;
    }
    const data: UpdateApiUser = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      telefone: form.telefone.trim() || null,
      setor: form.setor.trim() || null,
      cargo: form.cargo.trim() || null,
      tipo_contrato: form.tipo_contrato || null,
      data_admissao: form.data_admissao || null,
      descricao_cargo: form.descricao_cargo.trim() || null,
    };
    if (!this.isEditingSelf()) {
      data.classificacao = form.classificacao;
      data.ativo = form.ativo;
    }

    try {
      const updated = this.toEmployee(await this.authService.atualizarUsuario(employee.id, data));
      this.employees.update((items) => items
        .filter((item) => item.id !== updated.id || updated.ativo)
        .map((item) => item.id === updated.id ? updated : item));
      this.selectedEmployee.set(updated);
      this.editingEmployee.set(false);
    } catch (error: unknown) {
      this.editError.set(error instanceof Error ? error.message : 'Não foi possível atualizar o funcionário.');
    } finally {
      this.savingEmployee.set(false);
    }
  }

  protected async createEmployee(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const form = this.createForm();
    if (form.setor && (this.loadingSectors() || this.sectorError())) {
      this.createError.set(this.sectorError() || 'Aguarde o carregamento dos setores para continuar.');
      return;
    }

    const email = form.email.trim();
    const data: CreateApiUser = {
      login: email,
      nome: form.nome.trim(),
      email,
      senha: form.senha,
      classificacao: form.classificacao,
      ativo: form.ativo,
      telefone: form.telefone.trim() || null,
      setor: form.setor.trim() || null,
      cargo: form.cargo.trim() || null,
      tipo_contrato: form.tipo_contrato || null,
      data_admissao: form.data_admissao || null,
      descricao_cargo: form.descricao_cargo.trim() || null,
    };

    this.savingNewEmployee.set(true);
    this.createError.set('');
    try {
      const created = await this.authService.criarUsuario(data);
      this.createdCollaboratorCode.set(created.codigo_colaborador);
      this.createdEmployee.set(this.toEmployee(created));
      this.creatingEmployee.set(false);
      await this.loadEmployees();
    } catch (error: unknown) {
      this.createError.set(error instanceof Error ? error.message : 'Não foi possível criar o funcionário.');
    } finally {
      this.savingNewEmployee.set(false);
    }
  }

  protected openCreatedEmployee(): void {
    const employee = this.createdEmployee();
    if (!employee) return;

    this.openEmployee(employee);
    this.setEmployeeTab('acesso');
  }

  protected async saveAccessEmail(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const employee = this.selectedEmployee();
    if (!employee) return;

    this.savingAccessEmail.set(true);
    this.accessError.set('');
    this.accessSuccess.set('');
    try {
      const updated = this.toEmployee(await this.authService.atualizarUsuario(employee.id, {
        email: this.accessEmail().trim(),
      }));
      this.employees.update((items) => items.map((item) => item.id === updated.id ? updated : item));
      this.selectedEmployee.set(updated);
      this.accessEmail.set(updated.email);
      this.accessSuccess.set('E-mail de acesso atualizado.');
    } catch (error: unknown) {
      this.accessError.set(error instanceof Error ? error.message : 'Não foi possível atualizar o e-mail de acesso.');
    } finally {
      this.savingAccessEmail.set(false);
    }
  }

  protected async saveAccessPassword(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const employee = this.selectedEmployee();
    const password = this.newAccessPassword();
    if (!employee) return;

    this.savingAccessPassword.set(true);
    this.accessError.set('');
    this.accessSuccess.set('');
    try {
      await this.authService.redefinirSenhaUsuario(employee.id, password);
      this.newAccessPassword.set('');
      this.accessSuccess.set('Senha de acesso redefinida com sucesso.');
    } catch (error: unknown) {
      this.accessError.set(error instanceof Error ? error.message : 'Não foi possível redefinir a senha de acesso.');
    } finally {
      this.savingAccessPassword.set(false);
    }
  }

  protected async logout(): Promise<void> {
    try {
      await this.authService.logout();
      await this.router.navigate(['/']);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível encerrar a sessão na API.');
    }
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return 'Não informado';
    const dateValue = this.toDateInputValue(value);
    if (!dateValue) return 'Não informado';
    const [year, month, day] = dateValue.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
  }

  private toDateInputValue(value: string | null | undefined): string {
    if (!value) return '';
    const isoDate = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDate) return isoDate[1];

    const localizedDate = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (localizedDate) return `${localizedDate[3]}-${localizedDate[2]}-${localizedDate[1]}`;

    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString().slice(0, 10);
  }

  protected contractLabel(value: string | null | undefined): string {
    return this.contractTypes.find((type) => type.value === value)?.label ?? 'Não informado';
  }

  private toEmployee(user: ApiUser): Employee {
    const name = user.nome || user.login || user.email;
    const nameParts = name.trim().split(/\s+/);
    const initials = nameParts
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();

    return {
      ...user,
      initials,
      name,
      access: this.formatClassification(user.classificacao),
      since: this.formatDate(user.data_criacao),
    };
  }

  private formatClassification(classification: string): string {
    const labels: Record<string, string> = {
      sakai: 'Sakai',
      admin: 'Admin',
      gestor: 'Gestor',
      usuario: 'Usuário',
      HR_ADMIN: 'Admin RH',
      SUPERVISOR: 'Supervisor',
      EMPLOYEE: 'Colaborador',
      CANDIDATE: 'Candidato',
    };

    return labels[classification] || classification;
  }

  private emptyEmployeeForm(): EmployeeForm {
    return {
      nome: '',
      email: '',
      classificacao: 'EMPLOYEE',
      ativo: true,
      telefone: '',
      setor: '',
      cargo: '',
      tipo_contrato: '',
      data_admissao: '',
      descricao_cargo: '',
    };
  }

  private emptyCreateEmployeeForm(): CreateEmployeeForm {
    return {
      ...this.emptyEmployeeForm(),
      nome: '',
      email: '',
      classificacao: 'EMPLOYEE',
      ativo: true,
      senha: '',
    };
  }

  private initializeAccessForm(employee: Employee): void {
    this.accessEmail.set(employee.email);
    this.newAccessPassword.set('');
    this.accessError.set('');
    this.accessSuccess.set('');
  }
}
