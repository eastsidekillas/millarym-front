import { Component, input } from '@angular/core';
import { ItemFabric } from '../model/item.types';

@Component({
  selector: 'app-fabric-list',
  template: `
    <div class="flex flex-wrap gap-x-3 gap-y-1">
      @for (f of fabrics(); track f.slot) {
        <span class="inline-flex items-center gap-1.5 text-xs" [title]="f.slot_label">
          @if (f.fabric.photo_thumb) {
            <img [src]="f.fabric.photo_thumb" alt="" class="h-4 w-4 flex-none rounded object-cover ring-1 ring-black/10" loading="lazy" />
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
  readonly fabrics = input.required<ItemFabric[]>();

  swatch(name: string): string {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `hsl(${h} 28% 52%)`;
  }
}
