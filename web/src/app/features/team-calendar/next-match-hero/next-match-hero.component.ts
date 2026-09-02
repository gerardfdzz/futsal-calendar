import { Component, computed, input } from '@angular/core';
import type { Match } from '../../../core/models/match.model';
import { formatMatchDay, formatMatchTime } from '../../../core/utils/date-format';
import { teamInitials } from '../../../core/utils/team-initials';
import { StatusBadgeComponent } from '../../../shared/status-badge/status-badge.component';

/**
 * The featured card for the team's next fixture — same visual language
 * as the `calendari_de_l_equip` mockup's "Pròxim Partit" card. `teamId`
 * decides which side gets the bold/highlighted treatment; it isn't
 * assumed to always be the home team (see `filterTeamMatches`, which
 * returns matches where the team is either side).
 */
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
  readonly homeInitials = computed(() => teamInitials(this.match().homeTeam.name));
  readonly awayInitials = computed(() => teamInitials(this.match().awayTeam.name));
}
