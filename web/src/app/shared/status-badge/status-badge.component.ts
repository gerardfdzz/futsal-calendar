import { Component, computed, input } from '@angular/core';
import type { MatchStatus } from '../../core/models/match.model';

/**
 * Only the "Programat" variant from DESIGN.md's status-badge spec is
 * activated — the backend's `mapFcfStatus` only confirms `'scheduled'`
 * against real data so far (see `fcf-status.mapper.ts`); every other
 * `MatchStatus` value (including `'unknown'`) renders as a neutral
 * "Per confirmar" label instead of guessing at "Ajornat"/"En Directe"
 * styling for a status we can't actually distinguish yet. Extend this
 * once the backend's status codes are extended for real.
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
