import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { AuthService } from './services/auth.service';
import {
  authGuard,
  candidateGuard,
  employeeRedirectGuard,
  homeRouteForProfile,
  publicVacanciesGuard,
} from './auth.guard';

describe('authorization route guards', () => {
  const parseUrl = vi.fn((url: string) => ({ url }) as unknown as UrlTree);
  const authService = {
    isAuthenticated: vi.fn(),
    currentUser: vi.fn(),
  };

  beforeEach(() => {
    parseUrl.mockClear();
    authService.isAuthenticated.mockReset();
    authService.currentUser.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: { parseUrl } },
      ],
    });
  });

  it('selects the employee area as the EMPLOYEE landing route', () => {
    expect(homeRouteForProfile('EMPLOYEE')).toBe('/area-colaborador');
    expect(homeRouteForProfile('employee')).toBe('/area-colaborador');
    expect(homeRouteForProfile('CANDIDATE')).toBe('/vagas');
    expect(homeRouteForProfile('HR_ADMIN')).toBe('/dashboard');
  });

  it('redirects authenticated employees away from every protected route except their area', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.currentUser.mockReturnValue({ classificacao: 'EMPLOYEE' });
    const guard = TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/dashboard' } as never));

    expect(guard).toEqual({ url: '/area-colaborador' });
    expect(parseUrl).toHaveBeenCalledWith('/area-colaborador');
  });

  it('allows employees into their area and other profiles into their protected screens', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.currentUser.mockReturnValue({ classificacao: 'EMPLOYEE' });
    const employeeGuard = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/area-colaborador' } as never),
    );
    expect(employeeGuard).toBe(true);

    authService.currentUser.mockReturnValue({ classificacao: 'SUPERVISOR' });
    const supervisorGuard = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/dashboard' } as never),
    );
    expect(supervisorGuard).toBe(true);
  });

  it('redirects employees away from login and unknown routes', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.currentUser.mockReturnValue({ classificacao: 'EMPLOYEE' });

    const login = TestBed.runInInjectionContext(() =>
      employeeRedirectGuard({} as never, {} as never),
    );
    const notFound = TestBed.runInInjectionContext(() =>
      employeeRedirectGuard({} as never, {} as never),
    );

    expect(login).toEqual({ url: '/area-colaborador' });
    expect(notFound).toEqual({ url: '/area-colaborador' });
  });

  it('redirects unauthenticated users to login', () => {
    authService.isAuthenticated.mockReturnValue(false);
    const guard = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/dashboard' } as never),
    );
    expect(guard).toEqual({ url: '/' });
  });

  it('restricts candidate accounts to the public vacancies and their application area', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.currentUser.mockReturnValue({ classificacao: 'CANDIDATE' });

    const protectedRoute = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/dashboard' } as never),
    );
    const applicationArea = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/candidato/minhas-candidaturas' } as never),
    );
    const ownArea = TestBed.runInInjectionContext(() =>
      candidateGuard({} as never, {} as never),
    );
    const vacancies = TestBed.runInInjectionContext(() =>
      publicVacanciesGuard({} as never, {} as never),
    );

    expect(protectedRoute).toEqual({ url: '/vagas' });
    expect(applicationArea).toBe(true);
    expect(ownArea).toBe(true);
    expect(vacancies).toBe(true);
  });

  it('redirects employees away from the public vacancy page', () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.currentUser.mockReturnValue({ classificacao: 'EMPLOYEE' });
    const guard = TestBed.runInInjectionContext(() =>
      publicVacanciesGuard({} as never, {} as never),
    );
    expect(guard).toEqual({ url: '/area-colaborador' });
  });
});
