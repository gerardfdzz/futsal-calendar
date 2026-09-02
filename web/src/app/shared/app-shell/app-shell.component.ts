import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * App-wide header. Deliberately does NOT include "Els Meus" (favorits)
 * or "Perfil" (login) links from the desktop mockup's nav — both require
 * accounts/auth this app doesn't have, per the Milestone 6 scoping
 * decision (see project notes). Just a brand link back to `/`.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {}
