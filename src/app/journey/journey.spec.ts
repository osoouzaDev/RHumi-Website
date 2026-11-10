import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Journey } from './journey';
import { ApiEmployeeJourney, AuthService } from '../services/auth.service';

describe('Journey', () => {
  function createJourney(): ApiEmployeeJourney {
    return {
      employee: {
        id: 'employee-1',
        login: 'ana@example.com',
        nome: 'Ana Silva',
        email: 'ana@example.com',
        classificacao: 'EMPLOYEE',
        ativo: true,
        data_criacao: '2026-03-09T12:00:00.000Z',
        data_atualizacao: '2026-03-09T12:00:00.000Z',
        data_admissao: '2026-03-09',
      },
      stages: [
        {
          key: 'pre-boarding',
          title: 'Pré-boarding',
          description: 'Preparação antes do primeiro dia',
          indicator: {
            type: 'boolean' as const,
            title: 'Tudo pronto antes do D1?',
            description: 'Preparativos concluídos',
          },
          tasks: [
            {
              key: 'documentos-admissionais-enviados',
              title: 'Documentos admissionais enviados',
              concluida: false,
              concluida_em: null,
            },
          ],
        },
      ],
    };
  }

  it('should display an admission date-only value without shifting its calendar day', async () => {
    const authService = {
      listarJornadas: vi.fn().mockResolvedValue([createJourney()]),
    };

    await TestBed.configureTestingModule({
      imports: [Journey],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: { navigateByUrl: vi.fn(), navigate: vi.fn() } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Journey);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('09/03/2026');
  });

  it('should save checklist changes and display them after reloading the journey', async () => {
    const storedJourney = createJourney();
    const authService = {
      listarJornadas: vi.fn().mockImplementation(async () => structuredClone([storedJourney])),
      atualizarTarefaJornada: vi.fn().mockImplementation(
        async (_employeeId: string, _stageKey: string, _taskKey: string, concluida: boolean) => {
          storedJourney.stages[0].tasks[0].concluida = concluida;
          storedJourney.stages[0].tasks[0].concluida_em = concluida ? '2026-03-09T17:04:00.000Z' : null;
          return storedJourney.stages[0].tasks[0].concluida_em;
        },
      ),
      reabrirEtapaJornada: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Journey],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: { navigateByUrl: vi.fn(), navigate: vi.fn() } },
      ],
    }).compileComponents();

    const firstFixture = TestBed.createComponent(Journey);
    firstFixture.detectChanges();
    await firstFixture.whenStable();
    firstFixture.detectChanges();

    const uncheckedTask = firstFixture.nativeElement.querySelector(
      'section[aria-label="Etapas da jornada"] button[aria-pressed="false"]',
    ) as HTMLButtonElement;
    uncheckedTask.click();
    await firstFixture.whenStable();
    firstFixture.detectChanges();

    expect(authService.atualizarTarefaJornada).toHaveBeenCalledWith(
      'employee-1',
      'pre-boarding',
      'documentos-admissionais-enviados',
      true,
    );
    expect(
      firstFixture.nativeElement.querySelector(
        'section[aria-label="Etapas da jornada"] button[aria-pressed="true"]',
      ),
    ).not.toBeNull();

    firstFixture.destroy();
    const reloadedFixture = TestBed.createComponent(Journey);
    reloadedFixture.detectChanges();
    await reloadedFixture.whenStable();
    reloadedFixture.detectChanges();
    const collapsedStage = reloadedFixture.nativeElement.querySelector(
      'section[aria-label="Etapas da jornada"] button[aria-expanded="false"]',
    ) as HTMLButtonElement;
    collapsedStage.click();
    reloadedFixture.detectChanges();

    expect(authService.listarJornadas).toHaveBeenCalledTimes(2);
    expect(
      reloadedFixture.nativeElement.querySelector(
        'section[aria-label="Etapas da jornada"] button[aria-pressed="true"]',
      ),
    ).not.toBeNull();
  });
});
