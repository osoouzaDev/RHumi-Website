import { Routes } from '@angular/router';
import { Company } from './company/company';
import { Employees } from './employees/employees';
import { Login } from './login/login';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'empresa', component: Company, canActivate: [authGuard] },
  { path: 'funcionarios', component: Employees, canActivate: [authGuard] },
];
