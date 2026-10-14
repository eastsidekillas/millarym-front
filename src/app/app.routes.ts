import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './providers/auth.guard';

const placeholder = () => import('@pages/placeholder').then((m) => m.PlaceholderPage);

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Вход — Миларум CRM',
    loadComponent: () => import('@pages/login').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'production' },
      {
        path: 'production',
        title: 'Производство — Миларум CRM',
        loadComponent: () => import('@pages/production').then((m) => m.ProductionPage),
      },
      {
        path: 'fabrics',
        title: 'Ткани — Миларум CRM',
        loadComponent: () => import('@pages/fabrics').then((m) => m.FabricsPage),
      },
      { path: 'reports', title: 'Отчёты — Миларум CRM', data: { title: 'Отчёты' }, loadComponent: placeholder },
      {
        path: 'journal',
        title: 'Журнал — Миларум CRM',
        loadComponent: () => import('@pages/journal').then((m) => m.JournalPage),
      },
      { path: 'refs', title: 'Справочники — Миларум CRM', data: { title: 'Справочники' }, loadComponent: placeholder },
      {
        path: '**',
        title: 'Не найдено — Миларум CRM',
        loadComponent: () => import('@pages/not-found').then((m) => m.NotFoundPage),
      },
    ],
  },
];
