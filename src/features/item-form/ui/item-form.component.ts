import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CatalogApi, FabricPickerComponent, KitOption, PickedFabric } from '@entities/catalog';
import { FABRIC_SLOTS, FabricInput, FabricSlot, ItemApi, ItemsChanged, STAGE_NAME } from '@entities/item';
import { errorText } from '@shared/api';
import { ModalComponent, ToastService } from '@shared/ui';
import { ItemForm } from '../model/item-form.service';

interface SlotRow {
  slot: FabricSlot;
  label: string;
  fabric: PickedFabric | null;
  meters: string;
}

function kitGroup(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('угол')) return 'angle';
  if (n.includes('накладк')) return 'trim';
  return n;
}

@Component({
  selector: 'app-item-form',
  imports: [FormsModule, ModalComponent, FabricPickerComponent],
  templateUrl: './item-form.component.html',
})
export class ItemFormComponent {
  readonly form = inject(ItemForm);
  private readonly api = inject(ItemApi);
  private readonly catalog = inject(CatalogApi);
  private readonly changed = inject(ItemsChanged);
  private readonly toast = inject(ToastService);

  readonly models = toSignal(this.catalog.models(), { initialValue: [] });
  readonly kit = toSignal(this.catalog.kitOptions(), { initialValue: [] as KitOption[] });

  readonly editing = computed(() => {
    const s = this.form.state();
    return s?.mode === 'edit' ? s.item : null;
  });

  modelId: number | null = null;
  readonly extra = signal('');
  reserve = signal('');
  indiv = signal(false);
  indivNote = '';
  comment = '';
  qty = 1;
  slots: SlotRow[] = [];
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const state = this.form.state();
      if (state) this.reset();
    });
  }

  private reset() {
    const item = this.editing();
    this.error.set(null);
    this.modelId = item?.model.id ?? null;
    this.extra.set(item?.extra ?? '');
    this.reserve.set('');
    this.indiv.set(item?.indiv ?? false);
    this.indivNote = item?.indiv_note ?? '';
    this.comment = item?.comment ?? '';
    this.qty = 1;
    this.slots = FABRIC_SLOTS.map(({ slot, label }) => {
      const f = item?.fabrics.find((x) => x.slot === slot);
      return {
        slot,
        label,
        fabric: f ? { id: f.fabric.id, name: f.fabric.name, photo_thumb: f.fabric.photo_thumb } : null,
        meters: f?.meters ? String(Number(f.meters)) : '',
      };
    });
  }

  toggleKit(option: KitOption) {
    const group = kitGroup(option.name);
    const same = this.kit()
      .filter((k) => kitGroup(k.name) === group)
      .map((k) => k.name.toLowerCase());
    let parts = this.extra()
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    const had = parts.some((p) => p.toLowerCase() === option.name.toLowerCase());
    parts = parts.filter((p) => !same.includes(p.toLowerCase()));
    if (!had) parts.push(option.name.toLowerCase());
    this.extra.set(parts.join(', '));
  }

  kitOn(option: KitOption): boolean {
    return this.extra()
      .split(',')
      .some((p) => p.trim().toLowerCase() === option.name.toLowerCase());
  }

  private fabrics(): FabricInput[] | null {
    const rows = this.slots.filter((r) => r.fabric);
    if (!this.slots[0].fabric) {
      this.error.set('Выберите основную ткань из справочника.');
      return null;
    }
    const bad = this.slots.find((r) => r.meters.trim() && isNaN(Number(r.meters.replace(',', '.'))));
    if (bad) {
      this.error.set(`Метраж «${bad.label}» — число, например 12,5.`);
      return null;
    }
    return rows.map((r) => ({
      slot: r.slot,
      fabric: r.fabric!.id,
      meters: r.meters.trim() ? r.meters.replace(',', '.').trim() : null,
    }));
  }

  async submit() {
    this.error.set(null);
    if (!this.modelId) {
      this.error.set('Выберите модель.');
      return;
    }
    const fabrics = this.fabrics();
    if (!fabrics) return;
    this.saving.set(true);
    try {
      const item = this.editing();
      if (item) {
        await firstValueFrom(
          this.api.update(item.id, {
            model: this.modelId,
            extra: this.extra(),
            indiv: this.indiv(),
            indiv_note: this.indivNote,
            comment: this.comment,
            fabrics,
          }),
        );
        this.toast.show(`${item.number}: изменения сохранены`);
      } else {
        const created = await firstValueFrom(
          this.api.create({
            model: this.modelId,
            extra: this.extra(),
            reserve: this.reserve(),
            indiv: this.indiv(),
            indiv_note: this.indivNote,
            comment: this.comment,
            qty: Math.max(1, Math.min(50, Number(this.qty) || 1)),
            fabrics,
          }),
        );
        const numbers = created.map((i) => i.number).join(', ');
        this.toast.show(`${created.length > 1 ? 'Созданы' : 'Создано'}: ${numbers} → ${STAGE_NAME[created[0].stage]}`);
        this.form.created.set(created);
      }
      this.changed.notify();
      this.form.close();
    } catch (err) {
      this.error.set(errorText(err));
    } finally {
      this.saving.set(false);
    }
  }
}
