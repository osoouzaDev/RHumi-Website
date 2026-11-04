import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Employees } from './employees';
import { AuthService } from '../services/auth.service';

describe('Employees', () => {
  const users = [
    {
      id: 'user-1',
      login: 'ana@example.com',
      nome: 'Ana Silva',
      email: 'ana@example.com',
      classificacao: 'HR_ADMIN',
      ativo: true,
      data_criacao: '2026-03-09T12:00:00.000Z',
      data_atualizacao: '2026-03-09T12:00:00.000Z',
    },
    {
      id: 'user-2',
      login: 'joao@example.com',
      nome: 'João Souza',
      email: 'joao@example.com',
      classificacao: 'EMPLOYEE',
      ativo: true,
      data_criacao: '2026-01-01T12:00:00.000Z',
      data_atualizacao: '2026-01-01T12:00:00.000Z',
    },
  ];
  const mockAuthService = {
    listarUsuariosAtivos: vi.fn(),
    listarSetores: vi.fn(),
    criarUsuario: vi.fn(),
    atualizarUsuario: vi.fn(),
    redefinirSenhaUsuario: vi.fn(),
    currentUser: vi.fn().mockReturnValue({ classificacao: 'HR_ADMIN' }),
    logout: vi.fn(),
  };
  const mockRouter = {
    navigateByUrl: vi.fn(),
  };
  beforeEach(async () => {
    mockAuthService.listarUsuariosAtivos.mockResolvedValue(users);
    mockAuthService.listarSetores.mockResolvedValue([
      'Tecnologia',
      'Contábil',
      'Fiscal',
      'Departamento Pessoal',
      'Legalização',
      'Marketing',
      'Comercial',
      'Financeiro',
      'Sucesso do Cliente',
    ]);
    mockAuthService.currentUser.mockReturnValue({ id: 'admin-1', classificacao: 'HR_ADMIN' });
    mockAuthService.atualizarUsuario.mockImplementation(async (id, data) => ({
      ...(users.find((user) => user.id === id) ?? users[0]),
      ...data,
      id,
      data_atualizacao: '2026-03-10T12:00:00.000Z',
    }));
    mockAuthService.criarUsuario.mockResolvedValue({
      ...users[0],
      id: 'user-created',
      nome: 'Marina Nova',
      email: 'marina@example.com',
      login: 'marina@example.com',
      codigo_colaborador: '0042',
    });
    mockAuthService.logout.mockResolvedValue(undefined);
    mockAuthService.redefinirSenhaUsuario.mockResolvedValue(undefined);
    mockRouter.navigateByUrl.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [Employees],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    })
      .compileComponents();
  });

  it('should create a new employee through the API and display their collaborator code', async () => {
    const fixture = TestBed.createComponent(Employees);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component['openCreateDialog']();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button[aria-label="Navegação do sistema"]')).toBeNull();

    component['createForm'].update((form) => ({
      ...form,
      nome: 'Marina Nova',
      email: 'marina@example.com',
      senha: 'secure-password',
      setor: 'Tecnologia',
      cargo: 'Analista',
    }));
    await component['createEmployee'](new Event('submit') as SubmitEvent);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(mockAuthService.criarUsuario).toHaveBeenCalledWith(expect.objectContaining({
      login: 'marina@example.com',
      nome: 'Marina Nova',
      email: 'marina@example.com',
      senha: 'secure-password',
      classificacao: 'EMPLOYEE',
      setor: 'Tecnologia',
      cargo: 'Analista',
    }));
    expect(component['createdCollaboratorCode']()).toBe('0042');
    expect(fixture.nativeElement.textContent).toContain('0042');
    expect(fixture.nativeElement.textContent).toContain('Ver informações e configurar acesso');
    expect(mockAuthService.listarUsuariosAtivos).toHaveBeenCalledTimes(2);
  });

  it('should open a newly created employee on the access tab and save access credentials', async () => {
    const fixture = TestBed.createComponent(Employees);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component['openCreateDialog']();
    component['createForm'].update((form) => ({
      ...form,
      nome: 'Marina Nova',
      email: 'marina@example.com',
      senha: 'secure-password',
    }));
    await component['createEmployee'](new Event('submit') as SubmitEvent);
    await fixture.whenStable();

    component['openCreatedEmployee']();
    fixture.detectChanges();
    expect(component['selectedEmployee']()?.id).toBe('user-created');
    expect(component['activeEmployeeTab']()).toBe('acesso');
    expect(fixture.nativeElement.querySelector('[aria-label="Acesso à plataforma"]')).not.toBeNull();

    component['accessEmail'].set('marina.nova@example.com');
    await component['saveAccessEmail'](new Event('submit') as SubmitEvent);
    expect(mockAuthService.atualizarUsuario).toHaveBeenCalledWith('user-created', {
      email: 'marina.nova@example.com',
    });
    expect(component['selectedEmployee']()?.email).toBe('marina.nova@example.com');

    component['newAccessPassword'].set('another-secure-password');
    await component['saveAccessPassword'](new Event('submit') as SubmitEvent);
    expect(mockAuthService.redefinirSenhaUsuario).toHaveBeenCalledWith(
      'user-created',
      'another-secure-password'
    );
    expect(component['newAccessPassword']()).toBe('');
  });

  it('should load and render users returned by the API', async () => {
    const fixture = TestBed.createComponent(Employees);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(mockAuthService.listarUsuariosAtivos).toHaveBeenCalledOnce();
    expect(compiled.querySelectorAll('section[aria-label="Lista de funcionários"] article').length).toBe(2);
    expect(compiled.textContent).toContain('Ana Silva');
    expect(compiled.textContent).toContain('João Souza');
  });

  it('should show the summary counters', async () => {
    const fixture = TestBed.createComponent(Employees);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Mostrando 2 de 2 usuários');
    expect(compiled.textContent).toContain('Administradores');
  });

  it('should open the visual system navigation from the gradient circle', async () => {
    const fixture = TestBed.createComponent(Employees);
    await fixture.whenStable();
    const circle = fixture.nativeElement.querySelector(
      'button[aria-label="Navegação do sistema"]'
    ) as HTMLButtonElement;

    expect(circle.getAttribute('aria-expanded')).toBe('false');
    expect(circle.className).toContain('animate-circle-gradient');
    expect(circle.className).toContain('size-[60px]');
    expect(circle.querySelector('[data-page="employees"]')).toBeTruthy();
    circle.click();
    await fixture.whenStable();

    const navigation = fixture.nativeElement.querySelector('nav[aria-label="Navegação principal"]') as HTMLElement;
    expect(circle.getAttribute('aria-expanded')).toBe('true');
    expect(navigation.textContent).toContain('Dashboard');
    expect(navigation.textContent).toContain('Funcionários');
    expect(navigation.textContent).toContain('Empresa');
    expect(navigation.textContent).toContain('Jornada');
    expect(navigation.textContent).toContain('Calendário');
    expect(navigation.textContent).toContain('Recrutamento');
    expect(navigation.textContent).toContain('Área do colaborador');
    expect(navigation.textContent).toContain('Configurações');
    expect(navigation.textContent).toContain('Sair da conta');

    circle.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('nav[aria-label="Navegação principal"]')).toBeNull();
  });

  it('should sign out from the navigation panel', async () => {
    const fixture = TestBed.createComponent(Employees);
    await fixture.whenStable();
    const circle = fixture.nativeElement.querySelector(
      'button[aria-label="Navegação do sistema"]'
    ) as HTMLButtonElement;
    circle.click();
    await fixture.whenStable();
    const signOutButton = [...fixture.nativeElement.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Sair da conta')) as HTMLButtonElement;

    signOutButton.click();
    await fixture.whenStable();

    expect(mockAuthService.logout).toHaveBeenCalledOnce();
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should filter users by name and access profile', async () => {
    const fixture = TestBed.createComponent(Employees);
    await fixture.whenStable();
    const component = fixture.componentInstance;

    component['searchTerm'].set('ana');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('section[aria-label="Lista de funcionários"] article').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Ana Silva');
    expect(fixture.nativeElement.textContent).not.toContain('João Souza');

    component['searchTerm'].set('');
    component['accessFilter'].set('Colaborador');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('section[aria-label="Lista de funcionários"] article').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('João Souza');
    expect(fixture.nativeElement.textContent).not.toContain('Ana Silva');
  });

  it('should open employee details and switch between the requested sections', async () => {
    const fixture = TestBed.createComponent(Employees);
    await fixture.whenStable();
    const openButton = fixture.nativeElement.querySelector(
      '[aria-label="Abrir informações de Ana Silva"]'
    ) as HTMLButtonElement;

    openButton.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')?.textContent).toContain('Treinamentos');
    expect(fixture.nativeElement.querySelector('button[aria-label="Navegação do sistema"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Nenhum treinamento registrado');
    expect(fixture.nativeElement.textContent).not.toContain('Feedbacks');

    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]') as NodeListOf<HTMLButtonElement>;
    const taskTab = [...tabs].find((tab) => tab.textContent?.includes('Tarefas'))!;
    taskTab.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma tarefa registrada');

    const accessTab = [...tabs].find((tab) => tab.textContent?.includes('Acesso'))!;
    accessTab.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Acesso à plataforma');
  });

  it('should keep the admission date from the API visible in the edit form', async () => {
    const fixture = TestBed.createComponent(Employees);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const employee = {
      ...component['employees']()[0],
      data_admissao: '2021-06-17T00:00:00.000Z',
    };
    component['openEmployee'](employee);
    component['startEditing']();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('input[type="date"]') as HTMLInputElement).value)
      .toBe('2021-06-17');
    expect(component['formatDate']('2021-06-17T00:00:00.000Z')).toBe('17/06/2021');
  });

  it('should save edits to the employee profile and refresh the displayed information', async () => {
    const fixture = TestBed.createComponent(Employees);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component['openEmployee'](component['employees']()[0]);
    component['startEditing']();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement.querySelector('select[required]') as HTMLSelectElement).value
    ).toBe('HR_ADMIN');
    const sectorOptions = [...(fixture.nativeElement.querySelector('[aria-label="Setor"]') as HTMLSelectElement).options]
      .map((option) => option.value)
      .filter(Boolean);
    expect(sectorOptions).toEqual([
      'Tecnologia',
      'Contábil',
      'Fiscal',
      'Departamento Pessoal',
      'Legalização',
      'Marketing',
      'Comercial',
      'Financeiro',
      'Sucesso do Cliente',
    ]);
    component['editForm'].update((form) => ({
      ...form,
      nome: 'Ana Silva Costa',
      setor: 'Tecnologia',
      cargo: 'Analista',
      telefone: '11999999999',
    }));

    await component['saveEmployee'](new Event('submit') as SubmitEvent);

    expect(mockAuthService.atualizarUsuario).toHaveBeenCalledWith('user-1', expect.objectContaining({
      nome: 'Ana Silva Costa',
      setor: 'Tecnologia',
      cargo: 'Analista',
      telefone: '11999999999',
    }));
    expect(component['selectedEmployee']()?.name).toBe('Ana Silva Costa');
    expect(component['editingEmployee']()).toBe(false);
  });

  it('should allow editing own profile while omitting role and status changes', async () => {
    mockAuthService.currentUser.mockReturnValue({ id: 'user-1', classificacao: 'EMPLOYEE' });
    const fixture = TestBed.createComponent(Employees);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component['openEmployee'](component['employees']()[0]);
    component['startEditing']();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('[aria-label="Funcionário ativo"]') as HTMLInputElement).disabled)
      .toBe(true);
    expect((fixture.nativeElement.querySelector('select[required]') as HTMLSelectElement).disabled)
      .toBe(true);

    component['editForm'].update((form) => ({
      ...form,
      nome: 'Ana Silva Costa',
      ativo: false,
      classificacao: 'sakai',
    }));
    await component['saveEmployee'](new Event('submit') as SubmitEvent);

    expect(mockAuthService.atualizarUsuario).toHaveBeenCalledWith('user-1', expect.objectContaining({
      nome: 'Ana Silva Costa',
    }));
    const sentData = mockAuthService.atualizarUsuario.mock.calls.at(-1)?.[1];
    expect(sentData).not.toHaveProperty('classificacao');
    expect(sentData).not.toHaveProperty('ativo');
    expect(component['selectedEmployee']()?.nome).toBe('Ana Silva Costa');
  });

  it('should show API errors and allow retrying the request', async () => {
    mockAuthService.listarUsuariosAtivos
      .mockRejectedValueOnce(new Error('API indisponível.'))
      .mockResolvedValueOnce(users);

    const fixture = TestBed.createComponent(Employees);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('API indisponível.');

    const retryButton = fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement;
    retryButton.click();
    await fixture.whenStable();

    expect(mockAuthService.listarUsuariosAtivos).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Ana Silva');
  });
});
