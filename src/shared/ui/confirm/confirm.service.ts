import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  text: string;
  ok: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly current = signal<ConfirmRequest | null>(null);

  ask(title: string, text: string, ok = 'Да', danger = false): Promise<boolean> {
    return new Promise((resolve) => {
      this.current.set({
        title,
        text,
        ok,
        danger,
        resolve: (answer) => {
          this.current.set(null);
          resolve(answer);
        },
      });
    });
  }
}
