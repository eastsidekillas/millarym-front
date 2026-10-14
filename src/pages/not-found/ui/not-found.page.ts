import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <h1 class="mb-1 text-xl font-bold">Страница не найдена</h1>
    <a routerLink="/" class="text-sm text-accent hover:underline">На главную</a>
  `,
})
export class NotFoundPage {}
