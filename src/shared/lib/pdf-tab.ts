import { HttpErrorResponse } from '@angular/common/http';

/** Открывает PDF в новой вкладке. Вкладку создаём до запроса, иначе браузер заблокирует её как всплывающее окно. */
export async function openPdf(load: () => Promise<Blob>): Promise<void> {
  const tab = window.open('', '_blank');
  tab?.document.write('<p style="font-family: sans-serif; padding: 24px">Готовим PDF…</p>');
  try {
    const url = URL.createObjectURL(new Blob([await load()], { type: 'application/pdf' }));
    if (tab) tab.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    tab?.close();
    throw await readBlobError(err);
  }
}

async function readBlobError(err: unknown): Promise<unknown> {
  if (!(err instanceof HttpErrorResponse) || !(err.error instanceof Blob)) return err;
  try {
    return new HttpErrorResponse({ error: JSON.parse(await err.error.text()), status: err.status });
  } catch {
    return err;
  }
}
