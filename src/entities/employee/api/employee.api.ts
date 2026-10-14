import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '@shared/config';
import { Employee } from '../model/employee.types';

@Injectable({ providedIn: 'root' })
export class EmployeeApi {
  private readonly http = inject(HttpClient);
  private list$?: Observable<Employee[]>;

  list(): Observable<Employee[]> {
    this.list$ ??= this.http.get<Employee[]>(`${environment.baseURL}/users/`).pipe(shareReplay(1));
    return this.list$;
  }
}
