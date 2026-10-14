import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';

/** Каркас приложения (spec 08 §2.1): шапка + содержимое страницы. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  readonly auth = inject(AuthService);

  readonly nav = [
    { path: '/production', title: 'Производство' },
    { path: '/fabrics', title: 'Ткани' },
    { path: '/reports', title: 'Отчёты' },
    { path: '/journal', title: 'Журнал' },
    { path: '/refs', title: 'Справочники' },
  ];
}
