import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  AuthService,
  RecruitmentContractType,
  RecruitmentVacancy,
} from '../services/auth.service';

const CONTRACT_LABELS: Record<RecruitmentContractType, string> = {
  CLT: 'CLT',
  PJ: 'PJ',
  TEMPORARIO: 'Temporário',
  ESTAGIARIO: 'Estágio',
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível concluir a solicitação.';
}

@Component({
  selector: 'app-public-vacancies',
  imports: [FormsModule, RouterLink],
  templateUrl: './public-vacancies.html',
})
export class PublicVacancies implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly vacancies = signal<RecruitmentVacancy[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly searchTerm = signal('');
  protected readonly selectedVacancy = signal<RecruitmentVacancy | null>(null);
  protected readonly registrationError = signal('');
  protected readonly submitting = signal(false);
  protected readonly applyingVacancyId = signal<string | null>(null);
  protected readonly nome = signal('');
  protected readonly email = signal('');
  protected readonly telefone = signal('');
  protected readonly senha = signal('');
  protected readonly confirmacaoSenha = signal('');
  protected readonly isCandidate = computed(
    () => this.authService.currentUser()?.classificacao.trim().toUpperCase() === 'CANDIDATE',
  );
  protected readonly filteredVacancies = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase('pt-BR');
    return this.vacancies().filter((vacancy) =>
      [vacancy.titulo, vacancy.setor, vacancy.localidade ?? '']
        .some((value) => value.toLocaleLowerCase('pt-BR').includes(query)),
    );
  });

  ngOnInit(): void {
    void this.loadVacancies();
  }

  protected async loadVacancies(): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      this.vacancies.set(await this.authService.listarVagasPublicas());
    } catch (error: unknown) {
      this.loadError.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected startApplication(vacancy: RecruitmentVacancy): void {
    this.selectedVacancy.set(vacancy);
    this.registrationError.set('');
    this.nome.set('');
    this.email.set('');
    this.telefone.set('');
    this.senha.set('');
    this.confirmacaoSenha.set('');
  }

  protected closeRegistration(): void {
    if (this.submitting()) return;
    this.selectedVacancy.set(null);
    this.registrationError.set('');
  }

  protected async submitRegistration(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const vacancy = this.selectedVacancy();
    if (!vacancy || this.submitting()) return;
    this.registrationError.set('');

    if (!this.isCandidate()) {
      if (this.senha() !== this.confirmacaoSenha()) {
        this.registrationError.set('As senhas informadas não coincidem.');
        return;
      }
      this.submitting.set(true);
      try {
        await this.authService.registrarCandidato({
          nome: this.nome().trim(),
          email: this.email().trim(),
          telefone: this.telefone().trim() || null,
          senha: this.senha(),
        });
      } catch (error: unknown) {
        this.registrationError.set(errorMessage(error));
        this.submitting.set(false);
        return;
      }
    } else {
      this.submitting.set(true);
    }

    await this.submitApplication(vacancy);
  }

  protected contractLabel(type: RecruitmentContractType): string {
    return CONTRACT_LABELS[type];
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR');
  }

  protected async openCandidateLogin(): Promise<void> {
    await this.router.navigateByUrl('/');
  }

  private async submitApplication(vacancy: RecruitmentVacancy): Promise<void> {
    this.applyingVacancyId.set(vacancy.id);
    try {
      await this.authService.candidatarVaga(vacancy.id);
      this.selectedVacancy.set(null);
      await this.router.navigateByUrl('/candidato/minhas-candidaturas');
    } catch (error: unknown) {
      this.registrationError.set(errorMessage(error));
    } finally {
      this.applyingVacancyId.set(null);
      this.submitting.set(false);
    }
  }
}
