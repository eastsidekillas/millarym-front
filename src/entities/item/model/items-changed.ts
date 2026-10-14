import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ItemsChanged {
  readonly version = signal(0);

  notify(): void {
    this.version.update((v) => v + 1);
  }
}
