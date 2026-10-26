import { TestBed } from '@angular/core/testing';
import { Login } from './login';

describe('Login', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
    })
      .compileComponents();
  });

  it('should render the login screen', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Bem vindo ao RHumi');
    expect(compiled.querySelector('input[type="email"]')).toBeTruthy();
  });

  it('should render the gooey blob with reduced-motion support', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('svg filter#goo')).toBeTruthy();
    expect(compiled.querySelectorAll('[class*="motion-reduce:animate-none"]').length).toBe(6);
    expect(compiled.querySelectorAll('[class*="animate-particle-"]').length).toBe(5);
  });

  it('should explain when code login is not configured', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('[data-node-id="259:28"]').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('Acesso por código ainda não está configurado.');
  });

  it('should explain when authentication is not configured', async () => {
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('Autenticação por e-mail ainda não está configurada.');
  });
});
