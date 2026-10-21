import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@shared/config';
import { BackupOverview, BackupPart } from '../model/backup.types';

@Injectable({ providedIn: 'root' })
export class BackupApi {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.baseURL}/backups`;

  overview(): Observable<BackupOverview> {
    return this.http.get<BackupOverview>(`${this.api}/`);
  }

  backupNow(): Observable<BackupOverview> {
    return this.http.post<BackupOverview>(`${this.api}/`, {});
  }

  restore(stamp: string, confirm: string): Observable<BackupOverview> {
    return this.http.post<BackupOverview>(`${this.api}/${stamp}/restore/`, { confirm });
  }

  /** Прямая ссылка: большой файл браузер качает сам, со своим прогрессом, а не через память страницы. */
  downloadUrl(stamp: string, part: BackupPart): string {
    return `${this.api}/${stamp}/${part}/`;
  }
}
