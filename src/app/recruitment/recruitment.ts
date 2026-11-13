import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AuthService,
  RecruitmentContractType,
  RecruitmentVacancy,
  RecruitmentVacancyStatus,
} from '../services/auth.service';
import { SystemNavigation } from '../shared/system-navigation';

interface Vacancy {
  id: string;
  title: string;
  department: string;
  location: string;
  type: RecruitmentContractType;
  status: 'Aberta' | 'Pausada' | 'Encerrada';
  createdAt: string;
}

type VacancyFilter = 'Todas' | 'Abertas' | 'Pausadas';

const CONTRACT_LABELS: Record<RecruitmentContractType, string> = {
  CLT: 'CLT',
  PJ: 'PJ',
  TEMPORARIO: 'Temporário',
  ESTAGIARIO: 'Estágio',
};

function vacancyFromApi(vacancy: RecruitmentVacancy): Vacancy {
  return {
    id: vacancy.id,
    title: vacancy.titulo,
    department: vacancy.setor,
    location: vacancy.localidade || 'A combinar',
    type: vacancy.tipo_contrato,
    status: vacancy.status === 'ABERTA' ? 'Aberta' : vacancy.status === 'PAUSADA' ? 'Pausada' : 'Encerrada',
    createdAt: vacancy.created_at,
  };
}

function apiStatus(status: Vacancy['status']): RecruitmentVacancyStatus {
  if (status === 'Aberta') return 'ABERTA';
  if (status === 'Pausada') return 'PAUSADA';
  return 'ENCERRADA';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocorreu um erro ao acessar os dados de recrutamento.';
}

@Component({
  selector: 'app-recruitment',
  imports: [FormsModule, SystemNavigation],
  templateUrl: './recruitment.html',
})
export class Recruitment implements OnInit {
  private readonly authService = inject(AuthService);
  protected readonly vacancies = signal<Vacancy[]>([]);
  protected readonly filter = signal<VacancyFilter>('Todas');
  protected readonly searchTerm = signal('');
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly savingStatusId = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly showForm = signal(false);
  protected readonly title = signal('');
  protected readonly department = signal('');
  protected readonly location = signal('');
  protected readonly description = signal('');
  protected readonly type = signal<RecruitmentContractType>('CLT');
  protected readonly contractTypes = Object.keys(CONTRACT_LABELS) as RecruitmentContractType[];
  protected readonly openCount = computed(() => this.vacancies().filter((vacancy) => vacancy.status === 'Aberta').length);
  protected readonly pausedCount = computed(() => this.vacancies().filter((vacancy) => vacancy.status === 'Pausada').length);
  protected readonly filteredVacancies = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase('pt-BR');
    return this.vacancies()
      .filter((vacancy) => this.filter() === 'Todas'
        || (this.filter() === 'Abertas' ? vacancy.status === 'Aberta' : vacancy.status === 'Pausada'))
      .filter((vacancy) => !query || [vacancy.title, vacancy.department, vacancy.location]
        .some((value) => value.toLocaleLowerCase('pt-BR').includes(query)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  ngOnInit(): void {
    void this.loadVacancies();
  }

  protected async loadVacancies(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.vacancies.set((await this.authService.listarVagasRecrutamento()).map(vacancyFromApi));
    } catch (error: unknown) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected openForm(): void {
    this.title.set('');
    this.department.set('');
    this.location.set('');
    this.description.set('');
    this.type.set('CLT');
    this.error.set('');
    this.showForm.set(true);
  }

  protected async createVacancy(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const title = this.title().trim();
    const department = this.department().trim();
    if (!title || !department) {
      this.error.set('Informe o nome da vaga e o setor.');
      return;
    }

    this.saving.set(true);
    this.error.set('');
    try {
      const createdVacancy = await this.authService.criarVagaRecrutamento({
        titulo: title,
        setor: department,
        localidade: this.location().trim() || null,
        tipo_contrato: this.type(),
        descricao: this.description().trim() || null,
      });
      this.vacancies.update((vacancies) => [vacancyFromApi(createdVacancy), ...vacancies]);
      this.showForm.set(false);
    } catch (error: unknown) {
      this.error.set(errorMessage(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected async toggleStatus(vacancy: Vacancy): Promise<void> {
    const nextStatus: Vacancy['status'] = vacancy.status === 'Aberta' ? 'Pausada' : 'Aberta';
    this.savingStatusId.set(vacancy.id);
    this.error.set('');
    try {
      const updatedVacancy = await this.authService.atualizarStatusVaga(vacancy.id, apiStatus(nextStatus));
      this.vacancies.update((vacancies) => vacancies.map((item) =>
        item.id === vacancy.id ? vacancyFromApi(updatedVacancy) : item
      ));
    } catch (error: unknown) {
      this.error.set(errorMessage(error));
    } finally {
      this.savingStatusId.set(null);
    }
  }

  protected contractLabel(type: RecruitmentContractType): string {
    return CONTRACT_LABELS[type];
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Data não informada' : date.toLocaleDateString('pt-BR');
  }
}
