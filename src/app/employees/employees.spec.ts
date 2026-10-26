import { TestBed } from '@angular/core/testing';
import { Employees } from './employees';

describe('Employees', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Employees],
    })
      .compileComponents();
  });

  it('should render one card per employee', async () => {
    const fixture = TestBed.createComponent(Employees);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('section[aria-label="Lista de funcionários"] article').length).toBe(6);
  });

  it('should show the summary counters', async () => {
    const fixture = TestBed.createComponent(Employees);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Mostrando 6 de 6 funcionários');
    expect(compiled.textContent).toContain('Setores representados');
  });
});
