import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiUser, AuthService } from '../services/auth.service';
import { SystemNavigation } from '../shared/system-navigation';

interface PersonalTask {
  id: string;
  title: string;
  completed: boolean;
}

@Component({
  selector: 'app-employee-area',
  imports: [FormsModule, SystemNavigation, RouterLink],
  templateUrl: './employee-area.html',
})
export class EmployeeArea implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly employee = signal<ApiUser | null>(null);
  protected readonly tasks = signal<PersonalTask[]>(this.readTasks());
  protected readonly newTaskTitle = signal('');
  protected readonly completedTasks = computed(() => this.tasks().filter((task) => task.completed).length);
  protected readonly sortedTasks = computed(() => [...this.tasks()].sort((a, b) => Number(a.completed) - Number(b.completed)));

  ngOnInit(): void {
    void this.loadEmployee();
  }

  protected async loadEmployee(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const userId = this.authService.currentUser()?.id;
      this.employee.set((await this.authService.listarUsuariosAtivos()).find((user) => user.id === userId) ?? null);
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível carregar seu perfil.');
    } finally {
      this.loading.set(false);
    }
  }

  protected addTask(event: SubmitEvent): void {
    event.preventDefault();
    const title = this.newTaskTitle().trim();
    if (!title) return;
    const next = [...this.tasks(), { id: crypto.randomUUID(), title, completed: false }];
    this.tasks.set(next);
    this.persistTasks(next);
    this.newTaskTitle.set('');
  }

  protected toggleTask(id: string): void {
    const next = this.tasks().map((task) => task.id === id ? { ...task, completed: !task.completed } : task);
    this.tasks.set(next);
    this.persistTasks(next);
  }

  protected removeTask(id: string): void {
    const next = this.tasks().filter((task) => task.id !== id);
    this.tasks.set(next);
    this.persistTasks(next);
  }

  protected initials(name: string): string {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase();
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return 'Não informada';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Não informada' : date.toLocaleDateString('pt-BR');
  }

  private readTasks(): PersonalTask[] {
    try {
      const key = `rhumi_personal_tasks_${this.authService.currentUser()?.id ?? 'guest'}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) as PersonalTask[] : [];
    } catch {
      return [];
    }
  }

  private persistTasks(tasks: PersonalTask[]): void {
    const key = `rhumi_personal_tasks_${this.authService.currentUser()?.id ?? 'guest'}`;
    localStorage.setItem(key, JSON.stringify(tasks));
  }
}
