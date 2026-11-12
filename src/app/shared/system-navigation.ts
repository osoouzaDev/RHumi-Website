import { Component, inject, input, signal } from '@angular/core';
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
  protected readonly router = inject(Router);
  protected readonly authService = inject(AuthService);
  protected readonly navigationOpen = signal(false);
  protected readonly navigationItems: NavigationItem[] = [
    { label: 'Dashboard', page: 'dashboard', route: '/dashboard' },
    { label: 'Funcionários', page: 'employees', route: '/funcionarios' },
    { label: 'Empresa', page: 'company', route: '/empresa' },
    { label: 'Jornada', page: 'journey', route: '/jornada' },
    { label: 'Calendário', page: 'calendar', route: '/calendario' },
    { label: 'Recrutamento', page: 'recruitment', route: '/recrutamento' },
    { label: 'Área do colaborador', page: 'employee-area', route: '/area-colaborador' },
    { label: 'Configurações', page: 'settings', route: '/configuracoes' },
  ];

  protected toggleNavigation(): void {
    this.navigationOpen.update((open) => !open);
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
