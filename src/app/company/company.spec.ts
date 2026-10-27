import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService, CompanyData } from '../services/auth.service';
import { Company } from './company';

describe('Company', () => {
  const companyData: CompanyData = {
    id: 'company-1',
    nome_empresa: 'RHumi Ltda.',
    cnpj: '12.345.678/0001-90',
    rua: 'Rua Central',
    numero_end: '100',
    bairro: 'Centro',
    cep: '01000-000',
    cidade: 'São Paulo',
    estado: 'SP',
    telefone: '(11) 99999-9999',
    email: 'contato@rhumi.com',
    fundacao: '2020-01-15',
    sobre_empresa: 'Sobre a empresa',
    nome_pagina_carreiras: 'Trabalhe conosco',
    homepage_carreiras: 'https://rhumi.example',
    chamada_carreiras: 'Faça parte do time',
    descricao_carreiras: 'Conheça nossas oportunidades.',
    missao: 'Nossa missão',
    visao: 'Nossa visão',
    valores: 'Transparência, Ética',
    created_at: '2020-01-15T12:00:00.000Z',
    updated_at: '2026-10-27T12:00:00.000Z',
    total_colaboradores: 2,
    setores: [
      { id: 'sector-1', nome_setor: 'Tecnologia', icone: null, quantidade: 2 },
    ],
    classificacoes: ['EMPLOYEE', 'HR_ADMIN'],
  };
  const mockAuthService = {
    buscarEmpresa: vi.fn(),
    atualizarEmpresa: vi.fn(),
    listarUsuariosAtivos: vi.fn().mockResolvedValue([]),
    criarSetorEmpresa: vi.fn(),
    removerSetorEmpresa: vi.fn(),
    currentUser: vi.fn().mockReturnValue({ classificacao: 'admin' }),
    logout: vi.fn(),
  };
  const mockRouter = { navigate: vi.fn(), navigateByUrl: vi.fn() };

  beforeEach(async () => {
    mockAuthService.buscarEmpresa.mockClear();
    mockAuthService.atualizarEmpresa.mockClear();
    mockAuthService.buscarEmpresa.mockResolvedValue({ ...companyData });
    mockAuthService.atualizarEmpresa.mockImplementation(async (data) => ({
      ...companyData,
      ...data,
      updated_at: '2026-10-27T13:00:00.000Z',
    }));

    await TestBed.configureTestingModule({
      imports: [Company],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();
  });

  it('loads the company fields from the API', async () => {
    const fixture = TestBed.createComponent(Company);
    await fixture.whenStable();

    expect(mockAuthService.buscarEmpresa).toHaveBeenCalledOnce();
    expect((fixture.nativeElement.querySelector('[name="nome_empresa"]') as HTMLInputElement).value).toBe('RHumi Ltda.');
    expect(fixture.nativeElement.textContent).toContain('Centro, São Paulo - SP');
    expect(fixture.nativeElement.textContent).toContain('ID: company-1');
    expect(fixture.nativeElement.textContent).toContain('Sobre a Empresa');
    fixture.componentInstance['startEditing']();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance['company']()?.cidade).toBe('São Paulo');
    expect(fixture.nativeElement.querySelector('[name="cidade"]')).toBeTruthy();
  });

  it('sends all editable company fields to the API when saving', async () => {
    const fixture = TestBed.createComponent(Company);
    await fixture.whenStable();
    fixture.componentInstance['company']()!.nome_empresa = 'RHumi Tecnologia Ltda.';
    await fixture.componentInstance['saveCompany']();
    fixture.detectChanges();

    expect(mockAuthService.atualizarEmpresa).toHaveBeenCalledWith({
      nome_empresa: 'RHumi Tecnologia Ltda.',
      cnpj: '12.345.678/0001-90',
      rua: 'Rua Central',
      numero_end: '100',
      bairro: 'Centro',
      cep: '01000-000',
      cidade: 'São Paulo',
      estado: 'SP',
      telefone: '(11) 99999-9999',
      email: 'contato@rhumi.com',
      fundacao: '2020-01-15',
      sobre_empresa: 'Sobre a empresa',
      nome_pagina_carreiras: 'Trabalhe conosco',
      homepage_carreiras: 'https://rhumi.example',
      chamada_carreiras: 'Faça parte do time',
      descricao_carreiras: 'Conheça nossas oportunidades.',
      missao: 'Nossa missão',
      visao: 'Nossa visão',
      valores: 'Transparência, Ética',
    });
    expect(fixture.nativeElement.textContent).toContain('Dados da empresa salvos no banco de dados.');
  });

  it('shows an explicit load error and retry option', async () => {
    mockAuthService.buscarEmpresa.mockRejectedValueOnce(new Error('Empresa não encontrada.'));
    const fixture = TestBed.createComponent(Company);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Empresa não encontrada.');
    const retryButton = [...fixture.nativeElement.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Tentar novamente'));
    expect(retryButton).toBeTruthy();
  });
});
