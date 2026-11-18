import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SystemNavigation } from '../shared/system-navigation';
import { AuthService } from '../services/auth.service';
import { CalendarEvent, CalendarScope, CalendarSector, CalendarService } from '../services/calendar.service';

interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
}

@Component({
  selector: 'app-calendar',
  imports: [FormsModule, SystemNavigation],
  templateUrl: './calendar.html',
})
export class Calendar implements OnInit {
  private readonly calendarService = inject(CalendarService);
  protected readonly authService = inject(AuthService);
  protected readonly events = signal<CalendarEvent[]>([]);
  protected readonly sectors = signal<CalendarSector[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly currentMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  protected readonly selectedDate = signal(this.toDateKey(new Date()));
  protected readonly showEventForm = signal(false);
  protected readonly title = signal('');
  protected readonly time = signal('09:00');
  protected readonly category = signal('Equipe');
  protected readonly scope = signal<CalendarScope>('PESSOAL');
  protected readonly sectorId = signal('');
  protected readonly isAdmin = computed(() =>
    ['sakai', 'admin', 'hr_admin'].includes(
      this.authService.currentUser()?.classificacao.trim().toLowerCase() ?? '',
    ),
  );
  protected readonly isSupervisor = computed(() =>
    ['supervisor', 'gestor'].includes(
      this.authService.currentUser()?.classificacao.trim().toLowerCase() ?? '',
    ),
  );
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
      .filter((event) => event.data === this.selectedDate())
      .sort((a, b) => a.horario.localeCompare(b.horario)),
  );
  protected readonly eventCount = computed(() =>
    this.events().filter((event) => event.data.startsWith(this.toMonthKey(this.currentMonth()))).length,
  );

  ngOnInit(): void {
    void this.loadCalendar();
  }

  protected async loadCalendar(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      if (this.isAdmin()) {
        const [events, sectors] = await Promise.all([
          this.calendarService.listar(),
          this.calendarService.listarSetores(),
        ]);
        this.events.set(events);
        this.sectors.set(sectors);
      } else {
        this.events.set(await this.calendarService.listar());
      }
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível carregar o calendário.');
    } finally {
      this.loading.set(false);
    }
  }

  protected shiftMonth(amount: number): void {
    this.currentMonth.update((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1));
  }

  protected selectDate(date: string): void {
    this.selectedDate.set(date);
    this.showEventForm.set(false);
  }

  protected hasEvent(date: string): boolean {
    return this.events().some((event) => event.data === date);
  }

  protected openEventForm(): void {
    this.title.set('');
    this.scope.set('PESSOAL');
    this.sectorId.set('');
    this.showEventForm.set(true);
  }

  protected async addEvent(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const title = this.title().trim();
    if (!title || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const created = await this.calendarService.criar({
        titulo: title,
        data: this.selectedDate(),
        horario: this.time(),
        categoria: this.category(),
        escopo: this.scope(),
        ...(this.scope() === 'SETOR' && this.isAdmin() ? { id_setor: this.sectorId() } : {}),
      });
      this.events.update((events) => [...events, created]);
      this.showEventForm.set(false);
      this.title.set('');
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível salvar o evento.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async removeEvent(id: string): Promise<void> {
    this.error.set('');
    try {
      await this.calendarService.excluir(id);
      this.events.update((events) => events.filter((event) => event.id !== id));
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível remover o evento.');
    }
  }

  protected canRemove(event: CalendarEvent): boolean {
    return event.id_criador === this.authService.currentUser()?.id;
  }

  protected eventScopeLabel(event: CalendarEvent): string {
    if (event.escopo === 'SETOR') return `Setor: ${event.nome_setor ?? 'não informado'}`;
    if (event.escopo === 'EMPRESA') return 'Toda a empresa';
    return 'Pessoal';
  }

  protected allowedScopes(): CalendarScope[] {
    if (this.isAdmin()) return ['PESSOAL', 'SETOR', 'EMPRESA'];
    if (this.isSupervisor()) return ['PESSOAL', 'SETOR'];
    return ['PESSOAL'];
  }

  protected scopeChanged(scope: CalendarScope): void {
    this.scope.set(scope);
    if (scope !== 'SETOR') this.sectorId.set('');
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

}
