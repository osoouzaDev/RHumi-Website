import { Routes } from '@angular/router';
import { Employees } from './employees/employees';
import { Login } from './login/login';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'funcionarios', component: Employees, canActivate: [authGuard] },
];
