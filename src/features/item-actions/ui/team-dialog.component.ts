import { Component, effect, inject, signal } from '@angular/core';
import { CatalogApi, Team } from '@entities/catalog';
import { ModalComponent } from '@shared/ui';
import { ItemActions } from '../model/item-actions.service';

@Component({
  selector: 'app-team-dialog',
  imports: [ModalComponent],
  template: `
    @if (actions.teamRequest(); as req) {
      <app-modal
        [title]="req.count > 1 ? 'Выдать в работу: ' + req.count + ' изд.' : 'Выдать в работу'"
        subtitle="Без бригады на «В работе» перевести нельзя"
        width="md:max-w-md"
        (closed)="req.resolve(null)"
      >
        <div class="grid gap-4 p-5">
          @if (loading()) {
            <p class="text-sm text-muted">Загружаем бригады…</p>
          } @else if (!teams().length) {
            <p class="text-sm">Бригад пока нет. Их добавляют в справочнике «Бригады» (админка).</p>
          } @else {
            <div class="grid gap-2" role="radiogroup" aria-label="Бригада">
              @for (t of teams(); track t.id) {
                <button
                  type="button"
                  class="flex items-center justify-between rounded-xl border px-4 py-3 text-left hover:bg-sub"
                  [class]="selected()?.id === t.id ? 'border-accent bg-accent/10' : 'border-line'"
                  (click)="selected.set(t)"
                  (dblclick)="req.resolve(t)"
                >
                  <span class="font-medium">{{ t.name }}</span>
                  @if (t.foreman) {
                    <span class="text-xs text-muted">{{ t.foreman }}</span>
                  }
                </button>
              }
            </div>
          }
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-outline" (click)="req.resolve(null)">Отмена</button>
            <button type="button" class="btn-primary" [disabled]="!selected()" (click)="req.resolve(selected())">Выдать</button>
          </div>
        </div>
      </app-modal>
    }
  `,
})
export class TeamDialogComponent {
  readonly actions = inject(ItemActions);
  private readonly catalog = inject(CatalogApi);

  readonly teams = signal<Team[]>([]);
  readonly loading = signal(false);
  readonly selected = signal<Team | null>(null);

  constructor() {
    effect(() => {
      if (!this.actions.teamRequest()) return;
      this.selected.set(null);
      this.loading.set(true);
      this.catalog.teams().subscribe({
        next: (teams) => {
          this.teams.set(teams);
          if (teams.length === 1) this.selected.set(teams[0]);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }
}
