import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { LearningItem, LearningService } from '../services/learning.service';
import { EmployeeArea } from './employee-area';

describe('EmployeeArea PDF training materials', () => {
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
});
