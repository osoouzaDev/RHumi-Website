import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Journey } from './journey';
import { AuthService } from '../services/auth.service';

describe('Journey', () => {
  it('should display an admission date-only value without shifting its calendar day', async () => {
    const authService = {
      listarUsuariosAtivos: vi.fn().mockResolvedValue([
        {
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
      ]),
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
});
