import { environment } from '@shared/config';


const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: environment.timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormat = new Intl.DateTimeFormat('ru-RU', {
  timeZone: environment.timeZone,
  hour: '2-digit',
  minute: '2-digit',
});

type DateLike = string | Date | null | undefined;

function isDateOnly(value: DateLike): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function factoryDay(value: DateLike): string | null {
  if (!value) return null;
  if (isDateOnly(value)) return value;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : dayFormat.format(d);
}

function dayNumber(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 864e5;
}

export function fmtDate(value: DateLike): string {
  const day = factoryDay(value);
  if (!day) return '';
  const [y, m, d] = day.split('-');
  return `${d}.${m}.${y.slice(2)}`;
}

const longDay = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'long', timeZone: 'UTC' });

export function fmtDayLong(day: string): string {
  return longDay.format(new Date(`${day}T00:00:00Z`));
}

export function fmtTime(value: DateLike): string {
  if (!value || isDateOnly(value)) return '';
  return timeFormat.format(value instanceof Date ? value : new Date(value));
}

export function fmtDateTime(value: DateLike): string {
  if (!value || isDateOnly(value)) return fmtDate(value);
  const d = value instanceof Date ? value : new Date(value);
  return `${fmtDate(d)} ${timeFormat.format(d)}`;
}

export function daysSince(value: DateLike, now: Date = new Date()): number {
  const day = factoryDay(value);
  return day ? dayNumber(factoryDay(now)!) - dayNumber(day) : 0;
}

export function daysUntil(value: DateLike, now: Date = new Date()): number {
  return -daysSince(value, now);
}
