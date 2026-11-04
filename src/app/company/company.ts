import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiUser, AuthService, CompanyData, CompanySector, UpdateCompanyData } from '../services/auth.service';
import { SystemNavigation } from '../shared/system-navigation';

@Component({
  selector: 'app-company',
  imports: [FormsModule, SystemNavigation],
  templateUrl: './company.html',
})
export class Company implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly sectorBusy = signal(false);
  protected readonly editing = signal(false);
  protected readonly managingSectors = signal(false);
  protected readonly error = signal('');
  protected readonly collaboratorError = signal('');
  protected readonly saveMessage = signal('');
  protected readonly company = signal<CompanyData | null>(null);
  protected readonly employees = signal<ApiUser[]>([]);
  protected readonly collaboratorSearch = signal('');
  protected sectorDraft = '';
  private readonly originalCompany = signal<CompanyData | null>(null);
  protected readonly filteredEmployees = computed(() => {
    const term = this.collaboratorSearch().trim().toLocaleLowerCase('pt-BR');
    if (!term) return [];
    return this.employees()
      .filter((employee) =>
        [employee.nome, employee.login, employee.setor ?? '']
          .some((value) => value.toLocaleLowerCase('pt-BR').includes(term)),
      )
      .slice(0, 5);
  });
  protected readonly formattedValues = computed(() =>
    (this.company()?.valores ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  protected readonly canEditCompany = computed(() => {
    const profile = this.authService.currentUser()?.classificacao.trim().toLowerCase();
    return ['sakai', 'admin', 'hr_admin', 'supervisor'].includes(profile ?? '');
  });
  ngOnInit(): void {
    void this.loadCompany();
  }

  protected async loadCompany(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const company = await this.authService.buscarEmpresa();
      this.company.set(company);
      this.originalCompany.set({ ...company });
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível carregar os dados da empresa.');
    } finally {
      this.loading.set(false);
    }

    this.collaboratorError.set('');
    try {
      this.employees.set(await this.authService.listarUsuariosAtivos());
    } catch (error: unknown) {
      this.collaboratorError.set(error instanceof Error ? error.message : 'Não foi possível carregar os colaboradores.');
    }
  }

  protected async saveCompany(): Promise<void> {
    const company = this.company();
    if (!company || !this.canEditCompany() || this.saving()) return;

    this.saving.set(true);
    this.error.set('');
    this.saveMessage.set('');
    try {
      const data: UpdateCompanyData = {
        nome_empresa: company.nome_empresa,
        cnpj: this.formatCnpj(company.cnpj),
        rua: company.rua,
        numero_end: company.numero_end,
        bairro: company.bairro,
        cep: company.cep,
        cidade: company.cidade,
        estado: company.estado,
        telefone: company.telefone,
        email: company.email,
        fundacao: company.fundacao,
        sobre_empresa: company.sobre_empresa ?? '',
        nome_pagina_carreiras: company.nome_pagina_carreiras ?? '',
        homepage_carreiras: company.homepage_carreiras ?? '',
        chamada_carreiras: company.chamada_carreiras ?? '',
        descricao_carreiras: company.descricao_carreiras ?? '',
        missao: company.missao ?? '',
        visao: company.visao ?? '',
        valores: company.valores ?? '',
      };
      const updatedCompany = await this.authService.atualizarEmpresa(data);
      this.company.set(updatedCompany);
      this.originalCompany.set({ ...updatedCompany });
      this.editing.set(false);
      this.saveMessage.set('Dados da empresa salvos no banco de dados.');
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível salvar os dados da empresa.');
    } finally {
      this.saving.set(false);
    }
  }

  protected startEditing(): void {
    const company = this.company();
    if (!company || !this.canEditCompany()) return;
    this.originalCompany.set({ ...company });
    this.saveMessage.set('');
    this.error.set('');
    this.editing.set(true);
  }

  protected cancelEditing(): void {
    const original = this.originalCompany();
    if (original) this.company.set({ ...original });
    this.editing.set(false);
    this.error.set('');
    this.saveMessage.set('');
  }

  protected toggleSectorManagement(): void {
    this.managingSectors.update((managing) => !managing);
  }

  protected async addSector(): Promise<void> {
    const name = this.sectorDraft.trim();
    const company = this.company();
    if (!name || !company || !this.canEditCompany() || this.sectorBusy()) return;

    this.sectorBusy.set(true);
    this.error.set('');
    try {
      const sector = await this.authService.criarSetorEmpresa(name);
      this.company.set({ ...company, setores: [...company.setores, sector].sort((a, b) => a.nome_setor.localeCompare(b.nome_setor, 'pt-BR')) });
      this.sectorDraft = '';
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível adicionar o setor.');
    } finally {
      this.sectorBusy.set(false);
    }
  }

  protected async removeSector(sector: CompanySector): Promise<void> {
    const company = this.company();
    if (!company || !this.canEditCompany() || sector.quantidade > 0 || this.sectorBusy()) return;

    this.sectorBusy.set(true);
    this.error.set('');
    try {
      await this.authService.removerSetorEmpresa(sector.id);
      this.company.set({ ...company, setores: company.setores.filter((item) => item.id !== sector.id) });
    } catch (error: unknown) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível remover o setor.');
    } finally {
      this.sectorBusy.set(false);
    }
  }

  protected formatCnpj(value: string | null): string {
    const digits = (value ?? '').replace(/\D/g, '').slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  protected formatPhone(value: string | null): string {
    const digits = (value ?? '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits ? `(${digits}` : '';

    const areaCode = digits.slice(0, 2);
    const number = digits.slice(2);
    const subscriberDigits = digits.length > 10 ? 5 : 4;
    const firstPart = number.slice(0, subscriberDigits);
    const secondPart = number.slice(subscriberDigits);
    return `(${areaCode}) ${firstPart}${secondPart ? `-${secondPart}` : ''}`;
  }

  protected formatDate(value: string | null): string {
    if (!value) return 'Não informado';
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleDateString('pt-BR');
  }

  protected formatTimestamp(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Não informado'
      : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

}
