import { Component, computed, input } from '@angular/core';
import type { MatchStatus } from '../../core/models/match.model';

/**
 * Only 'scheduled' renders as "Programat" — every other status
 * (including 'unknown') shows a neutral "Per confirmar" label, since the
 * backend only confirms that one status against real data so far.
 */
@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="status-badge" [class.status-badge--scheduled]="isScheduled()">{{ label() }}</span>`,
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  readonly status = input.required<MatchStatus>();

  readonly isScheduled = computed(() => this.status() === 'scheduled');
  readonly label = computed(() => (this.isScheduled() ? 'Programat' : 'Per confirmar'));
}
