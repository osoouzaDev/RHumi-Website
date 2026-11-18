import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';

export interface UserSession {
  id: string;
  userLogin: string;
  classificacao: string;
}

export interface AuthSuccessData {
  token_type?: string;
  expires_in: number;
}

export interface ApiUser {
  id: string;
  login: string;
  nome: string;
  email: string;
  classificacao: string;
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
  telefone?: string | null;
  setor?: string | null;
  cargo?: string | null;
  tipo_contrato?: 'CLT' | 'PJ' | 'TEMPORARIO' | 'ESTAGIARIO' | null;
  data_admissao?: string | null;
  descricao_cargo?: string | null;
}

export interface ApiJourneyTask {
  key: string;
  title: string;
  concluida: boolean;
  concluida_em: string | null;
}

export interface ApiJourneyStage {
  key: string;
  title: string;
  description: string;
  indicator: {
    type: 'boolean' | 'percentage' | 'count';
    title: string;
    description: string;
  };
  tasks: ApiJourneyTask[];
}

export interface ApiEmployeeJourney {
  employee: ApiUser;
  stages: ApiJourneyStage[];
}

export type UpdateApiUser = Partial<
  Pick<
    ApiUser,
    | 'nome'
    | 'email'
    | 'classificacao'
    | 'ativo'
    | 'telefone'
    | 'setor'
    | 'cargo'
    | 'tipo_contrato'
    | 'data_admissao'
    | 'descricao_cargo'
  >
>;

export interface CreateApiUser {
  login: string;
  nome: string;
  email: string;
  senha: string;
  classificacao: string;
  ativo: boolean;
  telefone?: string | null;
  setor?: string | null;
  cargo?: string | null;
  tipo_contrato?: ApiUser['tipo_contrato'];
  data_admissao?: string | null;
  descricao_cargo?: string | null;
}

export interface CreatedApiUser extends ApiUser {
  codigo_colaborador: string | null;
}

export interface CompanyData {
  id: string;
  nome_empresa: string;
  cnpj: string;
  rua: string | null;
  numero_end: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  telefone: string | null;
  email: string | null;
  fundacao: string | null;
  sobre_empresa: string | null;
  nome_pagina_carreiras: string | null;
  homepage_carreiras: string | null;
  chamada_carreiras: string | null;
  descricao_carreiras: string | null;
  missao: string | null;
  visao: string | null;
  valores: string | null;
  created_at: string;
  updated_at: string;
  total_colaboradores: number;
  setores: CompanySector[];
  classificacoes: string[];
}

export interface CompanySector {
  id: string;
  nome_setor: string;
  icone: string | null;
  quantidade: number;
}

export type RecruitmentContractType = 'CLT' | 'PJ' | 'TEMPORARIO' | 'ESTAGIARIO';
export type RecruitmentVacancyStatus = 'ABERTA' | 'PAUSADA' | 'ENCERRADA';
export type CandidateApplicationStatus =
  | 'NOVA'
  | 'EM_SELECAO'
  | 'ENTREVISTA'
  | 'CONTRATADA'
  | 'REPROVADA';

export interface RecruitmentVacancy {
  id: string;
  titulo: string;
  setor: string;
  localidade: string | null;
  tipo_contrato: RecruitmentContractType;
  descricao: string | null;
  status: RecruitmentVacancyStatus;
  created_at: string;
}

export interface CreateRecruitmentVacancy {
  titulo: string;
  setor: string;
  localidade: string | null;
  tipo_contrato: RecruitmentContractType;
  descricao?: string | null;
}

export interface CandidateApplication {
  id: string;
  id_candidato: string;
  nome: string;
  email: string;
  telefone: string | null;
  id_vaga: string;
  vaga_titulo: string;
  status: CandidateApplicationStatus;
  created_at: string;
}

export interface CandidateRegistration {
  nome: string;
  email: string;
  telefone: string | null;
  senha: string;
}

interface CandidateRegistrationResponse extends AuthSuccessData {
  profile: UserSession;
}

export type UpdateCompanyData = Omit<
  CompanyData,
  'id' | 'created_at' | 'updated_at' | 'total_colaboradores' | 'setores' | 'classificacoes'
>;

interface PaginatedUsers {
  dados: ApiUser[];
  meta: {
    pagina: number;
    por_pagina: number;
    total: number;
    total_paginas: number;
  };
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl || 'http://localhost:8000';
  private readonly userKey = 'rhumi_user';
  private refreshInProgress: Promise<void> | null = null;

  readonly currentUser = signal<UserSession | null>(this.getStoredUser());
  readonly isAuthenticated = signal<boolean>(Boolean(this.currentUser()));

  constructor() {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('rhumi_access_token');
      localStorage.removeItem('rhumi_refresh_token');
    }
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchWithSession(`${this.apiUrl}${path}`, init);

    if (response.status === 204) {
      return undefined as T;
    }

    let payload: ApiResponse<T>;
    try {
      payload = (await response.json()) as ApiResponse<T>;
    } catch {
      throw new Error('A API retornou uma resposta inválida.');
    }

    if (!response.ok || payload.status === 'error' || payload.data === undefined) {
      throw new Error(payload.message || `A solicitação à API falhou (HTTP ${response.status}).`);
    }

    return payload.data;
  }

  getStoredUser(): UserSession | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      const user = JSON.parse(raw) as UserSession;
      return user.id && user.userLogin && user.classificacao ? user : null;
    } catch {
      return null;
    }
  }

  getStoredToken(): string | null {
    return this.currentUser() ? 'cookie-session' : null;
  }

  saveSession(user: UserSession): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.currentUser.set(user);
    this.isAuthenticated.set(true);
  }

  async fetchWithSession(url: string, init: RequestInit = {}): Promise<Response> {
    const fetchRequest = async (): Promise<Response> => {
      const headers = new Headers(init.headers);
      headers.delete('Authorization');
      headers.set('Accept', 'application/json');
      try {
        return await fetch(url, { ...init, credentials: 'include', headers });
      } catch {
        throw new Error(`Não foi possível conectar à API em ${this.apiUrl}. Verifique se ela está ativa.`);
      }
    };

    let response = await fetchRequest();
    const isAuthEndpoint = new URL(url, this.apiUrl).pathname.startsWith('/api/auth/');
    if (response.status === 401 && this.currentUser() && !isAuthEndpoint) {
      await this.refreshSession();
      response = await fetchRequest();
    }
    if (response.status === 401 && this.currentUser() && !isAuthEndpoint) {
      this.clearSession();
    }
    return response;
  }

  private async refreshSession(): Promise<void> {
    if (!this.refreshInProgress) {
      this.refreshInProgress = this.performRefresh().finally(() => {
        this.refreshInProgress = null;
      });
    }
    await this.refreshInProgress;
  }

  private async performRefresh(): Promise<void> {
    const response = await this.fetchWithSession(`${this.apiUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!response.ok) {
      this.clearSession();
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }
    let payload: ApiResponse<AuthSuccessData>;
    try {
      payload = await response.json() as ApiResponse<AuthSuccessData>;
    } catch {
      this.clearSession();
      throw new Error('A API retornou uma resposta inválida ao renovar a sessão.');
    }
    if (payload.status !== 'success') {
      this.clearSession();
      throw new Error(payload.message || 'Não foi possível renovar sua sessão.');
    }
  }

  /**
   * Método 1: Autenticação via e-mail e senha
   */
  async loginComEmail(email: string, senha: string): Promise<AuthSuccessData> {
    if (!email?.trim() || !senha?.trim()) {
      throw new Error('Informe o e-mail e a senha.');
    }

    return this.autenticar({
      email: email.trim(),
      senha: senha.trim(),
    });
  }

  /**
   * Método 2: Autenticação via código único do colaborador
   */
  async loginComCodigo(codigoColaborador: string): Promise<AuthSuccessData> {
    const codigo = codigoColaborador?.trim();
    if (!/^\d{4}$/.test(codigo)) {
      throw new Error('Informe o código do colaborador com exatamente 4 dígitos.');
    }

    return this.autenticar({
      codigo_colaborador: codigo,
    });
  }

  async listarUsuariosAtivos(): Promise<ApiUser[]> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    const users: ApiUser[] = [];
    let pagina = 1;
    let totalPaginas = 1;

    while (pagina <= totalPaginas) {
      const result = await this.request<PaginatedUsers>(
        `/api/usuarios?ativo=true&por_pagina=100&pagina=${pagina}`,
        {
          headers: {
            Authorization: ['Bearer', token].join(' '),
          },
        }
      );

      if (
        !Array.isArray(result.dados) ||
        !Number.isInteger(result.meta?.total_paginas) ||
        result.meta.total_paginas < 1
      ) {
        throw new Error('A API retornou uma lista de usuários em formato inválido.');
      }

      users.push(...result.dados.filter((user) => user.ativo));
      totalPaginas = result.meta.total_paginas;
      pagina += 1;
    }

    return users;
  }

  async listarJornadas(): Promise<ApiEmployeeJourney[]> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    const journeys = await this.request<ApiEmployeeJourney[]>('/api/jornadas', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (
      !Array.isArray(journeys) ||
      journeys.some(
        (journey) =>
          journey == null ||
          !journey.employee?.id ||
          !Array.isArray(journey.stages) ||
          journey.stages.some((stage) => stage == null || !Array.isArray(stage.tasks))
      )
    ) {
      throw new Error('A API retornou dados de jornada em formato inválido.');
    }
    return journeys;
  }

  async atualizarTarefaJornada(
    usuarioId: string,
    etapaKey: string,
    tarefaKey: string,
    concluida: boolean
  ): Promise<string | null> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    const result = await this.request<{ atualizado: boolean; concluida_em: string | null }>(
      `/api/jornadas/${encodeURIComponent(usuarioId)}/etapas/${encodeURIComponent(etapaKey)}/tarefas/${encodeURIComponent(tarefaKey)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ concluida }),
      }
    );
    if (
      result.atualizado !== true ||
      (result.concluida_em !== null && typeof result.concluida_em !== 'string')
    ) {
      throw new Error('A API retornou uma confirmação de jornada inválida.');
    }
    return result.concluida_em;
  }

  async reabrirEtapaJornada(usuarioId: string, etapaKey: string): Promise<void> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    await this.request<{ atualizado: boolean }>(
      `/api/jornadas/${encodeURIComponent(usuarioId)}/etapas/${encodeURIComponent(etapaKey)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  }

  async buscarEmpresa(): Promise<CompanyData> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    return this.request<CompanyData>('/api/empresa', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async atualizarEmpresa(data: UpdateCompanyData): Promise<CompanyData> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    return this.request<CompanyData>('/api/empresa', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async criarSetorEmpresa(nomeSetor: string): Promise<CompanySector> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    return this.request<CompanySector>('/api/empresa/setores', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nome_setor: nomeSetor }),
    });
  }

  async removerSetorEmpresa(id: string): Promise<void> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    await this.request<void>(`/api/empresa/setores/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async listarSetores(): Promise<string[]> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    const setores = await this.request<string[]>('/api/setores', {
      headers: {
        Authorization: ['Bearer', token].join(' '),
      },
    });

    if (!Array.isArray(setores) || setores.some((setor) => typeof setor !== 'string')) {
      throw new Error('A API retornou uma lista de setores em formato inválido.');
    }
    return setores;
  }

  async listarVagasRecrutamento(): Promise<RecruitmentVacancy[]> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    const vacancies = await this.request<RecruitmentVacancy[]>('/api/recrutamento/vagas', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!Array.isArray(vacancies)) {
      throw new Error('A API retornou uma lista de vagas em formato inválido.');
    }
    return vacancies;
  }

  async listarVagasPublicas(): Promise<RecruitmentVacancy[]> {
    const vacancies = await this.request<RecruitmentVacancy[]>('/api/public/vagas');
    if (!Array.isArray(vacancies)) {
      throw new Error('A API retornou uma lista de vagas públicas em formato inválido.');
    }
    return vacancies;
  }

  async registrarCandidato(data: CandidateRegistration): Promise<void> {
    const result = await this.request<CandidateRegistrationResponse>('/api/public/candidatos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (
      !result.profile?.id ||
      result.profile.classificacao.trim().toUpperCase() !== 'CANDIDATE'
    ) {
      throw new Error('A API retornou dados inválidos ao criar sua conta de candidato.');
    }
    this.saveSession(result.profile);
  }

  async candidatarVaga(idVaga: string): Promise<CandidateApplication> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Entre ou crie sua conta de candidato para se candidatar.');
    }
    return this.request<CandidateApplication>('/api/candidato/candidaturas', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id_vaga: idVaga }),
    });
  }

  async listarMinhasCandidaturas(): Promise<CandidateApplication[]> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }
    const applications = await this.request<CandidateApplication[]>('/api/candidato/candidaturas', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!Array.isArray(applications)) {
      throw new Error('A API retornou uma lista de candidaturas em formato inválido.');
    }
    return applications;
  }

  async criarVagaRecrutamento(data: CreateRecruitmentVacancy): Promise<RecruitmentVacancy> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    return this.request<RecruitmentVacancy>('/api/recrutamento/vagas', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async atualizarStatusVaga(id: string, status: RecruitmentVacancyStatus): Promise<RecruitmentVacancy> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    return this.request<RecruitmentVacancy>(`/api/recrutamento/vagas/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
  }

  async listarCandidaturasRecrutamento(): Promise<CandidateApplication[]> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    const applications = await this.request<CandidateApplication[]>('/api/recrutamento/candidaturas', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!Array.isArray(applications)) {
      throw new Error('A API retornou uma lista de candidaturas em formato inválido.');
    }
    return applications;
  }

  async atualizarStatusCandidatura(id: string, status: CandidateApplicationStatus): Promise<CandidateApplication> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    return this.request<CandidateApplication>(
      `/api/recrutamento/candidaturas/${encodeURIComponent(id)}/status`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      }
    );
  }

  async buscarUsuario(id: string): Promise<ApiUser> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    return this.request<ApiUser>(`/api/usuarios/${encodeURIComponent(id)}`, {
      headers: {
        Authorization: ['Bearer', token].join(' '),
      },
    });
  }

  async atualizarUsuario(id: string, dados: UpdateApiUser): Promise<ApiUser> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    return this.request<ApiUser>(`/api/usuarios/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        Authorization: ['Bearer', token].join(' '),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dados),
    });
  }

  async criarUsuario(dados: CreateApiUser): Promise<CreatedApiUser> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    return this.request<CreatedApiUser>('/api/usuarios', {
      method: 'POST',
      headers: {
        Authorization: ['Bearer', token].join(' '),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dados),
    });
  }

  async redefinirSenhaUsuario(id: string, novaSenha: string): Promise<void> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    }

    await this.request<void>(`/api/usuarios/${encodeURIComponent(id)}/reset-senha`, {
      method: 'PATCH',
      headers: {
        Authorization: ['Bearer', token].join(' '),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nova_senha: novaSenha }),
    });
  }

  async logout(): Promise<void> {
    const token = this.getStoredToken();
    let logoutError: unknown;

    if (token) {
      try {
        await this.request<void>('/api/auth/logout', {
          method: 'POST',
        });
      } catch (error: unknown) {
        logoutError = error;
      }
    }

    this.clearSession();
    if (logoutError) {
      throw logoutError;
    }
  }

  private async autenticar(credentials: Record<string, string>): Promise<AuthSuccessData> {
    const result = await this.request<AuthSuccessData>('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    try {
      const profile = await this.request<UserSession>('/api/auth/me');
      if (!profile.id || !profile.userLogin || !profile.classificacao) {
        throw new Error('A API retornou um perfil de usuário inválido.');
      }
      const user: UserSession = {
        id: profile.id,
        userLogin: profile.userLogin,
        classificacao: profile.classificacao,
      };
      this.saveSession(user);
    } catch (error: unknown) {
      this.clearSession();
      throw error;
    }

    return result;
  }

  private clearSession(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('rhumi_access_token');
      localStorage.removeItem('rhumi_refresh_token');
      localStorage.removeItem(this.userKey);
    }
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
  }
}
