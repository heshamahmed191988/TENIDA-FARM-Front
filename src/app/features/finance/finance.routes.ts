import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/auth.guard';
import { FinanceShellComponent } from './finance-shell.component';
export { FINANCE_SECTIONS } from './finance-sections';

export const FINANCE_ROUTES: Routes = [
  {
    path: '',
    component: FinanceShellComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview',     title: 'المالية — نظرة عامة',     loadComponent: () => import('./overview/overview.component').then(m => m.OverviewComponent) },
      { path: 'journal',      title: 'المالية — دفتر اليومية',  loadComponent: () => import('./journal/journal.component').then(m => m.JournalComponent) },
      { path: 'shareholders', title: 'المالية — المساهمون',     loadComponent: () => import('./shareholders/shareholders.component').then(m => m.ShareholdersComponent) },
      { path: 'payroll',      title: 'المالية — الرواتب',       loadComponent: () => import('./payroll/payroll.component').then(m => m.PayrollComponent) },
      { path: 'assets',       title: 'المالية — الأصول',        loadComponent: () => import('./assets/assets.component').then(m => m.AssetsComponent) },
      { path: 'activities',   title: 'المالية — تقارير الأنشطة', loadComponent: () => import('./activities/activities.component').then(m => m.ActivitiesComponent) },
      {
        path: 'settings', title: 'المالية — الإعدادات', canActivate: [roleGuard], data: { roles: ['Admin'] },
        loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent)
      },
    ]
  }
];
