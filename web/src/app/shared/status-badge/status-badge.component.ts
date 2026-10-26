import { Component, computed, input } from '@angular/core';
import type { MatchStatus } from '../../core/models/match.model';

const STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: 'Programat',
  finished: 'Finalitzat',
  postponed: 'Ajornat',
  suspended: 'Suspès',
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
      [class.status-badge--finished]="status() === 'finished' && !lost() && !draw()"
      [class.status-badge--lost]="status() === 'finished' && lost()"
      [class.status-badge--draw]="status() === 'finished' && draw()"
      [class.status-badge--postponed]="status() === 'postponed'"
      [class.status-badge--suspended]="status() === 'suspended'"
      [class.status-badge--cancelled]="status() === 'cancelled'"
      >{{ label() }}</span
    >
  `,
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  readonly status = input.required<MatchStatus>();
  readonly lost = input<boolean>(false);
  readonly draw = input<boolean>(false);

  readonly label = computed(() => STATUS_LABELS[this.status()]);
}
