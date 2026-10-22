import { Injectable, signal } from '@angular/core';

export interface ViewedPhoto {
  src: string;
  title: string;
}

/** Фото на весь экран (ткань в списке, в карточке). Окно одно на приложение — в main-layout. */
@Injectable({ providedIn: 'root' })
export class PhotoViewer {
  readonly current = signal<ViewedPhoto | null>(null);

  open(src: string, title: string) {
    this.current.set({ src, title });
  }

  close() {
    this.current.set(null);
  }
}
