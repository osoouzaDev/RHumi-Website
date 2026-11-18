import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { LearningItem, LearningService } from '../services/learning.service';
import { EmployeeArea } from './employee-area';

describe('EmployeeArea learning experience', () => {
  const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
  const authService = {
    currentUser: vi.fn().mockReturnValue({ id: 'employee-1', classificacao: 'EMPLOYEE' }),
    listarUsuariosAtivos: vi.fn().mockResolvedValue([]),
    logout: vi.fn().mockResolvedValue(undefined),
  };
  const learningService = {
    listar: vi.fn().mockResolvedValue([]),
    baixarPdf: vi.fn().mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' })),
  };
  const pdfTraining: LearningItem = {
    id: 'training-1',
    tipo: 'TREINAMENTO',
    titulo: 'Manual de segurança',
    descricao: null,
    tipo_material: 'PDF',
    url_material: null,
    tem_pdf: true,
    ativo: true,
    setores: [],
    perguntas: [],
    prova: null,
    created_at: '2026-11-16T12:00:00.000Z',
    updated_at: '2026-11-16T12:00:00.000Z',
  };

  beforeEach(() => {
    authService.currentUser.mockReturnValue({ id: 'employee-1', classificacao: 'EMPLOYEE' });
    authService.listarUsuariosAtivos.mockReset().mockResolvedValue([]);
    learningService.listar.mockReset().mockResolvedValue([]);
    learningService.baixarPdf.mockReset().mockResolvedValue(
      new Blob(['%PDF'], { type: 'application/pdf' }),
    );
    TestBed.configureTestingModule({
      imports: [EmployeeArea],
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthService, useValue: authService },
        { provide: LearningService, useValue: learningService },
      ],
    });
  });

  it('opens a PDF link in a new tab instead of embedding it', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const fixture = TestBed.createComponent(EmployeeArea);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance['learningLoading']()).toBe(false));

    await fixture.componentInstance['openTraining']({
      ...pdfTraining,
      url_material: 'https://example.com/manual.pdf',
      tem_pdf: false,
    });

    expect(open).toHaveBeenCalledWith(
      'https://example.com/manual.pdf',
      '_blank',
      'noopener,noreferrer',
    );
    expect(learningService.baixarPdf).not.toHaveBeenCalled();
    expect(fixture.componentInstance['resourceFrame']()).toBeNull();
    expect(fixture.componentInstance['selectedContentId']()).toBeNull();
  });

  it('loads an attached PDF into the in-app viewer', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:attached-pdf');
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const fixture = TestBed.createComponent(EmployeeArea);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance['learningLoading']()).toBe(false));

    await fixture.componentInstance['openTraining'](pdfTraining);

    expect(learningService.baixarPdf).toHaveBeenCalledWith('training-1');
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(fixture.componentInstance['resourceOpenUrl']()).toBe('blob:attached-pdf');
    expect(fixture.componentInstance['resourceFrame']()).not.toBeNull();
    expect(open).not.toHaveBeenCalled();
  });

  it('separates learning tabs and tracks answered assessments', async () => {
    const assessment: LearningItem = {
      ...pdfTraining,
      id: 'assessment-1',
      tipo: 'AVALIACAO',
      tipo_material: null,
      tem_pdf: false,
      perguntas: [{
        id: 'question-1',
        texto: 'Qual prática protege os dados?',
        alternativas: [
          { id: 'alternative-1', texto: 'Usar senhas fortes' },
          { id: 'alternative-2', texto: 'Compartilhar credenciais' },
        ],
      }, {
        id: 'question-2',
        texto: 'Quando atualizar a senha?',
        alternativas: [
          { id: 'alternative-3', texto: 'Periodicamente' },
          { id: 'alternative-4', texto: 'Nunca' },
        ],
      }],
      tentada: true,
      resultado: {
        acertos: 1,
        total_perguntas: 1,
        entregue_em: '2026-11-16T12:00:00.000Z',
        percentual: 100,
        nota_minima: null,
        aprovado: null,
      },
    };
    learningService.listar.mockResolvedValue([pdfTraining, assessment]);
    const fixture = TestBed.createComponent(EmployeeArea);
    fixture.detectChanges();
    await vi.waitFor(() => expect(fixture.componentInstance['learningLoading']()).toBe(false));

    expect(fixture.componentInstance['visibleTrainings']()).toHaveLength(1);
    expect(fixture.componentInstance['visibleAssessments']()).toHaveLength(0);
    expect(fixture.componentInstance['assessmentCompletion']()).toBe(100);
    expect(fixture.componentInstance['assessmentProgress'](assessment)).toBe(0);

    fixture.componentInstance['setAssessmentAnswer']('question-1', 'alternative-1');
    expect(fixture.componentInstance['answeredQuestionCount'](assessment)).toBe(1);
    expect(fixture.componentInstance['assessmentProgress'](assessment)).toBe(50);
    fixture.componentInstance['setAssessmentQuestion'](assessment, 1);
    expect(fixture.componentInstance['activeQuestionIndex']()).toBe(1);
    fixture.componentInstance['setAssessmentQuestion'](assessment, 5);
    expect(fixture.componentInstance['activeQuestionIndex']()).toBe(1);
    fixture.componentInstance['setAssessmentAnswer']('question-2', 'alternative-3');
    expect(fixture.componentInstance['assessmentProgress'](assessment)).toBe(100);

    fixture.componentInstance['setLearningTab']('AVALIACAO');

    expect(fixture.componentInstance['visibleTrainings']()).toHaveLength(0);
    expect(fixture.componentInstance['visibleAssessments']()).toHaveLength(1);

    fixture.componentInstance['selectLearningContent'](assessment);
    expect(fixture.componentInstance['assessmentViewMode']()).toBe('STEP');
    fixture.componentInstance['assessmentViewMode'].set('ALL');
    expect(fixture.componentInstance['assessmentAnswers']()['question-1']).toBe('alternative-1');
    fixture.componentInstance['assessmentViewMode'].set('STEP');
    expect(fixture.componentInstance['assessmentAnswers']()['question-2']).toBe('alternative-3');
  });
});
