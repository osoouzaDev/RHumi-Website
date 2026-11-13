import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService, RecruitmentVacancy } from '../services/auth.service';
import { Recruitment } from './recruitment';

describe('Recruitment', () => {
  const router = {
    url: '/recrutamento',
    navigateByUrl: vi.fn().mockResolvedValue(true),
  };
  const vacancy: RecruitmentVacancy = {
    id: 'vacancy-1',
    titulo: 'Analista de RH',
    setor: 'Pessoas',
    localidade: 'Remoto',
    tipo_contrato: 'CLT',
    descricao: null,
    status: 'ABERTA',
    created_at: '2026-11-10T12:00:00.000Z',
  };
  const authService = {
    listarVagasRecrutamento: vi.fn().mockResolvedValue([vacancy]),
    criarVagaRecrutamento: vi.fn().mockResolvedValue({ ...vacancy, id: 'vacancy-2' }),
    atualizarStatusVaga: vi.fn().mockResolvedValue({ ...vacancy, status: 'PAUSADA' }),
    logout: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    authService.listarVagasRecrutamento.mockReset().mockResolvedValue([vacancy]);
    authService.criarVagaRecrutamento.mockReset().mockResolvedValue({ ...vacancy, id: 'vacancy-2' });
    authService.atualizarStatusVaga.mockReset().mockResolvedValue({ ...vacancy, status: 'PAUSADA' });
    TestBed.configureTestingModule({
      imports: [Recruitment],
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  it('loads vacancies and persists vacancy status changes through the API', async () => {
    const fixture = TestBed.createComponent(Recruitment);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Analista de RH');
    expect(fixture.nativeElement.textContent).toContain('Vagas abertas');

    await fixture.componentInstance['toggleStatus'](fixture.componentInstance['vacancies']()[0]);
    fixture.detectChanges();

    expect(authService.atualizarStatusVaga).toHaveBeenCalledWith('vacancy-1', 'PAUSADA');
    expect(fixture.nativeElement.textContent).toContain('Pausadas');
  });

  it('creates a vacancy through the API', async () => {
    const fixture = TestBed.createComponent(Recruitment);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    fixture.componentInstance['title'].set('Analista de RH');
    fixture.componentInstance['department'].set('Pessoas');
    fixture.componentInstance['type'].set('CLT');
    await fixture.componentInstance['createVacancy'](new Event('submit') as SubmitEvent);
    fixture.detectChanges();

    expect(authService.criarVagaRecrutamento).toHaveBeenCalledWith({
      titulo: 'Analista de RH',
      setor: 'Pessoas',
      localidade: null,
      tipo_contrato: 'CLT',
      descricao: null,
    });
    expect(fixture.nativeElement.textContent).toContain('Vagas da empresa');
  });
});
