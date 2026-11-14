import { Component, computed, ElementRef, HostListener, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NavigationOrb, NavigationPage } from './navigation-orb';

interface NavigationItem {
  label: string;
  page: NavigationPage;
  route: string;
}

@Component({
  selector: 'app-system-navigation',
  host: { class: 'contents' },
  imports: [NavigationOrb],
  templateUrl: './system-navigation.html',
})
export class SystemNavigation {
  readonly page = input.required<NavigationPage>();
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  protected readonly router = inject(Router);
  protected readonly authService = inject(AuthService);
  protected readonly navigationOpen = signal(false);
  private readonly allNavigationItems: NavigationItem[] = [
    { label: 'Dashboard', page: 'dashboard', route: '/dashboard' },
    { label: 'Funcionários', page: 'employees', route: '/funcionarios' },
    { label: 'Empresa', page: 'company', route: '/empresa' },
    { label: 'Jornada', page: 'journey', route: '/jornada' },
    { label: 'Calendário', page: 'calendar', route: '/calendario' },
    { label: 'Recrutamento', page: 'recruitment', route: '/recrutamento/candidatos' },
    { label: 'Treinamentos e avaliações', page: 'learning', route: '/treinamentos-avaliacoes' },
    { label: 'Área do colaborador', page: 'employee-area', route: '/area-colaborador' },
    { label: 'Configurações', page: 'settings', route: '/configuracoes' },
  ];
  protected readonly navigationItems = computed(() => {
    const isEmployee =
      this.authService.currentUser()?.classificacao.trim().toUpperCase() === 'EMPLOYEE';
    const canManageLearning = ['sakai', 'admin', 'hr_admin', 'supervisor'].includes(
      this.authService.currentUser()?.classificacao.trim().toLowerCase() ?? '',
    );
    return this.allNavigationItems.filter((item) =>
      isEmployee
        ? item.page === 'employee-area'
        : item.page !== 'learning' || canManageLearning,
    );
  });

  protected toggleNavigation(): void {
    this.navigationOpen.update((open) => !open);
  }

  @HostListener('document:click', ['$event'])
  protected closeOnOutsideClick(event: MouseEvent): void {
    if (!this.navigationOpen() || !(event.target instanceof Node)) return;
    const target = event.target;
    const menu = this.elementRef.nativeElement.querySelector('#system-navigation');
    const trigger = this.elementRef.nativeElement.querySelector('app-navigation-orb');
    if (!menu?.contains(target) && !trigger?.contains(target)) {
      this.navigationOpen.set(false);
    }
  }

  protected navigateTo(route: string): void {
    this.navigationOpen.set(false);
    void this.router.navigateByUrl(route);
  }

  protected async logout(): Promise<void> {
    try {
      await this.authService.logout();
    } catch {
      this.navigationOpen.set(false);
    }

    await this.router.navigateByUrl('/');
  }
}
