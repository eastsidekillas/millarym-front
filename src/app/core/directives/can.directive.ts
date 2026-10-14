import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';
import { RightCode } from '@core/auth/auth.models';

/**
 * Показывает элемент, только если у пользователя есть право.
 *   <button *appCan="'ship'">Отгрузить</button>
 * Сервер всё равно проверяет право сам — это только чтобы не показывать лишнее.
 */
@Directive({ selector: '[appCan]' })
export class CanDirective {
  private readonly auth = inject(AuthService);
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);

  readonly appCan = input.required<RightCode>();
  private shown = false;

  constructor() {
    effect(() => {
      const allowed = this.auth.can(this.appCan());
      if (allowed && !this.shown) {
        this.vcr.createEmbeddedView(this.tpl);
        this.shown = true;
      } else if (!allowed && this.shown) {
        this.vcr.clear();
        this.shown = false;
      }
    });
  }
}
