import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
})
export class Login {
  protected readonly authService = inject(AuthService);
  protected readonly router = inject(Router);

  protected readonly loginMode = signal<'email' | 'code'>('email');
  protected readonly email = signal('');
  protected readonly senha = signal('');
  protected readonly codigoColaborador = signal('');
  protected readonly message = signal('');
  protected readonly isSuccess = signal(false);
  protected readonly loading = signal(false);

  /**
   * Alterna entre modo de login por e-mail+senha e código do colaborador
   */
  protected toggleMode(): void {
    this.setLoginMode(this.loginMode() === 'email' ? 'code' : 'email');
  }

  protected setLoginMode(mode: 'email' | 'code'): void {
    this.loginMode.set(mode);
    this.message.set('');
    this.isSuccess.set(false);
  }

  /**
   * Chamado pelo botão "Código do colaborador"
   */
  protected showCodeLoginMessage(): void {
    this.toggleMode();
  }

  /**
   * Submissão do login por e-mail e senha
   */
  protected async submitLogin(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    const emailVal = this.email().trim();
    const senhaVal = this.senha().trim();

    if (!emailVal || !senhaVal) {
      this.isSuccess.set(false);
      this.message.set('Por favor, informe seu e-mail e senha para continuar.');
      return;
    }

    this.loading.set(true);
    this.message.set('');

    try {
      await this.authService.loginComEmail(emailVal, senhaVal);
      this.isSuccess.set(true);
      this.message.set('Autenticação realizada com sucesso! Redirecionando...');
      await this.router.navigate(['/dashboard']);
    } catch (error: unknown) {
      this.isSuccess.set(false);
      const msg = error instanceof Error ? error.message : 'Falha na autenticação por e-mail.';
      this.message.set(msg);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Submissão do login por código do colaborador
   */
  protected async submitCodeLogin(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    const codigoVal = this.codigoColaborador().trim();

    if (!/^\d{4}$/.test(codigoVal)) {
      this.isSuccess.set(false);
      this.message.set('Informe o código do colaborador com exatamente 4 dígitos.');
      return;
    }

    this.loading.set(true);
    this.message.set('');

    try {
      await this.authService.loginComCodigo(codigoVal);
      this.isSuccess.set(true);
      this.message.set('Autenticação realizada com sucesso! Redirecionando...');
      await this.router.navigate(['/dashboard']);
    } catch (error: unknown) {
      this.isSuccess.set(false);
      const msg = error instanceof Error ? error.message : 'Falha na autenticação por código.';
      this.message.set(msg);
    } finally {
      this.loading.set(false);
    }
  }
}
