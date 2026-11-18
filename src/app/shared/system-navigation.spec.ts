import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { NavigationPage } from './navigation-orb';
import { SystemNavigation } from './system-navigation';

describe('SystemNavigation', () => {
  const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
  const authService = {
    logout: vi.fn().mockResolvedValue(undefined),
    currentUser: vi.fn().mockReturnValue(null),
  };

  beforeEach(() => {
    router.navigateByUrl.mockClear();
    authService.logout.mockClear();
    authService.currentUser.mockReturnValue(null);
    TestBed.configureTestingModule({
      imports: [SystemNavigation],
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  it('renders the navigation orb with the icon for each application page', () => {
    const fixture = TestBed.createComponent(SystemNavigation);
    const pages: NavigationPage[] = [
      'dashboard',
      'employees',
      'company',
      'journey',
      'calendar',
      'recruitment',
      'learning',
      'employee-area',
      'settings',
    ];

    for (const page of pages) {
      fixture.componentRef.setInput('page', page);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector(`[data-page="${page}"]`)).toBeTruthy();
    }
  });

  it('shows training management to administrators and centers settings on its own row', () => {
    authService.currentUser.mockReturnValue({ classificacao: 'HR_ADMIN' });
    const fixture = TestBed.createComponent(SystemNavigation);
    fixture.componentRef.setInput('page', 'learning');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[aria-label="Navegação do sistema"]').click();
    fixture.detectChanges();

    const navigation = fixture.nativeElement.querySelector('nav[aria-label="Navegação principal"]') as HTMLElement;
    expect(navigation.textContent).toContain('Treinamentos e avaliações');
    expect(navigation.classList.contains('employee-navigation-menu')).toBe(false);
    expect(navigation.querySelectorAll('li')).toHaveLength(9);
    const labels = [...navigation.querySelectorAll('li button > span:last-child')]
      .map((label) => label.textContent?.trim());
    expect(labels).toEqual([
      'Dashboard',
      'Funcionários',
      'Empresa',
      'Jornada',
      'Calendário',
      'Recrutamento',
      'Treinamentos e avaliações',
      'Área do colaborador',
      'Configurações',
    ]);
    expect(navigation.querySelector('.navigation-settings-item')?.className).toContain('navigation-settings-item');
    expect(navigation.querySelector('ul')?.className).toContain('sm:grid-cols-4');
  });

  it('opens the shared menu, marks the active page, and navigates to another route', () => {
    const fixture = TestBed.createComponent(SystemNavigation);
    fixture.componentRef.setInput('page', 'calendar');
    fixture.detectChanges();

    const orb = fixture.nativeElement.querySelector(
      'button[aria-label="Navegação do sistema"]',
    ) as HTMLButtonElement;
    orb.click();
    fixture.detectChanges();

    const navigation = fixture.nativeElement.querySelector(
      'nav[aria-label="Navegação principal"]',
    ) as HTMLElement;
    expect(navigation.classList.contains('employee-navigation-menu')).toBe(false);
    expect(navigation.querySelector('[aria-current="page"]')?.textContent).toContain('Calendário');

    const dashboard = [...navigation.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Dashboard')) as HTMLButtonElement;
    dashboard.click();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('closes the menu on an outside click without navigating away', () => {
    const fixture = TestBed.createComponent(SystemNavigation);
    fixture.componentRef.setInput('page', 'calendar');
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('button[aria-label="Navegação do sistema"]')
      .click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#system-navigation')).toBeTruthy();

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#system-navigation')).toBeNull();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('shows the employee area, calendar, and settings to EMPLOYEE profiles', () => {
    authService.currentUser.mockReturnValue({ classificacao: 'EMPLOYEE' });
    const fixture = TestBed.createComponent(SystemNavigation);
    fixture.componentRef.setInput('page', 'employee-area');
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('button[aria-label="Navegação do sistema"]')
      .click();
    fixture.detectChanges();

    const navigation = fixture.nativeElement.querySelector(
      'nav[aria-label="Navegação principal"]',
    ) as HTMLElement;
    expect(navigation.classList.contains('employee-navigation-menu')).toBe(true);
    expect(navigation.textContent).toContain('Área do colaborador');
    expect(navigation.textContent).toContain('Calendário');
    expect(navigation.textContent).toContain('Configurações');
    expect(navigation.textContent).not.toContain('Dashboard');
    expect(navigation.querySelectorAll('li')).toHaveLength(3);
  });
});
