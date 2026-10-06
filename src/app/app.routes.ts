import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [loginGuard],
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',   loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent), title: 'لوحة التحكم' },
      { path: 'finance',     loadChildren: () => import('./features/finance/finance.routes').then(m => m.FINANCE_ROUTES) },
      { path: 'agriculture', loadComponent: () => import('./features/agriculture/agriculture.component').then(m => m.AgricultureComponent), title: 'الزراعة' },

      // Old top-level sections now live inside the finance hub
      { path: 'shareholders',   redirectTo: 'finance/shareholders' },
      { path: 'operations',     redirectTo: 'finance/payroll' },
      { path: 'infrastructure', redirectTo: 'finance/assets' },
      { path: 'reports',        redirectTo: 'finance/overview' },
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];
