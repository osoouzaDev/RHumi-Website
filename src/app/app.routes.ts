import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { Company } from './company/company';
import { Employees } from './employees/employees';
import { Login } from './login/login';
import { Journey } from './journey/journey';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'empresa', component: Company, canActivate: [authGuard] },
  { path: 'funcionarios', component: Employees, canActivate: [authGuard] },
  { path: 'jornada', component: Journey, canActivate: [authGuard] },
  { path: 'calendario', canActivate: [authGuard], loadComponent: () => import('./calendar/calendar').then((module) => module.Calendar) },
  { path: 'recrutamento/candidatos', canActivate: [authGuard], loadComponent: () => import('./candidates/candidates').then((module) => module.Candidates) },
  { path: 'recrutamento', canActivate: [authGuard], loadComponent: () => import('./recruitment/recruitment').then((module) => module.Recruitment) },
  { path: 'area-colaborador', canActivate: [authGuard], loadComponent: () => import('./employee-area/employee-area').then((module) => module.EmployeeArea) },
  { path: 'configuracoes', canActivate: [authGuard], loadComponent: () => import('./settings/settings').then((module) => module.Settings) },
  { path: '**', loadComponent: () => import('./not-found/not-found').then((module) => module.NotFound) },
];
