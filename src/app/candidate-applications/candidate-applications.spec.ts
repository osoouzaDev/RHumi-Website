import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CandidateApplications } from './candidate-applications';

describe('CandidateApplications', () => {
  const mockAuthService = {
    listarMinhasCandidaturas: vi.fn(),
    logout: vi.fn(),
  };

  beforeEach(async () => {
    mockAuthService.listarMinhasCandidaturas.mockResolvedValue([]);
    mockAuthService.logout.mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [CandidateApplications],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('logs the candidate out and returns them to public vacancies', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(CandidateApplications);
    fixture.detectChanges();
    await fixture.whenStable();

    const button = [...fixture.nativeElement.querySelectorAll('button')]
      .find((item) => item.textContent.trim() === 'Sair') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();

    expect(mockAuthService.logout).toHaveBeenCalledOnce();
    expect(navigateSpy).toHaveBeenCalledWith('/vagas');
  });

  it('reports when the server could not be notified during logout', async () => {
    mockAuthService.logout.mockRejectedValueOnce(new Error('API indisponível'));
    const fixture = TestBed.createComponent(CandidateApplications);
    fixture.detectChanges();
    await fixture.whenStable();

    const button = [...fixture.nativeElement.querySelectorAll('button')]
      .find((item) => item.textContent.trim() === 'Sair') as HTMLButtonElement;
    button.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Sua sessão foi encerrada neste dispositivo, mas não foi possível notificar o servidor.'
    );
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });
});
