import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Download, LucideAngularModule, TriangleAlert } from 'lucide-angular';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { firstValueFrom, lastValueFrom, tap } from 'rxjs';
import { BackupApi, BackupCopy, BackupOverview, BackupPart } from '@entities/backup';
import { SessionStore } from '@entities/session';
import { errorText } from '@shared/api';
import { fmtDateTime } from '@shared/lib';
import { ModalComponent, ToastService } from '@shared/ui';

const CONFIRM_WORD = 'ВОССТАНОВИТЬ';
const POLL_MS = 3000;

function size(bytes: number | null): string {
  if (bytes === null) return '—';
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const digits = value < 10 && unit > 0 ? 1 : 0;
  return `${value.toFixed(digits).replace('.', ',')} ${units[unit]}`;
}

@Component({
  selector: 'app-backups-page',
  imports: [FormsModule, LucideAngularModule, ModalComponent],
  templateUrl: './backups.page.html',
})
export class BackupsPage {
  private readonly api = inject(BackupApi);
  private readonly toast = inject(ToastService);
  readonly allowed = inject(SessionStore).can('backups');

  readonly data = signal<BackupOverview | null>(null);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly restoring = signal<BackupCopy | null>(null);
  confirm = '';

  readonly editingSchedule = signal(false);
  scheduleAt = '';
  scheduleKeep = 14;

  readonly uploading = signal(false);
  readonly uploadOpen = signal(false);
  readonly progress = signal<number | null>(null);
  dbFile: File | null = null;
  mediaFile: File | null = null;

  readonly busy = computed(() => {
    const d = this.data();
    return !!d && (d.state.state !== 'idle' || d.queued.length > 0);
  });
  readonly busyText = computed(() => {
    const d = this.data();
    if (!d) return '';
    if (d.state.state !== 'idle') return d.state.text || 'Служба копий работает…';
    const soon: Record<string, string> = {
      restore: 'Восстановление начнётся через несколько секунд…',
      import: 'Загруженный файл скоро будет проверен…',
    };
    return soon[d.queued[0]] ?? 'Копия начнётся через несколько секунд…';
  });

  readonly downloadIcon = Download;
  readonly alertIcon = TriangleAlert;
  readonly confirmWord = CONFIRM_WORD;
  readonly fmt = fmtDateTime;
  readonly size = size;
  readonly historyLabel: Partial<Record<string, string>> = { backup: 'Копия', restore: 'Восстановление', import: 'Загрузка из файла' };

  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
    if (this.allowed) this.load();
  }

  async load() {
    clearTimeout(this.timer);
    this.loading.set(true);
    try {
      this.data.set(await firstValueFrom(this.api.overview()));
    } catch (err) {
      // во время восстановления вместо ошибки — заглушка на весь экран
      const maintenance = err instanceof HttpErrorResponse && err.status === 503;
      if (!maintenance) this.toast.error(errorText(err, 'Не удалось загрузить список копий.'));
    } finally {
      this.loading.set(false);
    }
    if (this.busy()) this.timer = setTimeout(() => this.load(), POLL_MS);
  }

  async backupNow() {
    this.sending.set(true);
    try {
      this.data.set(await firstValueFrom(this.api.backupNow()));
      this.toast.show('Копия поставлена в очередь — займёт около минуты.');
      this.timer = setTimeout(() => this.load(), POLL_MS);
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось запустить копию.'));
    } finally {
      this.sending.set(false);
    }
  }

  async download(copy: BackupCopy, part: BackupPart) {
    try {
      // обновит вход, если он истёк: дальше браузер качает файл сам, без нашего перехватчика
      await firstValueFrom(this.api.overview());
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось скачать копию.'));
      return;
    }
    const a = document.createElement('a');
    a.href = this.api.downloadUrl(copy.stamp, part);
    a.download = '';
    a.click();
  }

  editSchedule() {
    const d = this.data();
    if (!d) return;
    this.scheduleAt = d.at;
    this.scheduleKeep = d.keep_days;
    this.editingSchedule.set(true);
  }

  async saveSchedule() {
    this.sending.set(true);
    try {
      this.data.set(await firstValueFrom(this.api.saveSchedule(this.scheduleAt, Number(this.scheduleKeep))));
      this.editingSchedule.set(false);
      this.toast.show('Расписание сохранено.');
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось сохранить расписание.'));
    } finally {
      this.sending.set(false);
    }
  }

  openUpload() {
    this.dbFile = null;
    this.mediaFile = null;
    this.progress.set(null);
    this.uploadOpen.set(true);
  }

  pick(event: Event, kind: 'db' | 'media') {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (kind === 'db') this.dbFile = file;
    else this.mediaFile = file;
  }

  async upload() {
    if (!this.dbFile) return;
    this.uploading.set(true);
    this.progress.set(0);
    try {
      const events = this.api.upload(this.dbFile, this.mediaFile).pipe(
        tap((e) => {
          if (e.type === HttpEventType.UploadProgress && e.total) this.progress.set(Math.round((e.loaded / e.total) * 100));
          if (e.type === HttpEventType.Response && e.body) this.data.set(e.body);
        }),
      );
      await lastValueFrom(events);
      this.uploadOpen.set(false);
      this.toast.show('Файл загружен — служба копий проверит его и добавит в список.');
      this.timer = setTimeout(() => this.load(), POLL_MS);
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось загрузить файл.'));
    } finally {
      this.uploading.set(false);
      this.progress.set(null);
    }
  }

  askRestore(copy: BackupCopy) {
    this.confirm = '';
    this.restoring.set(copy);
  }

  confirmed(): boolean {
    return this.confirm.trim().toUpperCase() === CONFIRM_WORD;
  }

  async restore() {
    const copy = this.restoring();
    if (!copy || !this.confirmed()) return;
    this.sending.set(true);
    try {
      this.data.set(await firstValueFrom(this.api.restore(copy.stamp, this.confirm)));
      this.restoring.set(null);
      this.timer = setTimeout(() => this.load(), POLL_MS);
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось запустить восстановление.'));
    } finally {
      this.sending.set(false);
    }
  }
}
