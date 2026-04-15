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
      { path: 'dashboard',      loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),         title: 'لوحة التحكم' },
      { path: 'finance',        loadComponent: () => import('./features/finance/finance.component').then(m => m.FinanceComponent),               title: 'المالية' },
      { path: 'shareholders',   loadComponent: () => import('./features/shareholders/shareholders.component').then(m => m.ShareholdersComponent), title: 'المساهمون' },
      { path: 'agriculture',    loadComponent: () => import('./features/agriculture/agriculture.component').then(m => m.AgricultureComponent),   title: 'الزراعة' },
      { path: 'infrastructure', loadComponent: () => import('./features/infrastructure/infrastructure.component').then(m => m.InfrastructureComponent), title: 'البنية التحتية' },
      { path: 'operations',     loadComponent: () => import('./features/operations/operations.component').then(m => m.OperationsComponent),     title: 'العمليات' },
      { path: 'reports',        loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),               title: 'التقارير' }
    ]
  },
  { path: '**', redirectTo: '/dashboard' }
];
