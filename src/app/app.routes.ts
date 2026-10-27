import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { Company } from './company/company';
import { Employees } from './employees/employees';
import { Login } from './login/login';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'empresa', component: Company, canActivate: [authGuard] },
  { path: 'funcionarios', component: Employees, canActivate: [authGuard] },
];
