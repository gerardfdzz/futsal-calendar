import { Component, input, output, signal } from '@angular/core';

export interface SelectableOption {
  readonly id: string;
  readonly name: string;
  readonly crest?: string;
}

export type SelectorStepListLayout = 'list' | 'grid';

@Component({
  selector: 'app-selector-step-list',
  standalone: true,
  templateUrl: './selector-step-list.component.html',
  styleUrl: './selector-step-list.component.scss',
})
export class SelectorStepListComponent {
  readonly items = input.required<readonly SelectableOption[]>();
  readonly emptyLabel = input('No hi ha resultats.');
  readonly layout = input<SelectorStepListLayout>('list');
  readonly select = output<SelectableOption>();

  private readonly brokenCrestIds = signal<ReadonlySet<string>>(new Set());

  hasCrest(item: SelectableOption): boolean {
    return item.crest !== undefined && !this.brokenCrestIds().has(item.id);
  }

  onCrestError(id: string): void {
    this.brokenCrestIds.update((broken) => new Set(broken).add(id));
  }
}
