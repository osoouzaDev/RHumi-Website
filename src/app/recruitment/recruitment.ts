import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SystemNavigation } from '../shared/system-navigation';

interface Vacancy {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  status: 'Aberta' | 'Pausada';
  createdAt: string;
}

type VacancyFilter = 'Todas' | 'Abertas' | 'Pausadas';

@Component({
  selector: 'app-recruitment',
  imports: [FormsModule, SystemNavigation],
  templateUrl: './recruitment.html',
})
export class Recruitment {
  protected readonly vacancies = signal<Vacancy[]>(this.readVacancies());
  protected readonly filter = signal<VacancyFilter>('Todas');
  protected readonly searchTerm = signal('');
  protected readonly showForm = signal(false);
  protected readonly title = signal('');
  protected readonly department = signal('');
  protected readonly location = signal('');
  protected readonly type = signal('CLT');
  protected readonly openCount = computed(() => this.vacancies().filter((vacancy) => vacancy.status === 'Aberta').length);
  protected readonly pausedCount = computed(() => this.vacancies().filter((vacancy) => vacancy.status === 'Pausada').length);
  protected readonly filteredVacancies = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase('pt-BR');
    return this.vacancies()
      .filter((vacancy) => this.filter() === 'Todas' || vacancy.status === this.filter().replace('s', ''))
      .filter((vacancy) => !query || [vacancy.title, vacancy.department, vacancy.location].some((value) => value.toLocaleLowerCase('pt-BR').includes(query)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  protected openForm(): void {
    this.title.set('');
    this.department.set('');
    this.location.set('');
    this.type.set('CLT');
    this.showForm.set(true);
  }

  protected createVacancy(event: SubmitEvent): void {
    event.preventDefault();
    const title = this.title().trim();
    const department = this.department().trim();
    if (!title || !department) return;
    const next = [{
      id: crypto.randomUUID(),
      title,
      department,
      location: this.location().trim() || 'A combinar',
      type: this.type(),
      status: 'Aberta' as const,
      createdAt: new Date().toISOString(),
    }, ...this.vacancies()];
    this.vacancies.set(next);
    this.persistVacancies(next);
    this.showForm.set(false);
  }

  protected toggleStatus(vacancy: Vacancy): void {
    const next = this.vacancies().map((item) => item.id === vacancy.id
      ? { ...item, status: item.status === 'Aberta' ? 'Pausada' as const : 'Aberta' as const }
      : item);
    this.vacancies.set(next);
    this.persistVacancies(next);
  }

  protected formatDate(value: string): string {
    return new Date(value).toLocaleDateString('pt-BR');
  }

  private readVacancies(): Vacancy[] {
    try {
      const stored = localStorage.getItem('rhumi_recruitment_vacancies');
      return stored ? JSON.parse(stored) as Vacancy[] : [];
    } catch {
      return [];
    }
  }

  private persistVacancies(vacancies: Vacancy[]): void {
    localStorage.setItem('rhumi_recruitment_vacancies', JSON.stringify(vacancies));
  }
}
