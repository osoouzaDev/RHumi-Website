import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiUser, AuthService } from '../services/auth.service';
import { NavigationOrb } from '../shared/navigation-orb';

interface UserPreferences {
  emailNotifications: boolean;
  weeklySummary: boolean;
}

@Component({
  selector: 'app-settings',
  imports: [FormsModule, NavigationOrb, RouterLink],
  templateUrl: './settings.html',
})
export class Settings implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly router = inject(Router);
  protected readonly navigationOpen = signal(false);
  protected readonly loading = signal(true);
  protected readonly savingProfile = signal(false);
  protected readonly error = signal('');
  protected readonly profileError = signal('');
  protected readonly profileMessage = signal('');
  protected readonly preferenceMessage = signal('');
  protected readonly employee = signal<ApiUser | null>(null);
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  protected readonly preferences = signal<UserPreferences>(this.readPreferences());
  protected readonly navigationItems = [
    { label: 'Dashboard', route: '/dashboard' },
    { label: 'Funcionários', route: '/funcionarios' },
    { label: 'Empresa', route: '/empresa' },
    { label: 'Jornada', route: '/jornada' },
    { label: 'Calendário', route: '/calendario' },
    { label: 'Recrutamento', route: '/recrutamento' },
    { label: 'Área do colaborador', route: '/area-colaborador' },
    { label: 'Configurações', route: '/configuracoes' },
  ];

  ngOnInit(): void {
    void this.loadProfile();
  }

  protected async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const userId = this.authService.currentUser()?.id;
      const profile = (await this.authService.listarUsuariosAtivos()).find((user) => user.id === userId) ?? null;
      this.employee.set(profile);
      this.name.set(profile?.nome ?? '');
      this.email.set(profile?.email ?? '');
      this.phone.set(profile?.telefone ?? '');
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível carregar suas configurações.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async logout(): Promise<void> {
    try {
      await this.authService.logout();
    } catch {
      this.navigationOpen.set(false);
    }
    await this.router.navigateByUrl('/');
  }

  protected toggleNavigation(): void {
    this.navigationOpen.update((open) => !open);
  }

  protected navigateTo(route: string): void {
    this.navigationOpen.set(false);
    void this.router.navigateByUrl(route);
  }

  protected async saveProfile(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const profile = this.employee();
    if (!profile || this.savingProfile()) return;
    this.savingProfile.set(true);
    this.profileError.set('');
    this.profileMessage.set('');
    try {
      const updated = await this.authService.atualizarUsuario(profile.id, {
        nome: this.name().trim(),
        email: this.email().trim(),
        telefone: this.phone().trim() || null,
      });
      this.employee.set(updated);
      this.name.set(updated.nome);
      this.email.set(updated.email);
      this.phone.set(updated.telefone ?? '');
      this.profileMessage.set('Seus dados foram atualizados.');
    } catch (error: unknown) {
      this.profileError.set(error instanceof Error ? error.message : 'Não foi possível salvar seus dados.');
    } finally {
      this.savingProfile.set(false);
    }
  }

  protected updatePreference(key: keyof UserPreferences, value: boolean): void {
    this.preferences.update((preferences) => ({ ...preferences, [key]: value }));
    this.preferenceMessage.set('');
  }

  protected savePreferences(): void {
    localStorage.setItem('rhumi_user_preferences', JSON.stringify(this.preferences()));
    this.preferenceMessage.set('Preferências salvas neste navegador.');
  }

  private readPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem('rhumi_user_preferences');
      return stored ? { ...this.defaultPreferences(), ...JSON.parse(stored) } : this.defaultPreferences();
    } catch {
      return this.defaultPreferences();
    }
  }

  private defaultPreferences(): UserPreferences {
    return { emailNotifications: true, weeklySummary: false };
  }
}
