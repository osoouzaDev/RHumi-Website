import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

/**
 * Guarda de rota que protege o acesso a páginas autenticadas (ex.: /funcionarios).
 * Caso não haja token ou sessão ativa, redireciona o usuário para o login.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.parseUrl('/');
};

