import { Component, computed, input } from '@angular/core';
import type { Match } from '../../../core/models/match.model';
import { formatMatchDay, formatMatchTime } from '../../../core/utils/date-format';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';

@Component({
  selector: 'app-next-match-hero',
  standalone: true,
  imports: [StatusBadgeComponent],
  templateUrl: './next-match-hero.component.html',
  styleUrl: './next-match-hero.component.scss',
})
export class NextMatchHeroComponent {
  readonly match = input.required<Match>();
  readonly teamId = input.required<string>();

  readonly isHome = computed(() => this.match().homeTeam.id === this.teamId());
  readonly kickoff = computed(() => new Date(this.match().startsAt));
  readonly dayLabel = computed(() => formatMatchDay(this.kickoff()));
  readonly timeLabel = computed(() => formatMatchTime(this.kickoff()));
}
