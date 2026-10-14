import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TeamDialogComponent } from '@features/item-actions';
import { ItemFormComponent } from '@features/item-form';
import { ConfirmComponent, ToastComponent } from '@shared/ui';
import { AppHeaderComponent } from '@widgets/app-header';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, AppHeaderComponent, ItemFormComponent, TeamDialogComponent, ConfirmComponent, ToastComponent],
  template: `
    <div class="flex min-h-full flex-col">
      <app-header />
      <main class="min-w-0 flex-1 px-4 pb-12 pt-4 md:px-6">
        <router-outlet />
      </main>
    </div>
    <app-item-form />
    <app-team-dialog />
    <app-confirm />
    <app-toast />
  `,
})
export class MainLayoutComponent {}
