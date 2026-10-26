import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Login } from './login';
import { AuthService } from '../services/auth.service';

describe('Login', () => {
  let mockAuthService: {
    loginComEmail: ReturnType<typeof vi.fn>;
    loginComCodigo: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
  };

  let mockRouter: {
    navigate: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockAuthService = {
      loginComEmail: vi.fn(),
      loginComCodigo: vi.fn(),
      isAuthenticated: vi.fn().mockReturnValue(false),
    };

    mockRouter = {
      navigate: vi.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();
  });

  it('should render the login screen with email and password fields', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('Bem-vindo de volta');
    expect(compiled.querySelector('input[type="email"]')).toBeTruthy();
    expect(compiled.querySelector('input[type="password"]')).toBeTruthy();
  });

  it('should render an empty email field without a focus ring around the inputs', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const emailInput = compiled.querySelector('input[type="email"]') as HTMLInputElement;
    const inputs = compiled.querySelectorAll('input');

    expect(emailInput.value).toBe('');
    expect(compiled.textContent).not.toContain('souzaluis.dev@gmail.com');
    inputs.forEach((input) => {
      expect(input.className).toContain('focus-visible:ring-0');
      expect(input.className).not.toContain('focus-visible:ring-2');
    });
  });

  it('should render the centered circle above the minimal login form', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const circle = compiled.querySelector('main > div[aria-hidden="true"]');

    expect(circle).toBeTruthy();
    expect(circle?.className).toContain('size-[100px]');
    expect(circle?.className).toContain('linear-gradient(180deg');
    expect(circle?.className).toContain('animate-circle-gradient');
    expect(circle?.className).not.toContain('motion-reduce:animate-none');
    expect(compiled.querySelector('h1')?.textContent).toContain('Bem-vindo de volta');
  });

  it('should toggle between email login and collaborator code login mode', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();

    // Clica no botão para alternar para modo Código do Colaborador
    const codeBtn = fixture.nativeElement.querySelector('button[role="tab"][aria-selected="false"]:last-child') as HTMLButtonElement;
    expect(codeBtn).toBeTruthy();
    codeBtn.click();
    await fixture.whenStable();

    // Verifica que o campo de código do colaborador é exibido
    const codeInput = fixture.nativeElement.querySelector('#codigo_colaborador');
    expect(codeInput).toBeTruthy();

    // Alterna de volta para e-mail e senha
    const backBtn = fixture.nativeElement.querySelector('button[role="tab"][aria-selected="false"]') as HTMLButtonElement;
    expect(backBtn?.textContent).toContain('E-mail');
    backBtn.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('input[type="email"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('input[type="password"]')).toBeTruthy();
  });

  it('should validate empty email and password submission', async () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    component['email'].set('');
    component['senha'].set('');
    await fixture.whenStable();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Por favor, informe seu e-mail e senha para continuar.'
    );
    expect(mockAuthService.loginComEmail).not.toHaveBeenCalled();
  });

  it('should validate empty collaborator code submission', async () => {
    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    component['loginMode'].set('code');
    component['codigoColaborador'].set('');
    await fixture.whenStable();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Informe o código do colaborador com exatamente 4 dígitos.'
    );
    expect(mockAuthService.loginComCodigo).not.toHaveBeenCalled();
  });

  it('should successfully authenticate with email and password and navigate', async () => {
    mockAuthService.loginComEmail.mockResolvedValue({
      access_token: 'fake-jwt-token',
      token_type: 'Bearer',
      expires_in: 1800,
    });

    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    component['email'].set('souzaluis.dev@gmail.com');
    component['senha'].set('senhaSegura123');
    await fixture.whenStable();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(mockAuthService.loginComEmail).toHaveBeenCalledWith(
      'souzaluis.dev@gmail.com',
      'senhaSegura123'
    );
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/funcionarios']);
  });

  it('should show error message when email authentication fails', async () => {
    mockAuthService.loginComEmail.mockRejectedValue(
      new Error('Credenciais inválidas.')
    );

    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    component['email'].set('souzaluis.dev@gmail.com');
    component['senha'].set('senhaErrada');
    await fixture.whenStable();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Credenciais inválidas.'
    );
  });

  it('should successfully authenticate with collaborator code and navigate', async () => {
    mockAuthService.loginComCodigo.mockResolvedValue({
      access_token: 'fake-jwt-colab-token',
      token_type: 'Bearer',
      expires_in: 1800,
    });

    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    component['loginMode'].set('code');
    component['codigoColaborador'].set('0042');
    await fixture.whenStable();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(mockAuthService.loginComCodigo).toHaveBeenCalledWith('0042');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/funcionarios']);
  });

  it('should show error message when collaborator code authentication fails', async () => {
    mockAuthService.loginComCodigo.mockRejectedValue(
      new Error('Código de colaborador inválido ou inexistente.')
    );

    const fixture = TestBed.createComponent(Login);
    const component = fixture.componentInstance;
    component['loginMode'].set('code');
    component['codigoColaborador'].set('abc');
    await fixture.whenStable();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Informe o código do colaborador com exatamente 4 dígitos.'
    );
    expect(mockAuthService.loginComCodigo).not.toHaveBeenCalled();
  });
});
