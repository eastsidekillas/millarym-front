import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { MaintenanceStore } from '@features/maintenance';

export const maintenanceInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(MaintenanceStore);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 503 && error.error?.code === 'maintenance') {
        store.show(error.error.detail);
      }
      return throwError(() => error);
    }),
  );
};
