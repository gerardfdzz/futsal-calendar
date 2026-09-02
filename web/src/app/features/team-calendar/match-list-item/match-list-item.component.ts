import { Component, computed, input } from '@angular/core';
import type { Match } from '../../../core/models/match.model';
import { formatMatchDay, formatMatchTime } from '../../../core/utils/date-format';

/**
 * One row in the "Pròxims partits" list — deliberately not a button/link:
 * there is no match-detail page to navigate to in this MVP, so it stays a
 * plain, non-interactive row rather than implying a destination that
 * doesn't exist.
 */
@Component({
  selector: 'app-match-list-item',
  standalone: true,
  templateUrl: './match-list-item.component.html',
  styleUrl: './match-list-item.component.scss',
})
export class MatchListItemComponent {
  readonly match = input.required<Match>();
  readonly teamId = input.required<string>();

  readonly isHome = computed(() => this.match().homeTeam.id === this.teamId());
  readonly kickoff = computed(() => new Date(this.match().startsAt));
  readonly dayLabel = computed(() => formatMatchDay(this.kickoff()));
  readonly timeLabel = computed(() => formatMatchTime(this.kickoff()));
}
