import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export function homeRouteForProfile(classificacao?: string | null): string {
  const profile = classificacao?.trim().toUpperCase();
  if (profile === 'EMPLOYEE') return '/area-colaborador';
  if (profile === 'CANDIDATE') return '/vagas';
  return '/dashboard';
}

/**
 * Guarda de rota que protege o acesso a páginas autenticadas (ex.: /funcionarios).
 * Caso não haja token ou sessão ativa, redireciona o usuário para o login.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.parseUrl('/');
  }

  const isEmployee = homeRouteForProfile(authService.currentUser()?.classificacao) === '/area-colaborador';
  if (isEmployee && !state.url.startsWith('/area-colaborador')) {
    return router.parseUrl('/area-colaborador');
  }
  const isCandidate =
    authService.currentUser()?.classificacao.trim().toUpperCase() === 'CANDIDATE';
  if (isCandidate && !state.url.startsWith('/candidato/minhas-candidaturas')) {
    return router.parseUrl('/vagas');
  }

  return true;
};

export const employeeRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  if (authService.isAuthenticated()) {
    const home = homeRouteForProfile(authService.currentUser()?.classificacao);
    if (home !== '/dashboard') return inject(Router).parseUrl(home);
  }

  return true;
};

export const candidateGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.isAuthenticated()) return router.parseUrl('/');
  if (authService.currentUser()?.classificacao.trim().toUpperCase() !== 'CANDIDATE') {
    return router.parseUrl(homeRouteForProfile(authService.currentUser()?.classificacao));
  }
  return true;
};

export const publicVacanciesGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  if (
    authService.isAuthenticated() &&
    homeRouteForProfile(authService.currentUser()?.classificacao) === '/area-colaborador'
  ) {
    return inject(Router).parseUrl('/area-colaborador');
  }
  return true;
};
