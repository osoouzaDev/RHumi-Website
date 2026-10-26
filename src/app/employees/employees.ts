import { Component } from '@angular/core';

interface Employee {
  initials: string;
  name: string;
  position: string;
  access: string;
  sector: string;
  email: string;
  since: string;
  lastEvaluation: string;
}

@Component({
  selector: 'app-employees',
  templateUrl: './employees.html',
})
export class Employees {
  protected readonly employees: Employee[] = [
    {
      initials: 'KL',
      name: 'Kauã Luiz dos Santos',
      position: 'Suporte',
      access: 'Admin',
      sector: 'Tecnologia',
      email: 'kaua.dev09@gmail.com',
      since: '01/01/2026',
      lastEvaluation: '31/07/2026',
    },
    {
      initials: 'LG',
      name: 'Luís Guilherme de Souza Ribeiro',
      position: 'Analista Fiscal',
      access: 'Colaborador',
      sector: 'Fiscal',
      email: 'souzaluis.dev@gmail.com',
      since: '09/03/2026',
      lastEvaluation: '31/07/2026',
    },
    {
      initials: 'LV',
      name: 'Lucas Vinicyus Felix',
      position: 'Analista Pleno de Marketing',
      access: 'Colaborador',
      sector: 'Marketing',
      email: 'vinicyus049@gmail.com',
      since: '01/01/2026',
      lastEvaluation: '31/07/2026',
    },
    {
      initials: 'KL',
      name: 'Kauã Luiz dos Santos',
      position: 'Suporte',
      access: 'Admin',
      sector: 'Tecnologia',
      email: 'kaua.dev09@gmail.com',
      since: '01/01/2026',
      lastEvaluation: '31/07/2026',
    },
    {
      initials: 'LG',
      name: 'Luís Guilherme de Souza Ribeiro',
      position: 'Analista Fiscal',
      access: 'Colaborador',
      sector: 'Fiscal',
      email: 'souzaluis.dev@gmail.com',
      since: '09/03/2026',
      lastEvaluation: '31/07/2026',
    },
    {
      initials: 'LV',
      name: 'Lucas Vinicyus Felix',
      position: 'Analista Pleno de Marketing',
      access: 'Colaborador',
      sector: 'Marketing',
      email: 'vinicyus049@gmail.com',
      since: '01/01/2026',
      lastEvaluation: '31/07/2026',
    },
  ];

  protected readonly collaboratorsCount = this.employees.filter((e) => e.access === 'Colaborador').length;
  protected readonly sectorsCount = new Set(this.employees.map((e) => e.sector)).size;
}
