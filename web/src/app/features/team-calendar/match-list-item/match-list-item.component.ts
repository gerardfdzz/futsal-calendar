import { Component, computed, input } from '@angular/core';
import type { Match } from '../../../core/models/match.model';
import { formatMatchDay, formatMatchTime } from '../../../core/utils/date-format';
import { hideBrokenCrest } from '../../../core/utils/crest';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';

type MatchResult = 'won' | 'lost' | 'draw' | null;

@Component({
  selector: 'app-match-list-item',
  standalone: true,
  imports: [StatusBadgeComponent],
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

  readonly showStatusBadge = computed(() => {
    const status = this.match().status;
    return status !== 'scheduled' && status !== 'finished';
  });

  readonly lost = computed(() => {
    const match = this.match();
    if (match.status !== 'finished' || !match.score) {
      return false;
    }
    const ourGoals = this.isHome() ? match.score.home : match.score.away;
    const theirGoals = this.isHome() ? match.score.away : match.score.home;
    return ourGoals < theirGoals;
  });

  readonly draw = computed(() => {
    const match = this.match();
    if (match.status !== 'finished' || !match.score) {
      return false;
    }
    return match.score.home === match.score.away;
  });

  readonly result = computed<MatchResult>(() => {
    if (this.match().status !== 'finished' || !this.match().score) {
      return null;
    }
    if (this.draw()) {
      return 'draw';
    }
    return this.lost() ? 'lost' : 'won';
  });

  readonly hideCrest = hideBrokenCrest;
}
