import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

const KEY = 'theme';

function read(): ThemeMode {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Светлая или тёмная тема. «Как в системе» — без класса, тему выбирает @media в styles.css;
 * выбранная вручную — класс .light/.dark на <html>. То же до загрузки приложения делает скрипт в index.html.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly mode = signal<ThemeMode>(read());

  set(mode: ThemeMode) {
    this.mode.set(mode);
    const root = document.documentElement.classList;
    root.toggle('light', mode === 'light');
    root.toggle('dark', mode === 'dark');
    try {
      if (mode === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, mode);
    } catch {
      // приватный режим браузера — тема просто не запомнится
    }
  }
}
