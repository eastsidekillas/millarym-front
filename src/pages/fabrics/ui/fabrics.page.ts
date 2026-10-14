import { Component, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CatalogApi, Fabric, FabricQuery } from '@entities/catalog';
import { SessionStore } from '@entities/session';
import { FabricForm, FabricFormComponent } from '@features/fabric-form';
import { errorText } from '@shared/api';
import { ModalComponent, ToastService } from '@shared/ui';

const PAGE = 48;

@Component({
  selector: 'app-fabrics-page',
  imports: [FabricFormComponent, ModalComponent],
  templateUrl: './fabrics.page.html',
})
export class FabricsPage {
  private readonly api = inject(CatalogApi);
  private readonly toast = inject(ToastService);
  readonly session = inject(SessionStore);
  readonly form = inject(FabricForm);

  readonly search = signal('');
  readonly ordering = signal<NonNullable<FabricQuery['ordering']>>('name');
  readonly showHidden = signal(false);
  readonly fabrics = signal<Fabric[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly viewing = signal<Fabric | null>(null);

  private timer?: ReturnType<typeof setTimeout>;
  private request = 0;

  constructor() {
    effect(() => {
      const query = this.query();
      this.form.saved();
      untracked(() => this.load(query));
    });
  }

  private query(): FabricQuery {
    return {
      search: this.search().trim(),
      ordering: this.ordering(),
      active: this.showHidden() ? null : true,
    };
  }

  type(value: string) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.search.set(value), 250);
  }

  async load(query: FabricQuery, append = false) {
    const id = ++this.request;
    this.loading.set(true);
    try {
      const page = await firstValueFrom(
        this.api.fabricPage({ ...query, limit: PAGE, offset: append ? this.fabrics().length : 0 }),
      );
      if (id !== this.request) return;
      this.fabrics.set(append ? [...this.fabrics(), ...page.results] : page.results);
      this.total.set(page.count);
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось загрузить ткани.'));
    } finally {
      if (id === this.request) this.loading.set(false);
    }
  }

  more() {
    this.load(this.query(), true);
  }

  open(fabric: Fabric) {
    if (this.session.can('fabrics')) this.form.edit(fabric);
    else if (fabric.photo) this.viewing.set(fabric);
  }

  swatch(name: string): string {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `hsl(${h} 22% 62%)`;
  }
}
