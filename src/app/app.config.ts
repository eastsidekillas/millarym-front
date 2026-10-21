import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { LucideIconConfig } from 'lucide-angular';
import { routes } from './app.routes';
import { authInterceptor } from './providers/auth.interceptor';
import { maintenanceInterceptor } from './providers/maintenance.interceptor';

registerLocaleData(localeRu, 'ru');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([maintenanceInterceptor, authInterceptor])),
    { provide: LOCALE_ID, useValue: 'ru' },
    { provide: LucideIconConfig, useFactory: () => Object.assign(new LucideIconConfig(), { size: 16, strokeWidth: 1.75 }) },
  ],
};
