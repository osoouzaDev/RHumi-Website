import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NavigationOrb } from '../shared/navigation-orb';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  category: string;
}

interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
}

@Component({
  selector: 'app-calendar',
  imports: [FormsModule, NavigationOrb],
  templateUrl: './calendar.html',
})
export class Calendar {
  protected readonly router = inject(Router);
  protected readonly authService = inject(AuthService);
  protected readonly navigationOpen = signal(false);
  protected readonly events = signal<CalendarEvent[]>(this.readEvents());
  protected readonly currentMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  protected readonly selectedDate = signal(this.toDateKey(new Date()));
  protected readonly showEventForm = signal(false);
  protected readonly title = signal('');
  protected readonly time = signal('09:00');
  protected readonly category = signal('Equipe');
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
  protected readonly monthLabel = computed(() =>
    this.currentMonth().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  );
  protected readonly calendarDays = computed<CalendarDay[]>(() => {
    const month = this.currentMonth();
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cellCount = Math.ceil((offset + totalDays) / 7) * 7;
    return Array.from({ length: cellCount }, (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index - offset + 1);
      return {
        date: this.toDateKey(date),
        day: date.getDate(),
        inMonth: date.getMonth() === month.getMonth(),
      };
    });
  });
  protected readonly selectedEvents = computed(() =>
    this.events()
      .filter((event) => event.date === this.selectedDate())
      .sort((a, b) => a.time.localeCompare(b.time)),
  );
  protected readonly eventCount = computed(() =>
    this.events().filter((event) => event.date.startsWith(this.toMonthKey(this.currentMonth()))).length,
  );

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

  protected shiftMonth(amount: number): void {
    this.currentMonth.update((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1));
  }

  protected selectDate(date: string): void {
    this.selectedDate.set(date);
    this.showEventForm.set(false);
  }

  protected hasEvent(date: string): boolean {
    return this.events().some((event) => event.date === date);
  }

  protected openEventForm(): void {
    this.title.set('');
    this.showEventForm.set(true);
  }

  protected addEvent(event: SubmitEvent): void {
    event.preventDefault();
    const title = this.title().trim();
    if (!title) return;
    const next = [...this.events(), {
      id: crypto.randomUUID(),
      title,
      date: this.selectedDate(),
      time: this.time(),
      category: this.category(),
    }];
    this.events.set(next);
    this.persistEvents(next);
    this.showEventForm.set(false);
    this.title.set('');
  }

  protected removeEvent(id: string): void {
    const next = this.events().filter((event) => event.id !== id);
    this.events.set(next);
    this.persistEvents(next);
  }

  protected formatSelectedDate(): string {
    const [year, month, day] = this.selectedDate().split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }

  protected isToday(date: string): boolean {
    return date === this.toDateKey(new Date());
  }

  private toMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private toDateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private readEvents(): CalendarEvent[] {
    try {
      const stored = localStorage.getItem('rhumi_calendar_events');
      return stored ? JSON.parse(stored) as CalendarEvent[] : [];
    } catch {
      return [];
    }
  }

  private persistEvents(events: CalendarEvent[]): void {
    localStorage.setItem('rhumi_calendar_events', JSON.stringify(events));
  }
}
