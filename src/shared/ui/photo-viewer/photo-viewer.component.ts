import { Component, inject } from '@angular/core';
import { Download, LucideAngularModule, X } from 'lucide-angular';
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
        <!-- показываем JPEG: «Сохранить картинку как…» тоже даст JPEG с названием ткани -->
        <img [src]="photo.jpeg || photo.src" [alt]="photo.title" class="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl" (click)="$event.stopPropagation()" />
        <div class="flex flex-wrap items-center justify-center gap-3" (click)="$event.stopPropagation()">
          <p class="text-sm font-medium text-white">{{ photo.title }}</p>
          @if (photo.jpeg) {
            <a [href]="photo.jpeg" [attr.download]="photo.title + '.jpg'" class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-sm font-medium text-white hover:bg-white/20">
              <span class="flex"><lucide-icon [img]="downloadIcon" [size]="16" /></span>
              Скачать JPG
            </a>
          }
        </div>
      </div>
    }
  `,
})
export class PhotoViewerComponent {
  readonly viewer = inject(PhotoViewer);
  readonly closeIcon = X;
  readonly downloadIcon = Download;
}
