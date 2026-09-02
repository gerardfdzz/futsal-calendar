import { Component, input, output } from '@angular/core';

export interface SelectableOption {
  readonly id: string;
  readonly name: string;
}

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
