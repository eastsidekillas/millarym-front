import type { RightCode } from '@entities/session';
import { daysSince, daysUntil } from '@shared/lib';
import { FabricSlot, Item, Stage } from '../model/item.types';

export interface StageInfo {
  id: Stage;
  name: string;
  hint: string;
}

export const STAGES: StageInfo[] = [
  { id: 'orders', name: 'Заказы', hint: 'Изделия с резервом. Ждут ткань и передачи в крой. Сроки — только у индивидуальных заказов.' },
  { id: 'cut', name: 'Крой', hint: 'Раскрой ткани и пошив чехла. Сюда сразу попадают изделия без резерва.' },
  { id: 'cover', name: 'Склад чехлов', hint: 'Чехлы отшиты и ждут сборки.' },
  { id: 'work', name: 'В работе', hint: 'Выдано бригаде на сборку.' },
  { id: 'fg', name: 'СГП', hint: 'Склад готовой продукции.' },
];

export const TRASH_HINT =
  'Отгруженные и удалённые изделия. Каждое лежит здесь 30 дней, потом удаляется само. Можно восстановить.';

export const STAGE_NAME: Record<Stage, string> = Object.fromEntries(STAGES.map((s) => [s.id, s.name])) as Record<Stage, string>;

export const NEXT_STAGE: Partial<Record<Stage, Stage>> = { orders: 'cut', cut: 'cover', cover: 'work', work: 'fg' };

export const MOVE_RIGHT: Record<Stage, RightCode> = {
  orders: 'move_any',
  cut: 'move_orders_cut',
  cover: 'move_cut_cover',
  work: 'move_cover_work',
  fg: 'move_work_fg',
};

export const FABRIC_SLOTS: { slot: FabricSlot; label: string }[] = [
  { slot: 'main', label: 'Основа' },
  { slot: 'comp1', label: 'Компаньон 1' },
  { slot: 'comp2', label: 'Компаньон 2' },
  { slot: 'leather', label: 'Кожзам' },
];

export const MOVE_LABEL: Record<Stage, string> = {
  orders: 'В заказы',
  cut: 'В крой',
  cover: 'На склад чехлов',
  work: 'В работу',
  fg: 'На СГП',
};

export function nextLabel(stage: Stage): string {
  const next = NEXT_STAGE[stage];
  return next ? MOVE_LABEL[next] : '';
}

export const LOCK_TEXT: Record<string, string> = {
  move: 'Перемещать на следующий этап могут',
  restore: 'Возвращать из Корзины могут',
  reserve: 'Менять резерв могут',
};

export interface ItemAlert {
  level: 'crit' | 'warn';
  text: string;
}

export function itemAlert(item: Item): ItemAlert | null {
  if (!item.warnings.length) return null;
  const days = daysSince(item.created_at);
  if (item.warnings.includes('output')) return { level: 'crit', text: `срок заказа прошёл: ${days} дн.` };
  if (item.warnings.includes('fabric')) return { level: 'crit', text: `ткань не пришла ${days} дн.` };
  return { level: 'warn', text: `крой не готов ${days} дн.` };
}

export function meters(value: string | null): string {
  if (value === null || value === '') return '';
  return `${String(Number(value)).replace('.', ',')} м`;
}

export function purgeText(purgeAt: string | null): string {
  const days = daysUntil(purgeAt);
  return days <= 0 ? 'удалится этой ночью' : `удалится через ${days} дн.`;
}
