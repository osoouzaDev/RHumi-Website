import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { Company } from './company/company';
import { Employees } from './employees/employees';
import { Login } from './login/login';
import { Journey } from './journey/journey';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: Login, title: 'RHumi | Login' },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard], title: 'RHumi | Dashboard' },
  { path: 'empresa', component: Company, canActivate: [authGuard], title: 'RHumi | Empresa' },
  { path: 'funcionarios', component: Employees, canActivate: [authGuard], title: 'RHumi | Funcionários' },
  { path: 'jornada', component: Journey, canActivate: [authGuard], title: 'RHumi | Jornada' },
  {
    path: 'calendario',
    canActivate: [authGuard],
    loadComponent: () => import('./calendar/calendar').then((module) => module.Calendar),
    title: 'RHumi | Calendário',
  },
  {
    path: 'recrutamento',
    canActivate: [authGuard],
    loadComponent: () => import('./recruitment/recruitment').then((module) => module.Recruitment),
    title: 'RHumi | Recrutamento',
  },
  {
    path: 'area-colaborador',
    canActivate: [authGuard],
    loadComponent: () => import('./employee-area/employee-area').then((module) => module.EmployeeArea),
    title: 'RHumi | Área do colaborador',
  },
  {
    path: 'configuracoes',
    canActivate: [authGuard],
    loadComponent: () => import('./settings/settings').then((module) => module.Settings),
    title: 'RHumi | Configurações',
  },
  {
    path: '**',
    loadComponent: () => import('./not-found/not-found').then((module) => module.NotFound),
    title: 'RHumi | Página não encontrada',
  },
];
