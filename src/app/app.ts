import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MaintenanceOverlayComponent } from '@features/maintenance';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MaintenanceOverlayComponent],
  template: '<router-outlet /><app-maintenance-overlay />',
})
export class App {}
