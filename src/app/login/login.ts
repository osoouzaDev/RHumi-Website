import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
})
export class Login {
  protected readonly message = signal('');

  protected submitLogin(event: SubmitEvent): void {
    event.preventDefault();
    this.message.set('Autenticação por e-mail ainda não está configurada.');
  }

  protected showCodeLoginMessage(): void {
    this.message.set('Acesso por código ainda não está configurado.');
  }
}
