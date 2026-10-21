import { Component, ElementRef, computed, inject, signal, viewChildren } from '@angular/core';
import { Router } from '@angular/router';
import { ChevronDown, CircleUserRound, DatabaseBackup, KeyRound, LogOut, LucideAngularModule } from 'lucide-angular';
import { SessionStore } from '@entities/session';
import { ChangePassword } from '@features/change-password';
import { Logout } from '@features/logout';

@Component({
  selector: 'app-user-menu',
  imports: [LucideAngularModule],
  host: { class: 'relative', '(document:click)': 'outside($event)', '(keydown.escape)': 'close(true)' },
  template: `
    @if (me(); as me) {
      <button
        #trigger
        type="button"
        class="flex h-10 items-center gap-2 rounded-md px-2 text-left hover:bg-sub"
        aria-haspopup="menu"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="'Меню: ' + me.short_name"
        (click)="toggle()"
        (keydown.arrowDown)="$event.preventDefault(); show()"
      >
        <span class="flex text-muted lg:hidden"><lucide-icon [img]="userIcon" [size]="20" /></span>
        <span class="hidden leading-tight lg:block">
          <span class="block text-sm font-medium">{{ me.short_name }}</span>
          <span class="block text-xs text-muted">{{ me.role }}</span>
        </span>
        <span class="flex text-muted transition-transform" [class.rotate-180]="open()"><lucide-icon [img]="chevron" /></span>
      </button>
      @if (open()) {
        <div class="absolute right-0 top-full z-40 mt-1 w-60 rounded-lg border border-line bg-surface py-1 shadow-[0_4px_12px_rgb(0_0_0/.08)]" role="menu" [attr.aria-label]="me.short_name">
          <div class="border-b border-line px-3 pb-2 pt-1.5 lg:hidden">
            <div class="text-sm font-medium">{{ me.short_name }}</div>
            <div class="text-xs text-muted">{{ me.role }}</div>
          </div>
          <button #item type="button" role="menuitem" class="menu-item" (click)="changePassword()" (keydown)="move($event, 0)">
            <span class="flex text-muted"><lucide-icon [img]="keyIcon" /></span>
            Сменить пароль
          </button>
          @if (canBackups) {
            <button #item type="button" role="menuitem" class="menu-item" (click)="openBackups()" (keydown)="move($event, 1)">
              <span class="flex text-muted"><lucide-icon [img]="backupIcon" /></span>
              Резервные копии
            </button>
          }
          <button #item type="button" role="menuitem" class="menu-item" (click)="logout.run()" (keydown)="move($event, canBackups ? 2 : 1)">
            <span class="flex text-muted"><lucide-icon [img]="logoutIcon" /></span>
            Выйти
          </button>
        </div>
      }
    }
  `,
})
export class UserMenuComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly session = inject(SessionStore);
  private readonly password = inject(ChangePassword);
  readonly logout = inject(Logout);

  private readonly router = inject(Router);
  readonly me = computed(() => this.session.me());
  readonly canBackups = this.session.can('backups');
  readonly open = signal(false);
  private readonly items = viewChildren<ElementRef<HTMLButtonElement>>('item');
  private readonly trigger = viewChildren<ElementRef<HTMLButtonElement>>('trigger');

  readonly userIcon = CircleUserRound;
  readonly chevron = ChevronDown;
  readonly keyIcon = KeyRound;
  readonly logoutIcon = LogOut;
  readonly backupIcon = DatabaseBackup;

  toggle() {
    if (this.open()) this.close();
    else this.show();
  }

  show() {
    this.open.set(true);
    setTimeout(() => this.items()[0]?.nativeElement.focus());
  }

  close(returnFocus = false) {
    if (!this.open()) return;
    this.open.set(false);
    if (returnFocus) this.trigger()[0]?.nativeElement.focus();
  }

  move(event: KeyboardEvent, index: number) {
    const items = this.items();
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next].nativeElement.focus();
  }

  changePassword() {
    this.close();
    this.password.open();
  }

  openBackups() {
    this.close();
    this.router.navigate(['/backups']);
  }

  outside(event: Event) {
    if (!this.host.nativeElement.contains(event.target as Node)) this.close();
  }
}
