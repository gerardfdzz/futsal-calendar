import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * App-wide header. Deliberately no "favorits"/"perfil" links — both
 * would require accounts/auth this app doesn't have. Just a brand link
 * back to `/`.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {}
