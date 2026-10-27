import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

type CompanySection = 'details' | 'about' | 'careers' | 'culture' | 'sectors' | 'classifications';

@Component({
  selector: 'app-company',
  imports: [FormsModule],
  templateUrl: './company.html',
})
export class Company {
  protected readonly authService = inject(AuthService);
  protected readonly router = inject(Router);
  protected readonly navigationOpen = signal(false);
  protected readonly navigationItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Funcionários', icon: 'employees', route: '/funcionarios' },
    { label: 'Empresa', icon: 'company', route: '/empresa' },
    { label: 'Jornada', icon: 'journey', route: '/jornada' },
    { label: 'Calendário', icon: 'calendar', route: null },
    { label: 'Recrutamento', icon: 'recruitment', route: null },
    { label: 'Área do colaborador', icon: 'employee-area', route: null },
    { label: 'Configurações', icon: 'settings', route: null },
  ];
  protected readonly editingSection = signal<CompanySection | null>(null);
  protected readonly company = {
    name: '',
    cnpj: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    about: '',
    careersHeadline: '',
    careersDescription: '',
    culture: '',
  };

  protected sectors: string[] = [];
  protected classifications: string[] = [];
  protected readonly departments: { name: string; count: number }[] = [];
  protected sectorDraft = '';
  protected classificationDraft = '';

  protected get collaboratorsCount(): number | null {
    if (this.departments.length === 0) {
      return null;
    }

    return this.departments.reduce((total, department) => total + department.count, 0);
  }

  protected toggleNavigation(): void {
    this.navigationOpen.update((open) => !open);
  }

  protected navigateTo(route: string | null): void {
    if (!route) return;

    this.navigationOpen.set(false);
    void this.router.navigateByUrl(route);
  }

  protected async logout(): Promise<void> {
    try {
      await this.authService.logout();
    } catch {
      this.navigationOpen.set(false);
    }

    await this.router.navigate(['/']);
  }

  protected onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
  }

  protected formatCnpj(value: string): string {
    return this.onlyDigits(value)
      .slice(0, 14)
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  protected formatPhone(value: string): string {
    const digits = this.onlyDigits(value).slice(0, 11);
    if (digits.length <= 2) {
      return digits ? `(${digits}` : '';
    }

    const areaCode = digits.slice(0, 2);
    const number = digits.slice(2);
    const subscriberDigits = digits.length > 10 ? 5 : 4;
    const firstPart = number.slice(0, subscriberDigits);
    const secondPart = number.slice(subscriberDigits);

    return `(${areaCode}) ${firstPart}${secondPart ? `-${secondPart}` : ''}`;
  }

  protected normalizeWebsite(): void {
    const website = this.company.website.trim();
    if (!website) {
      this.company.website = '';
      return;
    }

    const normalized = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    try {
      this.company.website = new URL(normalized).toString().replace(/\/$/, '');
    } catch {
      this.company.website = website;
    }
  }

  protected toggleEdit(section: CompanySection): void {
    if (this.editingSection() === section) {
      this.sectorDraft = '';
      this.classificationDraft = '';
      this.editingSection.set(null);
      return;
    }

    this.sectorDraft = '';
    this.classificationDraft = '';
    this.editingSection.set(section);
  }

  protected addSector(): void {
    const sector = this.sectorDraft.trim();
    if (!sector || this.sectors.some((existing) => existing.toLocaleLowerCase() === sector.toLocaleLowerCase())) {
      return;
    }

    this.sectors = [...this.sectors, sector];
    this.sectorDraft = '';
  }

  protected removeSector(sector: string): void {
    this.sectors = this.sectors.filter((existing) => existing !== sector);
  }

  protected addClassification(): void {
    const classification = this.classificationDraft.trim();
    if (
      !classification ||
      this.classifications.some((existing) => existing.toLocaleLowerCase() === classification.toLocaleLowerCase())
    ) {
      return;
    }

    this.classifications = [...this.classifications, classification];
    this.classificationDraft = '';
  }

  protected removeClassification(classification: string): void {
    this.classifications = this.classifications.filter((existing) => existing !== classification);
  }
}
