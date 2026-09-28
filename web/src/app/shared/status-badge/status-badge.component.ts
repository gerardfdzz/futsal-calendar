import { Component, computed, input } from '@angular/core';
import type { MatchStatus } from '../../core/models/match.model';

const STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: 'Programat',
  finished: 'Finalitzat',
  postponed: 'Ajornat',
  cancelled: 'Cancel·lat',
  unknown: 'Per confirmar',
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span
      class="status-badge"
      [class.status-badge--scheduled]="status() === 'scheduled'"
      [class.status-badge--finished]="status() === 'finished'"
      [class.status-badge--postponed]="status() === 'postponed'"
      [class.status-badge--cancelled]="status() === 'cancelled'"
      >{{ label() }}</span
    >
  `,
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  readonly status = input.required<MatchStatus>();

  readonly label = computed(() => STATUS_LABELS[this.status()]);
}
