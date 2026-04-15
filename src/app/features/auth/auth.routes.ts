import { Routes } from '@angular/router';
export const AUTH_ROUTES: Routes = [
  { path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent), title: 'تسجيل الدخول' },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];
