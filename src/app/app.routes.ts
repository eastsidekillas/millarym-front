import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './providers/auth.guard';


export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Вход — Резервы и Заказы',
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
        title: 'Производство — Резервы и Заказы',
        loadComponent: () => import('@pages/production').then((m) => m.ProductionPage),
      },
      {
        path: 'fabrics',
        title: 'Ткани — Резервы и Заказы',
        loadComponent: () => import('@pages/fabrics').then((m) => m.FabricsPage),
      },
      {
        path: 'reports',
        title: 'Отчёты — Резервы и Заказы',
        loadComponent: () => import('@pages/reports').then((m) => m.ReportsPage),
      },
      {
        path: 'journal',
        title: 'Журнал — Резервы и Заказы',
        loadComponent: () => import('@pages/journal').then((m) => m.JournalPage),
      },
      {
        path: 'claims',
        title: 'Рекламации — Резервы и Заказы',
        loadComponent: () => import('@pages/claims').then((m) => m.ClaimsPage),
      },
      {
        path: 'claims/new',
        title: 'Новая рекламация — Резервы и Заказы',
        loadComponent: () => import('@pages/claims').then((m) => m.ClaimPage),
      },
      {
        path: 'claims/:id',
        title: 'Рекламация — Резервы и Заказы',
        loadComponent: () => import('@pages/claims').then((m) => m.ClaimPage),
      },
      {
        path: 'refs',
        title: 'Справочники — Резервы и Заказы',
        loadComponent: () => import('@pages/refs').then((m) => m.RefsPage),
      },
      {
        path: '**',
        title: 'Не найдено — Резервы и Заказы',
        loadComponent: () => import('@pages/not-found').then((m) => m.NotFoundPage),
      },
    ],
  },
];
