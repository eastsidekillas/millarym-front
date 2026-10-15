import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ItemApi, ItemsChanged } from '@entities/item';
import { errorText } from '@shared/api';
import { ToastService } from '@shared/ui';

const MAX = 200;

@Injectable({ providedIn: 'root' })
export class PrintPassport {
  private readonly api = inject(ItemApi);
  private readonly changed = inject(ItemsChanged);
  private readonly toast = inject(ToastService);

  readonly busy = signal(false);

  async print(ids: number[]): Promise<void> {
    if (!ids.length || this.busy()) return;
    if (ids.length > MAX) {
      this.toast.error(`За раз можно напечатать не больше ${MAX} паспортов.`);
      return;
    }
    // Вкладку открываем сразу по клику, иначе браузер заблокирует её как всплывающее окно.
    const tab = window.open('', '_blank');
    tab?.document.write('<p style="font-family: sans-serif; padding: 24px">Готовим паспорт…</p>');
    this.busy.set(true);
    try {
      const pdf = await firstValueFrom(this.api.passports(ids));
      const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      this.changed.notify();
    } catch (err) {
      tab?.close();
      this.toast.error(errorText(await readBlobError(err), 'Не удалось подготовить паспорт.'));
    } finally {
      this.busy.set(false);
    }
  }
}

async function readBlobError(err: unknown): Promise<unknown> {
  if (!(err instanceof HttpErrorResponse) || !(err.error instanceof Blob)) return err;
  try {
    return new HttpErrorResponse({ error: JSON.parse(await err.error.text()), status: err.status });
  } catch {
    return err;
  }
}
