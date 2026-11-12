import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NavigationPage } from './navigation-orb';
import { SystemNavigation } from './system-navigation';

describe('SystemNavigation', () => {
  const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
  const authService = { logout: vi.fn().mockResolvedValue(undefined) };

  beforeEach(() => {
    router.navigateByUrl.mockClear();
    authService.logout.mockClear();
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
      'employee-area',
      'settings',
    ];

    for (const page of pages) {
      fixture.componentRef.setInput('page', page);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector(`[data-page="${page}"]`)).toBeTruthy();
    }
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
    expect(navigation.querySelector('[aria-current="page"]')?.textContent).toContain('Calendário');

    const dashboard = [...navigation.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Dashboard')) as HTMLButtonElement;
    dashboard.click();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });
});
