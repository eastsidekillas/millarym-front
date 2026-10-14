import { Injectable, signal } from '@angular/core';

export interface Toast {
  text: string;
  kind: 'info' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly current = signal<Toast | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  show(text: string, kind: Toast['kind'] = 'info'): void {
    clearTimeout(this.timer);
    this.current.set({ text, kind });
    this.timer = setTimeout(() => this.current.set(null), kind === 'error' ? 6000 : 2800);
  }

  error(text: string): void {
    this.show(text, 'error');
  }
}
