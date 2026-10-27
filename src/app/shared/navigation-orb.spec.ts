import { TestBed } from '@angular/core/testing';
import { NavigationOrb, NavigationPage } from './navigation-orb';

describe('NavigationOrb', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [NavigationOrb] });
  });

  it('should render a 60px animated gradient button with the current page icon', () => {
    const fixture = TestBed.createComponent(NavigationOrb);
    fixture.componentRef.setInput('page', 'company' satisfies NavigationPage);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.className).toContain('size-[60px]');
    expect(button.className).toContain('linear-gradient(180deg');
    expect(button.className).toContain('animate-circle-gradient');
    expect(button.querySelector('[data-page="company"]')).toBeTruthy();
  });

  it('should emit toggle when clicked without replacing the page icon', () => {
    const fixture = TestBed.createComponent(NavigationOrb);
    fixture.componentRef.setInput('page', 'dashboard');
    fixture.detectChanges();
    const toggle = vi.fn();
    fixture.componentInstance.toggle.subscribe(toggle);

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();

    expect(toggle).toHaveBeenCalledOnce();
    expect(button.querySelector('[data-page="dashboard"]')).toBeTruthy();
  });

  it('should retract to the top while scrolling and restore at the page top', () => {
    const fixture = TestBed.createComponent(NavigationOrb);
    fixture.componentRef.setInput('page', 'company');
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 100 });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(button.className).toContain('-translate-y-[50px]');
    expect(button.querySelector('svg')?.parentElement?.className).toContain('opacity-0');

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    window.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(button.className).not.toContain('-translate-y-[50px]');
    expect(button.querySelector('svg')?.parentElement?.className).not.toContain('opacity-0');
  });
});
