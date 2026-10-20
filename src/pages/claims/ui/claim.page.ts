import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { Claim, ClaimApi, ClaimFields, ClaimFile, ClaimPhoto } from '@entities/claim';
import { EmployeeApi } from '@entities/employee';
import { Item, ItemApi } from '@entities/item';
import { SessionStore } from '@entities/session';
import { errorText } from '@shared/api';
import { fmtDateTime, openPdf } from '@shared/lib';
import { ToastService } from '@shared/ui';

type FormFields = Omit<ClaimFields, 'video_links'>;
type TextKey = keyof FormFields;

interface Field {
  key: TextKey;
  label: string;
  kind?: 'text' | 'area' | 'date' | 'money';
  placeholder?: string;
  wide?: boolean;
}

const EMPTY: FormFields = {
  act_date: null, manager: null, counterparty: '', item: null, product: '', item_number: '', color: '', part: '',
  description: '', package_data: '', waybill: '', sender: '', invoice_price: null, customer_shipped_at: null,
  demands: '', claim_type: 'review', arrived_at: null, kit: '', sent_back_at: null, appearance: '', research: '',
  defect_type: '', remedy: '', restore_cost: null, finance_note: '',
};

const MAX_MB = 15;
const MONEY = new Set(['invoice_price', 'restore_cost']);
const NULLABLE = new Set(['act_date', 'customer_shipped_at', 'arrived_at', 'sent_back_at', 'manager', 'item']);

@Component({
  selector: 'app-claim-page',
  imports: [FormsModule, RouterLink, NgTemplateOutlet],
  templateUrl: './claim.page.html',
})
export class ClaimPage {
  private readonly api = inject(ClaimApi);
  private readonly items = inject(ItemApi);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly canEdit = inject(SessionStore).can('claims');
  readonly choices = toSignal(this.api.choices());
  readonly employees = toSignal(inject(EmployeeApi).list(), { initialValue: [] });
  readonly fmtTime = fmtDateTime;
  readonly maxMb = MAX_MB;

  readonly clientFields: Field[] = [
    { key: 'product', label: 'Изделие', placeholder: 'Например, Диван Дуглас Н 1400 (накладки венге)', wide: true },
    { key: 'item_number', label: 'Номер изделия', placeholder: 'Например, 26/0048 или 9578/ЗАК' },
    { key: 'color', label: 'Цвет, ткани', placeholder: 'Например, Арбен Ultra grafit' },
    { key: 'part', label: 'Деталь', kind: 'area' },
    { key: 'description', label: 'Описание претензии', kind: 'area' },
    { key: 'package_data', label: 'Данные с упаковки', kind: 'area' },
    { key: 'waybill', label: '№ ТН и дата отгрузки' },
    { key: 'invoice_price', label: 'Цена по накладной, ₽', kind: 'money' },
    { key: 'customer_shipped_at', label: 'Дата отгрузки конечному покупателю', kind: 'date' },
    { key: 'demands', label: 'Требования покупателя', kind: 'area', wide: true },
  ];
  readonly managerFields: Field[] = [
    { key: 'arrived_at', label: 'Дата поступления на склад', kind: 'date' },
    { key: 'sent_back_at', label: 'Дата отправки покупателю', kind: 'date' },
    { key: 'kit', label: 'Комплектация', kind: 'area', wide: true },
  ];
  readonly masterFields: Field[] = [
    { key: 'appearance', label: 'Внешний вид поступившего изделия', kind: 'area' },
    { key: 'research', label: 'Результаты исследований', kind: 'area' },
    { key: 'remedy', label: 'Меры по устранению', kind: 'area', wide: true },
  ];

  readonly claim = signal<Claim | null>(null);
  readonly loaded = signal(false);
  readonly saving = signal(false);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  form: FormFields = { ...EMPTY };
  readonly linked = signal<{ id: number; number: string; available: boolean } | null>(null);

  readonly itemQuery = signal('');
  readonly itemResults = signal<Item[]>([]);
  readonly searchingItems = signal(false);
  private itemTimer?: ReturnType<typeof setTimeout>;

  readonly title = computed(() => (this.claim() ? `Акт-претензия № ${this.claim()!.number}` : 'Новая рекламация'));
  readonly photos = computed<ClaimPhoto[]>(() => this.claim()?.photos ?? []);

  constructor() {
    this.init();
  }

  private async init() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    try {
      if (id) {
        this.fill(await firstValueFrom(this.api.get(id)));
      } else {
        const itemId = Number(this.route.snapshot.queryParamMap.get('item'));
        if (itemId) await this.linkItem(itemId);
      }
    } catch (err) {
      this.error.set(errorText(err, 'Не удалось открыть рекламацию.'));
    } finally {
      this.loaded.set(true);
    }
  }

  private fill(claim: Claim) {
    this.claim.set(claim);
    this.links.set(claim.video_links ?? []);
    this.linked.set(claim.item);
    const form = { ...EMPTY };
    for (const key of Object.keys(EMPTY) as TextKey[]) {
      if (key === 'manager') form.manager = claim.manager?.id ?? null;
      else if (key === 'item') form.item = claim.item?.id ?? null;
      else (form as unknown as Record<string, unknown>)[key] = (claim as unknown as Record<string, unknown>)[key] ?? (EMPTY as unknown as Record<string, unknown>)[key];
    }
    this.form = form;
  }

  value(key: TextKey): string {
    const v = this.form[key];
    return v === null || v === undefined ? '' : String(v);
  }

  setValue(key: TextKey, value: string) {
    (this.form as unknown as Record<string, unknown>)[key] = value;
  }

  searchItems(text: string) {
    this.itemQuery.set(text);
    clearTimeout(this.itemTimer);
    if (!text.trim()) {
      this.itemResults.set([]);
      return;
    }
    this.itemTimer = setTimeout(async () => {
      this.searchingItems.set(true);
      try {
        const page = await firstValueFrom(this.items.list({ q: text.trim(), limit: 8 }));
        this.itemResults.set(page.results);
      } finally {
        this.searchingItems.set(false);
      }
    }, 300);
  }

  async linkItem(id: number) {
    const item = await firstValueFrom(this.items.get(id));
    this.form.item = item.id;
    this.linked.set({ id: item.id, number: item.number, available: true });
    if (!this.form.product) this.form.product = item.extra ? `${item.title}, ${item.extra}` : item.title;
    if (!this.form.item_number) this.form.item_number = item.number;
    if (!this.form.color) this.form.color = item.fabrics.map((f) => f.fabric.name).join(', ');
    if (!this.form.counterparty) this.form.counterparty = item.reserve;
    this.itemQuery.set('');
    this.itemResults.set([]);
  }

  unlink() {
    this.form.item = null;
    this.linked.set(null);
  }

  private body(): Partial<ClaimFields> {
    const body: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(this.form)) {
      const empty = value === '' || value === null || value === undefined;
      if (MONEY.has(key)) body[key] = empty ? null : String(value).replace(',', '.').replace(/\s/g, '');
      else if (NULLABLE.has(key)) body[key] = empty ? null : value;
      else body[key] = value ?? '';
    }
    body['video_links'] = this.links();
    return body as Partial<ClaimFields>;
  }

  readonly links = signal<string[]>([]);
  readonly linkDraft = signal('');
  readonly linkError = signal<string | null>(null);
  readonly files = computed<ClaimFile[]>(() => this.claim()?.files ?? []);
  readonly uploadingFile = signal(false);

  addLink() {
    const link = this.linkDraft().trim();
    if (!link) return;
    if (!/^https?:\/\/\S+$/.test(link)) {
      this.linkError.set('Это не ссылка: она начинается с http:// или https://');
      return;
    }
    if (!this.links().includes(link)) this.links.set([...this.links(), link]);
    this.linkDraft.set('');
    this.linkError.set(null);
  }

  removeLink(link: string) {
    this.links.set(this.links().filter((l) => l !== link));
  }

  async addFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    const claim = this.claim();
    if (!claim || !files.length) return;
    this.uploadingFile.set(true);
    try {
      const added: ClaimFile[] = [];
      for (const file of files) {
        if (file.size > MAX_MB * 1024 * 1024) {
          this.toast.error(`«${file.name}» больше ${MAX_MB} МБ — пропущен`);
          continue;
        }
        added.push(await firstValueFrom(this.api.addFile(claim.id, file)));
      }
      const current = this.claim()!;
      this.claim.set({ ...current, files: [...current.files, ...added] });
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось загрузить файл.'));
    } finally {
      this.uploadingFile.set(false);
    }
  }

  async removeFile(file: ClaimFile) {
    const claim = this.claim();
    if (!claim) return;
    try {
      await firstValueFrom(this.api.deleteFile(claim.id, file.id));
      this.claim.set({ ...claim, files: claim.files.filter((f) => f.id !== file.id) });
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось убрать файл.'));
    }
  }

  fileSize(bytes: number): string {
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ` : `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  }

  async save() {
    this.saving.set(true);
    this.error.set(null);
    try {
      const current = this.claim();
      const saved = await firstValueFrom(current ? this.api.update(current.id, this.body()) : this.api.create(this.body()));
      this.fill(saved);
      this.toast.show(current ? `Акт ${saved.number} сохранён` : `Рекламация заведена, акт ${saved.number}`);
      if (!current) this.router.navigate(['/claims', saved.id], { replaceUrl: true });
    } catch (err) {
      this.error.set(errorText(err, 'Не удалось сохранить.'));
    } finally {
      this.saving.set(false);
    }
  }

  async addPhotos(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    const claim = this.claim();
    if (!claim || !files.length) return;
    const tooBig = files.filter((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig.length) this.toast.error(`Больше ${MAX_MB} МБ, пропущено: ${tooBig.map((f) => f.name).join(', ')}`);
    this.uploading.set(true);
    try {
      for (const file of files.filter((f) => f.size <= MAX_MB * 1024 * 1024)) {
        await firstValueFrom(this.api.addPhoto(claim.id, file));
      }
      this.fill(await firstValueFrom(this.api.get(claim.id)));
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось загрузить фото.'));
    } finally {
      this.uploading.set(false);
    }
  }

  async removePhoto(photo: ClaimPhoto) {
    const claim = this.claim();
    if (!claim) return;
    try {
      await firstValueFrom(this.api.deletePhoto(claim.id, photo.id));
      this.claim.set({ ...claim, photos: claim.photos.filter((p) => p.id !== photo.id) });
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось убрать фото.'));
    }
  }

  readonly closing = signal(false);
  readonly closeState = signal<'done' | 'withdrawn'>('done');
  readonly closeNote = signal('');
  readonly stateBusy = signal(false);

  startClose() {
    this.closeState.set('done');
    this.closeNote.set('');
    this.closing.set(true);
  }

  async close() {
    await this.changeState((id) => this.api.close(id, this.closeState(), this.closeNote()), 'закрыта');
    this.closing.set(false);
  }

  reopen() {
    return this.changeState((id) => this.api.reopen(id), 'снова открыта');
  }

  // меняем только состояние: несохранённые правки в полях акта не трогаем
  private async changeState(request: (id: number) => Observable<Claim>, done: string) {
    const claim = this.claim();
    if (!claim) return;
    this.stateBusy.set(true);
    try {
      const r = await firstValueFrom(request(claim.id));
      this.claim.set({ ...claim, state: r.state, state_label: r.state_label, closed_at: r.closed_at, closed_by: r.closed_by, close_note: r.close_note, updated_at: r.updated_at, updated_by: r.updated_by });
      this.toast.show(`Рекламация ${r.number} ${done}`);
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось изменить состояние.'));
    } finally {
      this.stateBusy.set(false);
    }
  }

  async act() {
    const claim = this.claim();
    if (!claim) return;
    try {
      await openPdf(() => firstValueFrom(this.api.pdf(claim.id)));
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось подготовить акт.'));
    }
  }
}
