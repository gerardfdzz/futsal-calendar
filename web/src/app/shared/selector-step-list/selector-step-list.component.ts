import { Component, input, output } from '@angular/core';

export interface SelectableOption {
  readonly id: string;
  readonly name: string;
}

/**
 * Reusable card-list used by every step of the team-selector wizard
 * (disciplina / competició / grup / equip) — same visual language as the
 * `resultats_de_cerca` mockup's result cards, reused instead of building
 * four near-identical lists.
 */
@Component({
  selector: 'app-selector-step-list',
  standalone: true,
  templateUrl: './selector-step-list.component.html',
  styleUrl: './selector-step-list.component.scss',
})
export class SelectorStepListComponent {
  readonly items = input.required<readonly SelectableOption[]>();
  readonly emptyLabel = input('No hi ha resultats.');
  readonly select = output<SelectableOption>();
}
