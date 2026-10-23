import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { SessionStore } from '@entities/session';
import { ItemForm } from '@features/item-form';
import { UserMenuComponent } from './user-menu.component';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, UserMenuComponent],
  host: { '(document:keydown)': 'hotkey($event)' },
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent {
  readonly session = inject(SessionStore);
  readonly itemForm = inject(ItemForm);
  private readonly router = inject(Router);

  readonly search = viewChild<ElementRef<HTMLInputElement>>('search');
  readonly query = signal('');
  private timer?: ReturnType<typeof setTimeout>;

  readonly nav = [
    { path: '/production', title: 'Производство' },
    { path: '/fabrics', title: 'Ткани' },
    { path: '/reports', title: 'Отчёты' },
    { path: '/claims', title: 'Рекламации' },
    { path: '/journal', title: 'Журнал' },
    { path: '/refs', title: 'Справочники' },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        const onProduction = this.router.url.startsWith('/production');
        const q = onProduction ? (this.router.parseUrl(this.router.url).queryParams['q'] ?? '') : '';
        if (q !== this.query()) this.query.set(q);
      });
  }

  type(value: string) {
    this.query.set(value);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const q = value.trim();
      const onProduction = this.router.url.startsWith('/production');
      const current = onProduction ? this.router.parseUrl(this.router.url).queryParams : {};
      this.router.navigate(['/production'], {
        // новый поиск — снова по всем этапам, иначе прошлый выбор этапа незаметно сужал бы результат
        queryParams: { ...current, q: q || null, in: null, item: null, page: null },
        replaceUrl: onProduction,
      });
    }, 250);
  }

  hotkey(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    if (event.key === '/' && !typing) {
      event.preventDefault();
      this.search()?.nativeElement.focus();
    }
  }
}
