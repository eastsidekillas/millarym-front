import { Component, inject, input } from '@angular/core';
import { PhotoViewer } from '@shared/ui';
import { ItemFabric } from '../model/item.types';

@Component({
  selector: 'app-fabric-list',
  template: `
    <div class="flex flex-wrap gap-x-3 gap-y-1">
      @for (f of fabrics(); track f.slot) {
        <span class="inline-flex items-center gap-1.5 text-[13px]" [title]="f.slot_label">
          @if (f.fabric.photo_thumb) {
            <!-- строка таблицы открывает карточку — клик по образцу её не открывает -->
            <button type="button" class="flex flex-none rounded hover:ring-2 hover:ring-accent" [attr.aria-label]="'Фото ткани ' + f.fabric.name" (click)="$event.stopPropagation(); show(f)">
              <img [src]="f.fabric.photo_thumb" alt="" class="h-4 w-4 rounded object-cover ring-1 ring-black/10" loading="lazy" />
            </button>
          } @else {
            <span class="h-4 w-4 flex-none rounded ring-1 ring-black/10" [style.background]="swatch(f.fabric.name)"></span>
          }
          <span>{{ f.fabric.name }}</span>
        </span>
      }
    </div>
  `,
})
export class FabricListComponent {
  private readonly viewer = inject(PhotoViewer);
  readonly fabrics = input.required<ItemFabric[]>();

  show(f: ItemFabric) {
    this.viewer.open(f.fabric.photo ?? f.fabric.photo_thumb ?? '', f.fabric.name, f.fabric.photo_jpeg);
  }

  swatch(name: string): string {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `hsl(${h} 28% 52%)`;
  }
}
