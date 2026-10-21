import { Injectable, signal } from '@angular/core';
import { environment } from '@shared/config';

const POLL_MS = 3000;

/** Заглушка на время восстановления базы: API отвечает 503 с code=maintenance, пока служба копий работает. */
@Injectable({ providedIn: 'root' })
export class MaintenanceStore {
  readonly text = signal<string | null>(null);
  private timer?: ReturnType<typeof setInterval>;

  show(text: string) {
    this.text.set(text);
    this.timer ??= setInterval(() => this.check(), POLL_MS);
  }

  private async check() {
    try {
      const res = await fetch(`${environment.baseURL}/maintenance/`, { credentials: 'include' });
      const data = (await res.json()) as { active: boolean; text: string };
      if (data.active) {
        this.text.set(data.text);
        return;
      }
      clearInterval(this.timer);
      // база теперь другая — всё на странице устарело
      location.reload();
    } catch {
      // сервер перезапускается — спросим ещё раз
    }
  }
}
