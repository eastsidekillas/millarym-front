import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { SessionStore } from '../model/session.store';
import { RightCode } from '../model/session.types';

/**
 * Показывает элемент, только если у сотрудника есть право.
 *   <button *appCan="'ship'">Отгрузить</button>
 * Сервер всё равно проверяет право сам — это только чтобы не показывать лишнее.
 */
@Directive({ selector: '[appCan]' })
export class CanDirective {
  private readonly session = inject(SessionStore);
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);

  readonly appCan = input.required<RightCode>();
  private shown = false;

  constructor() {
    effect(() => {
      const allowed = this.session.can(this.appCan());
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
