import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService, ApiUser } from '../services/auth.service';
import { LearningEmployeePerformance, LearningService } from '../services/learning.service';
import { Dashboard } from './dashboard';

describe('Dashboard performance', () => {
  const employees: ApiUser[] = [];
  const performance: LearningEmployeePerformance[] = [
    {
      id_usuario: 'employee-1',
      nome: 'Maria Souza',
      email: 'maria@example.com',
      cargo: 'Analista',
      setor: 'Pessoas',
      total_respostas: 2,
      total_treinamentos: 1,
      total_avaliacoes: 1,
      media_percentual: 90,
      resultados: [
        {
          id: 'attempt-1',
          id_conteudo: 'training-1',
          titulo: 'Integração',
          tipo: 'TREINAMENTO',
          acertos: 5,
          total_perguntas: 5,
          percentual: 100,
          entregue_em: '2026-11-15T12:00:00.000Z',
          nota_minima: 80,
          aprovado: true,
        },
        {
          id: 'attempt-2',
          id_conteudo: 'assessment-1',
          titulo: 'Segurança',
          tipo: 'AVALIACAO',
          acertos: 4,
          total_perguntas: 5,
          percentual: 80,
          entregue_em: '2026-11-14T12:00:00.000Z',
          nota_minima: null,
          aprovado: null,
        },
      ],
    },
    {
      id_usuario: 'employee-2',
      nome: 'João Lima',
      email: 'joao@example.com',
      cargo: 'Assistente',
      setor: 'Pessoas',
      total_respostas: 1,
      total_treinamentos: 0,
      total_avaliacoes: 1,
      media_percentual: 40,
      resultados: [
        {
          id: 'attempt-3',
          id_conteudo: 'assessment-2',
          titulo: 'Comunicação',
          tipo: 'AVALIACAO',
          acertos: 2,
          total_perguntas: 5,
          percentual: 40,
          entregue_em: '2026-11-13T12:00:00.000Z',
          nota_minima: null,
          aprovado: null,
        },
      ],
    },
  ];

  const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
  const authService = {
    listarUsuariosAtivos: vi.fn().mockResolvedValue(employees),
    currentUser: vi.fn().mockReturnValue(null),
    logout: vi.fn().mockResolvedValue(undefined),
  };
  const learningService = {
    listarDesempenho: vi.fn().mockResolvedValue(performance),
  };

  beforeEach(() => {
    authService.listarUsuariosAtivos.mockClear().mockResolvedValue(employees);
    learningService.listarDesempenho.mockClear().mockResolvedValue(performance);
    TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
        { provide: LearningService, useValue: learningService },
      ],
    });
  });

  it('loads submitted training and assessment results into the performance dashboard', async () => {
    const fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance['loading']()).toBe(false));
    fixture.detectChanges();

    expect(learningService.listarDesempenho).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.textContent).toContain('Maria Souza');
    expect(fixture.nativeElement.textContent).toContain('Integração');

    fixture.componentInstance['setTab']('performance');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Top performers');
    expect(fixture.nativeElement.textContent).toContain('90%');
    expect(fixture.nativeElement.textContent).toContain('Segurança');
    expect(fixture.nativeElement.textContent).toContain('Treinamentos realizados');
    expect(fixture.nativeElement.textContent).toContain('Treinamentos: Integração');

    fixture.componentInstance['selectEmployee']('employee-2');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Nenhuma prova de treinamento respondida');
  });
});
