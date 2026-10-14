import { Component, inject } from '@angular/core';
import { CanDirective, RightCode, SessionStore } from '@entities/session';

@Component({
  selector: 'app-production-page',
  imports: [CanDirective],
  templateUrl: './production.page.html',
})
export class ProductionPage {
  readonly session = inject(SessionStore);

  readonly actions: { code: RightCode; title: string }[] = [
    { code: 'move_orders_cut', title: 'Заказы → Крой' },
    { code: 'move_cut_cover', title: 'Крой → Склад чехлов' },
    { code: 'move_cover_work', title: 'Склад чехлов → В работе' },
    { code: 'move_work_fg', title: 'В работе → СГП' },
    { code: 'ship', title: 'Отгрузить' },
    { code: 'return_to_work', title: 'Вернуть из СГП в работу' },
    { code: 'move_any', title: 'Перенести на любой этап' },
    { code: 'trash', title: 'Удалить в корзину' },
    { code: 'restore', title: 'Восстановить из корзины' },
    { code: 'marks', title: 'Отметки (ткань пришла, раскроено, чехол готов)' },
    { code: 'edit', title: 'Редактировать изделие' },
    { code: 'reserve', title: 'Резерв' },
    { code: 'fabrics', title: 'Ткани: добавлять и менять' },
    { code: 'catalog', title: 'Справочники: модели, категории, комплектация, бригады, сроки' },
  ];
}
