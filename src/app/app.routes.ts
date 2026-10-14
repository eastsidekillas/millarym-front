import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '@core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Вход — Миларум CRM',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'production' },
      {
        path: 'production',
        title: 'Производство — Миларум CRM',
        loadComponent: () =>
          import('./pages/production/production.page').then((m) => m.ProductionPage),
      },
      {
        path: 'fabrics',
        title: 'Ткани — Миларум CRM',
        data: { title: 'Ткани' },
        loadComponent: () =>
          import('./pages/placeholder/placeholder.page').then((m) => m.PlaceholderPage),
      },
      {
        path: 'reports',
        title: 'Отчёты — Миларум CRM',
        data: { title: 'Отчёты' },
        loadComponent: () =>
          import('./pages/placeholder/placeholder.page').then((m) => m.PlaceholderPage),
      },
      {
        path: 'journal',
        title: 'Журнал — Миларум CRM',
        data: { title: 'Журнал' },
        loadComponent: () =>
          import('./pages/placeholder/placeholder.page').then((m) => m.PlaceholderPage),
      },
      {
        path: 'refs',
        title: 'Справочники — Миларум CRM',
        data: { title: 'Справочники' },
        loadComponent: () =>
          import('./pages/placeholder/placeholder.page').then((m) => m.PlaceholderPage),
      },
      {
        path: '**',
        title: 'Не найдено — Миларум CRM',
        loadComponent: () =>
          import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage),
      },
    ],
  },
];
