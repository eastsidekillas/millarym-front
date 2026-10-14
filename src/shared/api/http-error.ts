import { HttpErrorResponse } from '@angular/common/http';

/** Достать понятный текст ошибки из ответа API ({detail} или {errors: {поле: [..]}}). */
export function errorText(error: unknown, fallback = 'Что-то пошло не так. Попробуйте ещё раз.'): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0) return 'Нет связи с сервером. Проверьте сеть.';
  const body = error.error as { detail?: string; errors?: Record<string, string[] | string> } | null;
  if (body?.detail) return body.detail;
  if (body?.errors) {
    const first = Object.values(body.errors)[0];
    if (Array.isArray(first) && first.length) return first[0];
    if (typeof first === 'string') return first;
  }
  if (error.status >= 500) return 'Ошибка на сервере. Сообщите администратору.';
  return fallback;
}
