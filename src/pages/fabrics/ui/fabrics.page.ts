import { Component, effect, inject, signal, untracked } from '@angular/core';
import { LucideAngularModule, Maximize2 } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { CatalogApi, Fabric, FabricQuery } from '@entities/catalog';
import { SessionStore } from '@entities/session';
import { FabricForm, FabricFormComponent } from '@features/fabric-form';
import { errorText } from '@shared/api';
import { PaginatorComponent, PhotoViewer, ToastService } from '@shared/ui';

const PAGE = 48;

@Component({
  selector: 'app-fabrics-page',
  imports: [FabricFormComponent, PaginatorComponent, LucideAngularModule],
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
  readonly page = signal(1);
  readonly pageSize = PAGE;
  readonly loading = signal(false);
  private readonly viewer = inject(PhotoViewer);
  readonly zoomIcon = Maximize2;

  private timer?: ReturnType<typeof setTimeout>;
  private request = 0;

  constructor() {
    effect(() => {
      this.search();
      this.ordering();
      this.showHidden();
      untracked(() => this.page.set(1));
    });
    effect(() => {
      const query = this.query();
      const page = this.page();
      this.form.saved();
      untracked(() => this.load(query, page));
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

  async load(query: FabricQuery, page: number) {
    const id = ++this.request;
    this.loading.set(true);
    try {
      const result = await firstValueFrom(
        this.api.fabricPage({ ...query, limit: PAGE, offset: (page - 1) * PAGE }),
      );
      if (id !== this.request) return;
      this.fabrics.set(result.results);
      this.total.set(result.count);
    } catch (err) {
      this.toast.error(errorText(err, 'Не удалось загрузить ткани.'));
    } finally {
      if (id === this.request) this.loading.set(false);
    }
  }

  setPage(page: number) {
    this.page.set(page);
    window.scrollTo({ top: 0 });
  }

  get canEdit(): boolean {
    return this.session.can('fabrics');
  }

  open(fabric: Fabric) {
    if (this.canEdit) this.form.edit(fabric);
    else this.zoom(fabric);
  }

  zoom(fabric: Fabric) {
    if (fabric.photo) this.viewer.open(fabric.photo, fabric.name);
  }

  swatch(name: string): string {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `hsl(${h} 22% 62%)`;
  }
}
