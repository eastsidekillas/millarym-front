import { Component, inject } from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';
import { PhotoViewer } from './photo-viewer.service';

@Component({
  selector: 'app-photo-viewer',
  imports: [LucideAngularModule],
  host: { '(document:keydown.escape)': 'viewer.close()' },
  template: `
    @if (viewer.current(); as photo) {
      <div class="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/85 p-4" role="dialog" aria-modal="true" [attr.aria-label]="photo.title" (click)="viewer.close()">
        <button type="button" class="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white" aria-label="Закрыть" (click)="viewer.close()">
          <lucide-icon [img]="closeIcon" [size]="22" />
        </button>
        <img [src]="photo.src" [alt]="photo.title" class="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl" (click)="$event.stopPropagation()" />
        <p class="text-sm font-medium text-white">{{ photo.title }}</p>
      </div>
    }
  `,
})
export class PhotoViewerComponent {
  readonly viewer = inject(PhotoViewer);
  readonly closeIcon = X;
}
