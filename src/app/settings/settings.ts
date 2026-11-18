import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiUser, AuthService } from '../services/auth.service';
import { SystemNavigation } from '../shared/system-navigation';

type ThemePreference = 'light' | 'dark' | 'device';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, SystemNavigation],
  templateUrl: './settings.html',
})
export class Settings implements OnInit, OnDestroy {
  protected readonly authService = inject(AuthService);
  protected readonly loading = signal(true);
  protected readonly savingProfile = signal(false);
  protected readonly error = signal('');
  protected readonly profileError = signal('');
  protected readonly profileMessage = signal('');
  protected readonly themePreference = signal<ThemePreference>(this.readTheme());
  protected readonly themeMessage = signal('');
  protected readonly isEmployee = computed(() =>
    this.authService.currentUser()?.classificacao.trim().toUpperCase() === 'EMPLOYEE',
  );
  protected readonly employee = signal<ApiUser | null>(null);
  protected readonly name = signal('');
  protected readonly email = signal('');
  protected readonly phone = signal('');
  private readonly deviceMedia = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly deviceThemeListener = () => {
    if (this.themePreference() === 'device') this.applyTheme();
  };

  ngOnInit(): void {
    this.applyTheme();
    this.deviceMedia.addEventListener('change', this.deviceThemeListener);
    void this.loadProfile();
  }

  ngOnDestroy(): void {
    this.deviceMedia.removeEventListener('change', this.deviceThemeListener);
  }

  protected async loadProfile(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const userId = this.authService.currentUser()?.id;
      const profile = userId ? await this.authService.buscarUsuario(userId) : null;
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

  protected setTheme(theme: ThemePreference): void {
    this.themePreference.set(theme);
    localStorage.setItem('rhumi_theme', theme);
    this.applyTheme();
    this.themeMessage.set('Tema aplicado neste dispositivo.');
  }

  private readTheme(): ThemePreference {
    const stored = localStorage.getItem('rhumi_theme');
    return stored === 'light' || stored === 'dark' || stored === 'device'
      ? stored
      : 'device';
  }

  private applyTheme(): void {
    const resolved = this.themePreference() === 'device'
      ? (this.deviceMedia.matches ? 'dark' : 'light')
      : this.themePreference();
    document.documentElement.dataset['theme'] = resolved;
    document.documentElement.style.colorScheme = resolved;
  }
}
