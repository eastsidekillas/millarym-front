import { Injectable, signal } from '@angular/core';
import { Fabric } from '@entities/catalog';

export type FabricFormState = { mode: 'create' } | { mode: 'edit'; fabric: Fabric };

@Injectable({ providedIn: 'root' })
export class FabricForm {
  readonly state = signal<FabricFormState | null>(null);
  readonly saved = signal(0);

  create(): void {
    this.state.set({ mode: 'create' });
  }

  edit(fabric: Fabric): void {
    this.state.set({ mode: 'edit', fabric });
  }

  close(): void {
    this.state.set(null);
  }
}
