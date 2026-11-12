import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AuthService,
  CandidateApplication,
  CandidateApplicationStatus,
  RecruitmentVacancy,
} from '../services/auth.service';
import { SystemNavigation } from '../shared/system-navigation';

type CandidateStatus = 'Em análise' | 'Aprovado' | 'Entrevista' | 'Aguardando' | 'Reprovado';
type CandidateFilter = 'Todos' | CandidateStatus;

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  vacancyId: string;
  status: CandidateStatus;
  createdAt: string;
}

const API_STATUSES: Record<CandidateStatus, CandidateApplicationStatus> = {
  'Em análise': 'EM_SELECAO',
  Aprovado: 'CONTRATADA',
  Entrevista: 'ENTREVISTA',
  Aguardando: 'NOVA',
  Reprovado: 'REPROVADA',
};
const CANDIDATE_STATUSES = Object.keys(API_STATUSES) as CandidateStatus[];

function candidateFromApi(application: CandidateApplication): Candidate {
  const status = Object.entries(API_STATUSES)
    .find(([, apiStatus]) => apiStatus === application.status)?.[0] as CandidateStatus | undefined;
  if (!status) {
    throw new Error('A API retornou um status de candidatura não reconhecido.');
  }
  return {
    id: application.id,
    name: application.nome,
    email: application.email,
    phone: application.telefone ?? '',
    role: application.vaga_titulo,
    vacancyId: application.id_vaga,
    status,
    createdAt: application.created_at,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocorreu um erro ao acessar os dados de candidatos.';
}

@Component({
  selector: 'app-candidates',
  imports: [FormsModule, SystemNavigation],
  templateUrl: './candidates.html',
})
export class Candidates implements OnInit {
  private readonly authService = inject(AuthService);
  protected readonly candidates = signal<Candidate[]>([]);
  protected readonly availableVacancies = signal<RecruitmentVacancy[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly savingStatusId = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<CandidateFilter>('Todos');
  protected readonly showForm = signal(false);
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly vacancyId = signal('');
  protected readonly candidateStatuses = CANDIDATE_STATUSES;
  protected readonly totalCount = computed(() => this.candidates().length);
  protected readonly analysisCount = computed(() => this.countByStatus('Em análise'));
  protected readonly approvedCount = computed(() => this.countByStatus('Aprovado'));
  protected readonly interviewCount = computed(() => this.countByStatus('Entrevista'));
  protected readonly waitingCount = computed(() => this.countByStatus('Aguardando'));
  protected readonly countRejected = computed(() => this.countByStatus('Reprovado'));
  protected readonly filteredCandidates = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase('pt-BR');
    return this.candidates()
      .filter((candidate) => this.statusFilter() === 'Todos' || candidate.status === this.statusFilter())
      .filter((candidate) => !query || [candidate.name, candidate.email, candidate.role]
        .some((value) => value.toLocaleLowerCase('pt-BR').includes(query)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  ngOnInit(): void {
    void this.loadCandidates();
  }

  protected async loadCandidates(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const [applications, vacancies] = await Promise.all([
        this.authService.listarCandidaturasRecrutamento(),
        this.authService.listarVagasRecrutamento(),
      ]);
      this.candidates.set(applications.map(candidateFromApi));
      this.availableVacancies.set(vacancies.filter((vacancy) => vacancy.status === 'ABERTA'));
      if (!this.vacancyId() && this.availableVacancies().length) {
        this.vacancyId.set(this.availableVacancies()[0].id);
      }
    } catch (error: unknown) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected openForm(): void {
    this.name.set('');
    this.email.set('');
    this.phone.set('');
    this.vacancyId.set(this.availableVacancies()[0]?.id ?? '');
    this.error.set('');
    this.showForm.set(true);
  }

  protected async createCandidate(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const name = this.name().trim();
    const email = this.email().trim();
    const vacancyId = this.vacancyId();
    if (!name || !email || !vacancyId) {
      this.error.set('Preencha nome, e-mail e selecione uma vaga aberta.');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    try {
      const application = await this.authService.criarCandidatura({
        nome: name,
        email,
        telefone: this.phone().trim() || null,
        id_vaga: vacancyId,
      });
      const candidate = candidateFromApi(application);
      this.candidates.update((candidates) => [
        candidate,
        ...candidates.filter((item) => item.id !== candidate.id),
      ]);
      this.showForm.set(false);
    } catch (error: unknown) {
      this.error.set(errorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected async updateStatus(candidate: Candidate, status: CandidateStatus): Promise<void> {
    this.savingStatusId.set(candidate.id);
    this.error.set('');
    try {
      const application = await this.authService.atualizarStatusCandidatura(
        candidate.id,
        API_STATUSES[status]
      );
      const updatedCandidate = candidateFromApi(application);
      this.candidates.update((candidates) => candidates.map((item) =>
        item.id === candidate.id ? updatedCandidate : item
      ));
    } catch (error: unknown) {
      this.error.set(errorMessage(error));
    } finally {
      this.savingStatusId.set(null);
    }
  }

  protected initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Data não informada' : date.toLocaleDateString('pt-BR');
  }

  private countByStatus(status: CandidateStatus): number {
    return this.candidates().filter((candidate) => candidate.status === status).length;
  }
}
