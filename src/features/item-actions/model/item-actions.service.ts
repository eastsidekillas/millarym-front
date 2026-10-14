import { Injectable, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { Team } from '@entities/catalog';
import { ActionCode, Item, ItemApi, ItemDetail, ItemsChanged, STAGE_NAME, SimpleAction, Stage } from '@entities/item';
import { errorText } from '@shared/api';
import { ConfirmService, ToastService } from '@shared/ui';

export interface TeamRequest {
  count: number;
  resolve: (team: Team | null) => void;
}

const SIMPLE: Partial<Record<ActionCode, SimpleAction>> = {
  fabric_arrived: 'fabric-arrived',
  sew: 'sew',
  cover_ready: 'cover-ready',
  ship: 'ship',
  trash: 'trash',
  restore: 'restore',
  return_to_work: 'return-to-work',
  copy: 'copy',
};

const DONE: Partial<Record<ActionCode, string>> = {
  fabric_arrived: 'ткань пришла',
  sew: 'выдано в шитьё',
  cover_ready: 'чехол готов',
  ship: 'отгружено → Корзина',
  trash: 'удалено в Корзину',
  restore: 'восстановлено',
  return_to_work: 'возвращено в работу',
};

type Target = Pick<Item, 'id' | 'number' | 'stage' | 'team'>;

@Injectable({ providedIn: 'root' })
export class ItemActions {
  private readonly api = inject(ItemApi);
  private readonly changed = inject(ItemsChanged);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly teamRequest = signal<TeamRequest | null>(null);
  readonly busy = signal(false);

  askTeam(count: number): Promise<Team | null> {
    return new Promise((resolve) =>
      this.teamRequest.set({
        count,
        resolve: (team) => {
          this.teamRequest.set(null);
          resolve(team);
        },
      }),
    );
  }

  async move(item: Target, to: Stage): Promise<ItemDetail | null> {
    let team: Team | null = null;
    if (to === 'work') {
      team = await this.askTeam(1);
      if (!team) return null;
    }
    return this.call(this.api.move(item.id, to, team?.id), `${item.number} → ${STAGE_NAME[to]}`);
  }

  async bulkMove(items: Target[], to: Stage): Promise<Item[] | null> {
    let team: Team | null = null;
    if (to === 'work') {
      team = await this.askTeam(items.length);
      if (!team) return null;
    }
    const numbers = items.map((i) => i.number).join(', ');
    return this.call(this.api.bulkMove(items.map((i) => i.id), to, team?.id), `${numbers} → ${STAGE_NAME[to]}`);
  }

  async run(item: Target, code: ActionCode): Promise<ItemDetail | null> {
    const action = SIMPLE[code];
    if (!action) return null;
    if (code === 'trash' && !(await this.confirm.ask('Удалить в Корзину?', `${item.number} пролежит в Корзине 30 дней, потом удалится само. До этого его можно восстановить.`, 'Удалить', true))) {
      return null;
    }
    if (code === 'ship' && !(await this.confirm.ask('Отгрузить?', `${item.number} уйдёт в Корзину как отгруженное.`, 'Отгрузить'))) {
      return null;
    }
    const result = await this.call(this.api.run(item.id, action), code === 'copy' ? null : `${item.number}: ${DONE[code]}`);
    if (result && code === 'copy') this.toast.show(`Копия ${item.number} → ${result.number}, ${STAGE_NAME[result.stage]}`);
    return result;
  }

  reserve(item: Target, text: string): Promise<ItemDetail | null> {
    const message = text.trim() ? `${item.number}: резерв сохранён` : `${item.number}: резерв снят`;
    return this.call(this.api.reserve(item.id, text), message);
  }

  private async call<T>(request: Observable<T>, success: string | null): Promise<T | null> {
    this.busy.set(true);
    try {
      const result = await firstValueFrom(request);
      if (success) this.toast.show(success);
      this.changed.notify();
      return result;
    } catch (err) {
      this.toast.error(errorText(err));
      return null;
    } finally {
      this.busy.set(false);
    }
  }
}
