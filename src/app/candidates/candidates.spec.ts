import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService, CandidateApplication } from '../services/auth.service';
import { Candidates } from './candidates';

describe('Candidates', () => {
  const router = {
    url: '/recrutamento/candidatos',
    navigateByUrl: vi.fn().mockResolvedValue(true),
  };
  const application: CandidateApplication = {
    id: 'application-1',
    id_candidato: 'candidate-1',
    nome: 'Ana Souza',
    email: 'ana@example.com',
    telefone: null,
    id_vaga: 'vacancy-1',
    vaga_titulo: 'Analista de RH',
    status: 'NOVA',
    created_at: '2026-11-10T12:00:00.000Z',
  };
  const authService = {
    listarCandidaturasRecrutamento: vi.fn().mockResolvedValue([application]),
    atualizarStatusCandidatura: vi.fn().mockResolvedValue({ ...application, status: 'CONTRATADA' }),
  };

  beforeEach(() => {
    router.navigateByUrl.mockClear();
    authService.listarCandidaturasRecrutamento.mockReset().mockResolvedValue([application]);
    authService.atualizarStatusCandidatura.mockReset()
      .mockResolvedValue({ ...application, status: 'CONTRATADA' });
    TestBed.configureTestingModule({
      imports: [Candidates],
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  it('loads candidate applications from the API and saves status changes', async () => {
    const fixture = TestBed.createComponent(Candidates);
    fixture.detectChanges();
    await fixture.componentInstance['loadCandidates']();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ana Souza');
    expect(fixture.nativeElement.textContent).toContain('Aguardando');

    const component = fixture.componentInstance;
    await component['updateStatus'](component['candidates']()[0], 'Aprovado');
    fixture.detectChanges();

    expect(authService.atualizarStatusCandidatura).toHaveBeenCalledWith('application-1', 'CONTRATADA');
    expect(fixture.nativeElement.textContent).toContain('Aprovado');
  });

  it('does not offer manual resume creation to administrators', async () => {
    const fixture = TestBed.createComponent(Candidates);
    fixture.detectChanges();
    await fixture.componentInstance['loadCandidates']();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Novo currículo');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('select')).toHaveLength(2);
  });
});
