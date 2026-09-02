import { Component, computed, input } from '@angular/core';
import type { MatchStatus } from '../../core/models/match.model';

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
