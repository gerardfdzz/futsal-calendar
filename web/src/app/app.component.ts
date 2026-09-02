import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppShellComponent } from './shared/app-shell/app-shell.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AppShellComponent],
  template: `
    <app-shell>
      <router-outlet></router-outlet>
    </app-shell>
  `,
})
export class AppComponent {}
