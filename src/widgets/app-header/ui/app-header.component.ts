import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SessionStore } from '@entities/session';
import { LogoutButtonComponent } from '@features/logout';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, LogoutButtonComponent],
  templateUrl: './app-header.component.html',
})
export class AppHeaderComponent {
  readonly session = inject(SessionStore);

  readonly nav = [
    { path: '/production', title: 'Производство' },
    { path: '/fabrics', title: 'Ткани' },
    { path: '/reports', title: 'Отчёты' },
    { path: '/journal', title: 'Журнал' },
    { path: '/refs', title: 'Справочники' },
  ];
}
