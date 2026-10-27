import { Injectable, signal } from '@angular/core';

export interface ViewedPhoto {
  src: string;
  title: string;
  /** Тот же снимок в JPEG: в справочнике фото хранятся в WebP, а пересылают их партнёрам обычно JPEG. */
  jpeg?: string | null;
}

/** Фото на весь экран (ткань в списке, в карточке). Окно одно на приложение — в main-layout. */
@Injectable({ providedIn: 'root' })
export class PhotoViewer {
  readonly current = signal<ViewedPhoto | null>(null);

  open(src: string, title: string, jpeg?: string | null) {
    this.current.set({ src, title, jpeg });
  }

  close() {
    this.current.set(null);
  }
}
