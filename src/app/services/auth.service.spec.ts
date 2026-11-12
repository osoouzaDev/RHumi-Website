import { TestBed } from '@angular/core/testing';
import { ApiResponse, AuthService } from './auth.service';

function jsonResponse<T>(payload: ApiResponse<T>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('AuthService', () => {
  let authService: AuthService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({});
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('should authenticate against the API and store its verified user session', async () => {
    const token = {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      token_type: 'Bearer',
      expires_in: 1800,
    };
    const user = {
      id: 'user-id',
      userLogin: 'ana@example.com',
      classificacao: 'HR_ADMIN',
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'success', data: token }))
      .mockResolvedValueOnce(jsonResponse({ status: 'success', data: user }));

    await authService.loginComEmail('ana@example.com', 'secure-password');

    const loginRequest = fetchMock.mock.calls[0][1] as RequestInit;
    const profileRequest = fetchMock.mock.calls[1][1] as RequestInit;
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/auth/login');
    expect(loginRequest.method).toBe('POST');
    expect(loginRequest.body).toBe(
      JSON.stringify({ email: 'ana@example.com', senha: 'secure-password' })
    );
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:8000/api/auth/me');
    expect(new Headers(profileRequest.headers).get('Authorization')).toBe('Bearer access-token');
    expect(authService.currentUser()).toEqual(user);
    expect(authService.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('rhumi_access_token')).toBe('access-token');
    expect(localStorage.getItem('rhumi_refresh_token')).toBe('refresh-token');
  });

  it('should load all active users through the paginated API endpoint', async () => {
    const user = {
      id: 'user-id',
      login: 'ana@example.com',
      nome: 'Ana Silva',
      email: 'ana@example.com',
      classificacao: 'HR_ADMIN',
      ativo: true,
      data_criacao: '2026-03-09T12:00:00.000Z',
      data_atualizacao: '2026-03-09T12:00:00.000Z',
    };
    authService.saveSession('access-token');
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'success',
          data: {
            dados: [user, { ...user, id: 'inactive-user', ativo: false }],
            meta: { pagina: 1, por_pagina: 100, total: 3, total_paginas: 2 },
          },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'success',
          data: {
            dados: [{ ...user, id: 'user-id-2' }],
            meta: { pagina: 2, por_pagina: 100, total: 3, total_paginas: 2 },
          },
        })
      );

    const users = await authService.listarUsuariosAtivos();

    expect(users).toHaveLength(2);
    const firstRequest = fetchMock.mock.calls[0][1] as RequestInit;
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://localhost:8000/api/usuarios?ativo=true&por_pagina=100&pagina=1'
    );
    expect(new Headers(firstRequest.headers).get('Authorization')).toBe('Bearer access-token');
    expect(fetchMock.mock.calls[1][0]).toBe(
      'http://localhost:8000/api/usuarios?ativo=true&por_pagina=100&pagina=2'
    );
  });

  it('should load and persist journey checklist changes through the authenticated endpoints', async () => {
    authService.saveSession('access-token');
    const journeys = [
      {
        employee: {
          id: 'employee-id',
          login: 'ana@example.com',
          nome: 'Ana Silva',
          email: 'ana@example.com',
          classificacao: 'EMPLOYEE',
          ativo: true,
          data_criacao: '2026-03-09T12:00:00.000Z',
          data_atualizacao: '2026-03-09T12:00:00.000Z',
        },
        stages: [
          {
            key: 'pre-boarding',
            title: 'Pré-boarding',
            description: 'Preparação',
            indicator: { type: 'boolean' as const, title: 'Pronto?', description: 'Preparativos' },
            tasks: [
              {
                key: 'documentos-admissionais-enviados',
                title: 'Documentos enviados',
                concluida: false,
                concluida_em: null,
              },
            ],
          },
        ],
      },
    ];
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'success', data: journeys }))
      .mockResolvedValueOnce(jsonResponse({
        status: 'success',
        data: { atualizado: true, concluida_em: '2026-03-09T17:04:00.000Z' },
      }))
      .mockResolvedValueOnce(jsonResponse({ status: 'success', data: { atualizado: true } }));

    await expect(authService.listarJornadas()).resolves.toEqual(journeys);
    await authService.atualizarTarefaJornada(
      'employee-id',
      'pre-boarding',
      'documentos-admissionais-enviados',
      true,
    );
    await authService.reabrirEtapaJornada('employee-id', 'pre-boarding');

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/jornadas');
    expect(fetchMock.mock.calls[1][0]).toBe(
      'http://localhost:8000/api/jornadas/employee-id/etapas/pre-boarding/tarefas/documentos-admissionais-enviados',
    );
    const updateRequest = fetchMock.mock.calls[1][1] as RequestInit;
    expect(updateRequest.method).toBe('PATCH');
    expect(JSON.parse(updateRequest.body as string)).toEqual({ concluida: true });
    expect(fetchMock.mock.calls[2][0]).toBe(
      'http://localhost:8000/api/jornadas/employee-id/etapas/pre-boarding',
    );
    expect((fetchMock.mock.calls[2][1] as RequestInit).method).toBe('DELETE');
  });

  it('should update employee profile fields through the protected user endpoint', async () => {
    authService.saveSession('access-token');
    const updatedUser = {
      id: 'user-id',
      login: 'ana@example.com',
      nome: 'Ana Silva',
      email: 'ana@example.com',
      classificacao: 'EMPLOYEE',
      ativo: true,
      data_criacao: '2026-03-09T12:00:00.000Z',
      data_atualizacao: '2026-03-10T12:00:00.000Z',
      setor: 'Tecnologia',
      cargo: 'Analista',
    };
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'success', data: updatedUser }));

    const result = await authService.atualizarUsuario('user-id', {
      nome: 'Ana Silva',
      email: 'ana@example.com',
      classificacao: 'EMPLOYEE',
      ativo: true,
      setor: 'Tecnologia',
      cargo: 'Analista',
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(result).toEqual(updatedUser);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/usuarios/user-id');
    expect(request.method).toBe('PUT');
    expect(new Headers(request.headers).get('Authorization')).toBeTruthy();
    expect(JSON.parse(request.body as string)).toMatchObject({ setor: 'Tecnologia', cargo: 'Analista' });
  });

  it('should create an employee through the authenticated users endpoint', async () => {
    authService.saveSession('access-token');
    const createdUser = {
      id: 'user-id',
      login: 'ana@example.com',
      nome: 'Ana Silva',
      email: 'ana@example.com',
      classificacao: 'EMPLOYEE',
      ativo: true,
      data_criacao: '2026-03-09T12:00:00.000Z',
      data_atualizacao: '2026-03-09T12:00:00.000Z',
      codigo_colaborador: '0042',
      setor: 'Tecnologia',
    };
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'success', data: createdUser }));

    await expect(authService.criarUsuario({
      login: 'ana@example.com',
      nome: 'Ana Silva',
      email: 'ana@example.com',
      senha: 'secure-password',
      classificacao: 'EMPLOYEE',
      ativo: true,
      setor: 'Tecnologia',
    })).resolves.toEqual(createdUser);

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/usuarios');
    expect(request.method).toBe('POST');
    expect(new Headers(request.headers).get('Authorization')).toBeTruthy();
    expect(JSON.parse(request.body as string)).toMatchObject({
      login: 'ana@example.com',
      email: 'ana@example.com',
      nome: 'Ana Silva',
      senha: 'secure-password',
      setor: 'Tecnologia',
    });
  });

  it('should send an administrative password reset to the dedicated endpoint', async () => {
    authService.saveSession('access-token');
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(authService.redefinirSenhaUsuario('user/id', 'new-secure-password')).resolves.toBeUndefined();

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/usuarios/user%2Fid/reset-senha');
    expect(request.method).toBe('PATCH');
    expect(new Headers(request.headers).get('Authorization')).toBeTruthy();
    expect(JSON.parse(request.body as string)).toEqual({ nova_senha: 'new-secure-password' });
  });

  it('should load sector options from the authenticated API endpoint', async () => {
    authService.saveSession('access-token');
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        status: 'success',
        data: ['Tecnologia', 'Contábil', 'Fiscal'],
      })
    );

    await expect(authService.listarSetores()).resolves.toEqual(['Tecnologia', 'Contábil', 'Fiscal']);
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/setores');
    expect(new Headers(request.headers).get('Authorization')).toBeTruthy();
  });

  it('should send a four-digit collaborator code without dropping leading zeroes', async () => {
    const token = {
      access_token: 'access-token',
      token_type: 'Bearer',
      expires_in: 1800,
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: 'success', data: token }))
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'success',
          data: { id: 'user-id', userLogin: 'ana@example.com', classificacao: 'EMPLOYEE' },
        })
      );

    await authService.loginComCodigo('0042');

    const loginRequest = fetchMock.mock.calls[0][1] as RequestInit;
    expect(loginRequest.body).toBe(JSON.stringify({ codigo_colaborador: '0042' }));
  });

  it('should reject collaborator codes that are not four digits', async () => {
    await expect(authService.loginComCodigo('42')).rejects.toThrow(
      'Informe o código do colaborador com exatamente 4 dígitos.'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should clear the local session after calling the API logout endpoint', async () => {
    authService.saveSession('access-token');
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await authService.logout();

    const logoutRequest = fetchMock.mock.calls[0][1] as RequestInit;
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8000/api/auth/logout');
    expect(logoutRequest.method).toBe('POST');
    expect(new Headers(logoutRequest.headers).get('Authorization')).toBe('Bearer access-token');
    expect(localStorage.getItem('rhumi_access_token')).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });
});
