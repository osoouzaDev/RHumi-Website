import { Component, HostListener, input, output, signal } from '@angular/core';

export type NavigationPage = 'dashboard' | 'employees' | 'company' | 'journey' | 'calendar' | 'recruitment' | 'employee-area' | 'settings';

@Component({
  selector: 'app-navigation-orb',
  host: { class: 'block' },
  template: `
    <button
      class="flex size-[60px] cursor-pointer items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(180deg,#1d108f_0%,#4841a0_25%,#8b87c3_50%,#4841a0_75%,#1d108f_100%)] [background-size:100%_200%] text-white shadow-[0_12px_36px_rgba(57,43,170,0.38)] transition-all duration-300 hover:scale-[1.04] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a99bff] animate-circle-gradient"
      [class.-translate-y-[50px]]="scrolled()"
      type="button"
      aria-label="Navegação do sistema"
      [attr.aria-expanded]="expanded()"
      aria-controls="system-navigation"
      (click)="toggle.emit()"
    >
      <span class="flex items-center justify-center transition-opacity duration-200" [class.opacity-0]="scrolled()" [attr.data-page]="page()" aria-hidden="true">
        @switch (page()) {
          @case ('dashboard') {
            <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" /><rect x="13" y="10" width="8" height="11" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /></svg>
          }
          @case ('employees') {
            <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="4" /><path d="M2 21v-1a7 7 0 0 1 14 0v1M16 4a4 4 0 0 1 0 8M18 15a6 6 0 0 1 4 5v1" /></svg>
          }
          @case ('company') {
            <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" /><path d="M8 9v.01M8 12v.01M8 15v.01M8 18v.01M16 13v.01M16 16v.01M16 19v.01" /></svg>
          }
          @case ('journey') {
            <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2M5 4l-2 2M19 4l2 2" /></svg>
          }
          @case ('calendar') {
            <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
          }
          @case ('recruitment') {
            <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></svg>
          }
          @case ('employee-area') {
            <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0 1 16 0v1" /></svg>
          }
          @case ('settings') {
            <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /><circle cx="12" cy="12" r="3" /></svg>
          }
        }
      </span>
    </button>
  `,
})
export class NavigationOrb {
  readonly page = input.required<NavigationPage>();
  readonly expanded = input(false);
  readonly toggle = output<void>();
  protected readonly scrolled = signal(false);

  @HostListener('window:scroll')
  protected updateScrollState(): void {
    this.scrolled.set(window.scrollY > 24);
  }
}
