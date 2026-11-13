import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AuthService,
  CandidateApplication,
  CandidateApplicationStatus,
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
  protected readonly loading = signal(true);
  protected readonly savingStatusId = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<CandidateFilter>('Todos');
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
      const applications = await this.authService.listarCandidaturasRecrutamento();
      this.candidates.set(applications.map(candidateFromApi));
    } catch (error: unknown) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
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
