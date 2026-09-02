import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TeamMatchesService } from '../../core/services/team-matches.service';
import type { Match } from '../../core/models/match.model';
import { teamInitials } from '../../core/utils/team-initials';
import { NextMatchHeroComponent } from './next-match-hero/next-match-hero.component';
import { MatchListItemComponent } from './match-list-item/match-list-item.component';
import { AddToCalendarButtonComponent } from '../../shared/add-to-calendar-button/add-to-calendar-button.component';

/**
 * `/equip/:groupId/:teamId` — a single team's upcoming fixtures plus the
 * subscribe/copy-URL controls. `groupId`/`teamId` are read once from the
 * route snapshot rather than reactively, since this page is always
 * reached via a fresh navigation, never by changing route params on an
 * already-open instance.
 */
@Component({
  selector: 'app-team-calendar-page',
  standalone: true,
  imports: [NextMatchHeroComponent, MatchListItemComponent, AddToCalendarButtonComponent],
  templateUrl: './team-calendar.page.html',
  styleUrl: './team-calendar.page.scss',
})
export class TeamCalendarPage {
  private readonly matchesService = inject(TeamMatchesService);
  private readonly route = inject(ActivatedRoute);

  readonly groupId = this.route.snapshot.paramMap.get('groupId') ?? '';
  readonly teamId = this.route.snapshot.paramMap.get('teamId') ?? '';

  readonly matches = signal<Match[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | undefined>(undefined);

  /** There's no team-name endpoint of its own — every match already
   *  carries this team's name as either `homeTeam` or `awayTeam`, so the
   *  header is derived from whichever match happens to load first. */
  readonly teamName = computed(() => this.pickOurTeam()?.name);
  readonly teamCrest = computed(() => this.pickOurTeam()?.crest);
  readonly teamInitialsLabel = computed(() => {
    const name = this.teamName();
    return name ? teamInitials(name) : '';
  });

  readonly upcomingMatches = computed(() => {
    const now = Date.now();
    return [...this.matches()]
      .filter((match) => new Date(match.startsAt).getTime() >= now)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  });

  readonly nextMatch = computed(() => this.upcomingMatches()[0]);
  readonly laterMatches = computed(() => this.upcomingMatches().slice(1));

  constructor() {
    this.matchesService.getTeamMatches(this.groupId, this.teamId).subscribe({
      next: (matches) => {
        this.matches.set(matches);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set("No s'ha pogut carregar el calendari d'aquest equip. Torna-ho a provar.");
      },
    });
  }

  private pickOurTeam() {
    const match = this.matches()[0];
    if (!match) {
      return undefined;
    }
    return match.homeTeam.id === this.teamId ? match.homeTeam : match.awayTeam;
  }
}
