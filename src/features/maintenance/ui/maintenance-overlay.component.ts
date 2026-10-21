import { Component, inject } from '@angular/core';
import { DatabaseBackup, LucideAngularModule } from 'lucide-angular';
import { MaintenanceStore } from '../model/maintenance.store';

@Component({
  selector: 'app-maintenance-overlay',
  imports: [LucideAngularModule],
  template: `
    @if (store.text(); as text) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center bg-bg/95 p-6" role="alertdialog" aria-live="assertive" aria-label="Восстановление базы">
        <div class="max-w-md text-center">
          <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
            <lucide-icon [img]="icon" [size]="24" />
          </span>
          <h2 class="mt-4 text-lg font-semibold">Программа ненадолго недоступна</h2>
          <p class="mt-2 text-sm text-muted">{{ text }}</p>
          <p class="mt-4 inline-flex items-center gap-2 text-xs text-muted">
            <span class="h-2 w-2 animate-pulse rounded-full bg-accent"></span>
            Проверяем каждые несколько секунд
          </p>
        </div>
      </div>
    }
  `,
})
export class MaintenanceOverlayComponent {
  readonly store = inject(MaintenanceStore);
  readonly icon = DatabaseBackup;
}
