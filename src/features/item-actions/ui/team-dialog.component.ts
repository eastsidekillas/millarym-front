import { Component, effect, inject, signal } from '@angular/core';
import { CatalogApi, Team } from '@entities/catalog';
import { ModalComponent } from '@shared/ui';
import { ItemActions } from '../model/item-actions.service';
import { DayFieldComponent, todayIso } from './day-field.component';

@Component({
  selector: 'app-team-dialog',
  imports: [ModalComponent, DayFieldComponent],
  template: `
    @if (actions.teamRequest(); as req) {
      <app-modal
        [title]="req.count > 1 ? 'Выдать в работу ' + req.count + ' изд.' : 'Выдать в работу'"
        subtitle="Бригада, которая будет собирать, и день выдачи"
        width="md:max-w-md"
        (closed)="req.resolve(null)"
      >
        <div class="grid gap-5 px-6 py-5">
          @if (loading()) {
            <p class="text-sm text-muted">Загружаем бригады…</p>
          } @else if (!teams().length) {
            <p class="text-sm">Бригад пока нет. Добавьте их в админке, в разделе «Бригады».</p>
          } @else {
            <div class="grid content-start gap-1.5" role="radiogroup" aria-label="Бригада">
              @for (t of teams(); track t.id) {
                <button
                  type="button"
                  role="radio"
                  [attr.aria-checked]="selected()?.id === t.id"
                  class="flex h-10 items-center justify-between rounded-lg border px-3 text-left text-sm"
                  [class]="selected()?.id === t.id ? 'border-accent bg-accent/[.08]' : 'border-line hover:bg-sub'"
                  (click)="selected.set(t)"
                  (dblclick)="choose(req.resolve, t)"
                >
                  <span>{{ t.name }}</span>
                  @if (t.foreman && t.foreman !== t.name) {
                    <span class="text-xs text-muted">{{ t.foreman }}</span>
                  }
                </button>
              }
            </div>
          }
          <app-day-field label="Дата выдачи в работу" [(value)]="date" />
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-outline" (click)="req.resolve(null)">Отмена</button>
            <button type="button" class="btn-primary" [disabled]="!selected() || !date() || date() > today" (click)="choose(req.resolve, selected())">Выдать</button>
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
  readonly date = signal('');
  today = '';

  choose(resolve: (choice: { team: Team; date: string } | null) => void, team: Team | null) {
    if (team && this.date() && this.date() <= this.today) resolve({ team, date: this.date() });
  }

  constructor() {
    effect(() => {
      if (!this.actions.teamRequest()) return;
      this.selected.set(null);
      this.today = todayIso();
      this.date.set(this.today);
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
