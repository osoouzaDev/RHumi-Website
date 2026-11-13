import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AuthService,
  CandidateApplication,
  CandidateApplicationStatus,
} from '../services/auth.service';

const STATUS_LABELS: Record<CandidateApplicationStatus, string> = {
  NOVA: 'Recebida',
  EM_SELECAO: 'Em análise',
  ENTREVISTA: 'Entrevista',
  CONTRATADA: 'Aprovada',
  REPROVADA: 'Encerrada',
};

@Component({
  selector: 'app-candidate-applications',
  imports: [RouterLink],
  templateUrl: './candidate-applications.html',
})
export class CandidateApplications implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly applications = signal<CandidateApplication[]>([]);
  protected readonly loading = signal(true);
  protected readonly loggingOut = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.loadApplications();
  }

  protected async loadApplications(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.applications.set(await this.authService.listarMinhasCandidaturas());
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível carregar suas candidaturas.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async logout(): Promise<void> {
    this.loggingOut.set(true);
    this.error.set('');
    try {
      await this.authService.logout();
      await this.router.navigateByUrl('/vagas');
    } catch {
      this.error.set(
        'Sua sessão foi encerrada neste dispositivo, mas não foi possível notificar o servidor. Entre novamente se necessário.'
      );
    } finally {
      this.loggingOut.set(false);
    }
  }

  protected statusLabel(status: CandidateApplicationStatus): string {
    return STATUS_LABELS[status];
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Data indisponível' : date.toLocaleDateString('pt-BR');
  }
}
