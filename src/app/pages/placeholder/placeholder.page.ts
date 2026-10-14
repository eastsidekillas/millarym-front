import { Component, input } from '@angular/core';

/** Временная страница для разделов, которые ещё не сделаны. */
@Component({
  selector: 'app-placeholder-page',
  template: `
    <h1 class="mb-1 text-xl font-bold">{{ title() }}</h1>
    <p class="text-sm text-muted">Раздел в разработке.</p>
  `,
})
export class PlaceholderPage {
  /** Из data маршрута (withComponentInputBinding) */
  readonly title = input('');
}
