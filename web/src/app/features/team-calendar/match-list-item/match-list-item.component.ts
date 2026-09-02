import { Component, computed, input } from '@angular/core';
import type { Match } from '../../../core/models/match.model';
import { formatMatchDay, formatMatchTime } from '../../../core/utils/date-format';

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
