import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TeamMatchesService } from '../../core/services/team-matches.service';
import { CompetitionCatalogService } from '../../core/services/competition-catalog.service';
import { SeoService } from '../../core/services/seo.service';
import { SITE_BASE_URL } from '../../core/seo.config';
import type { Match } from '../../core/models/match.model';
import type { TeamOption } from '../../core/models/catalog.model';
import { hideBrokenCrest } from '../../core/utils/crest';
import { NextMatchHeroComponent } from './next-match-hero/next-match-hero.component';
import { MatchListItemComponent } from './match-list-item/match-list-item.component';
import { AddToCalendarButtonComponent } from '../../shared/add-to-calendar-button/add-to-calendar-button.component';

const SCHEMA_EVENT_STATUS: Readonly<Partial<Record<Match['status'], string>>> = {
  postponed: 'https://schema.org/EventPostponed',
  cancelled: 'https://schema.org/EventCancelled',
};

@Component({
  selector: 'app-team-calendar-page',
  standalone: true,
  imports: [NextMatchHeroComponent, MatchListItemComponent, AddToCalendarButtonComponent],
  templateUrl: './team-calendar.page.html',
  styleUrl: './team-calendar.page.scss',
})
export class TeamCalendarPage {
  private readonly matchesService = inject(TeamMatchesService);
  private readonly catalogService = inject(CompetitionCatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  readonly groupId = this.route.snapshot.paramMap.get('groupId') ?? '';
  readonly teamId = this.route.snapshot.paramMap.get('teamId') ?? '';
  private readonly pageUrl = `${SITE_BASE_URL}/equip/${this.groupId}/${this.teamId}`;

  readonly matches = signal<Match[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | undefined>(undefined);

  // The team's name/crest used to come only from `matches()[0]` (whichever side of a match
  // is "us"), which left the page blank — no name, no crest, just the "Equip" placeholder —
  // for a team with zero matches in its group's calendar (normal before a season's fixtures
  // are published, not an error). `listTeams(groupId)` already has every team's name/crest
  // and doesn't depend on there being any matches yet, so it's the primary source; the
  // match-derived name is only a fallback for the rare case this lookup itself fails.
  readonly teamInfo = signal<TeamOption | undefined>(undefined);

  readonly teamName = computed(() => this.teamInfo()?.name ?? this.pickOurTeam()?.name);
  readonly teamCrest = computed(() => this.teamInfo()?.crest ?? this.pickOurTeam()?.crest);

  readonly hideCrest = hideBrokenCrest;

  readonly upcomingMatches = computed(() => {
    const now = Date.now();
    return [...this.matches()]
      .filter((match) => new Date(match.startsAt).getTime() >= now)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  });

  readonly nextMatch = computed(() => this.upcomingMatches()[0]);

  // Ascending (oldest first) so the 2-column grid (team-calendar.page.scss,
  // .team-calendar__list--cards) reads jornada 1, 2, 3... left-to-right, top-to-bottom —
  // the same order a descending sort would break (jornada 2 would land top-left, before
  // jornada 1 top-right).
  readonly pastMatches = computed(() => {
    const now = Date.now();
    return [...this.matches()]
      .filter((match) => new Date(match.startsAt).getTime() < now)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  });

  constructor() {
    this.seo.update({
      title: 'Calendari de partits · Partits al Calendari',
      description: "Sincronitza el calendari d'aquest equip de la FCF amb el teu Apple Calendar o Google Calendar.",
      url: this.pageUrl,
    });

    this.matchesService.getTeamMatches(this.groupId, this.teamId).subscribe({
      next: (matches) => {
        this.matches.set(matches);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(this.buildErrorMessage(err));
      },
    });

    // Best-effort, secondary to the matches fetch above: a failure here just means the
    // match-derived name/crest (if any) is used instead, never a page-level error.
    this.catalogService.listTeams(this.groupId).subscribe({
      next: (teams) => this.teamInfo.set(teams.find((team) => team.id === this.teamId)),
      error: () => this.teamInfo.set(undefined),
    });

    effect(() => {
      const teamName = this.teamName();
      if (!teamName) {
        return;
      }
      this.seo.update({
        title: `${teamName} · Calendari FCF | Partits al Calendari`,
        description: `Calendari i pròxims partits de ${teamName} (Federació Catalana de Futbol). Sincronitza'l amb Apple Calendar o Google Calendar sense haver de descarregar res.`,
        url: this.pageUrl,
      });
    });

    effect(() => {
      const next = this.nextMatch();
      const teamName = this.teamName();
      if (!next || !teamName) {
        this.seo.clearJsonLd();
        return;
      }
      this.seo.setJsonLd(this.buildNextMatchJsonLd(next));
    });
  }

  private buildNextMatchJsonLd(match: Match): Record<string, unknown> {
    const eventStatus = SCHEMA_EVENT_STATUS[match.status];
    return {
      '@context': 'https://schema.org',
      '@type': 'SportsEvent',
      name: `${match.homeTeam.name} - ${match.awayTeam.name}`,
      startDate: match.startsAt,
      url: this.pageUrl,
      ...(eventStatus ? { eventStatus } : {}),
      ...(match.venue
        ? {
            location: {
              '@type': 'Place',
              name: match.venue.name,
              ...(match.venue.latitude !== undefined && match.venue.longitude !== undefined
                ? { geo: { '@type': 'GeoCoordinates', latitude: match.venue.latitude, longitude: match.venue.longitude } }
                : {}),
            },
          }
        : {}),
      homeTeam: { '@type': 'SportsTeam', name: match.homeTeam.name },
      awayTeam: { '@type': 'SportsTeam', name: match.awayTeam.name },
    };
  }

  private buildErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'No hi ha connexió amb el servidor. Comprova la teva connexió a internet i torna-ho a provar.';
    }
    if (err.status === 400) {
      return "L'equip o el grup indicats no són vàlids. Torna a triar l'equip des de l'inici.";
    }
    if (err.status === 502) {
      return "La Federació Catalana de Futbol no respon en aquest moment. Torna-ho a provar d'aquí una estona.";
    }
    return "No s'ha pogut carregar el calendari d'aquest equip. Torna-ho a provar.";
  }

  private pickOurTeam() {
    const match = this.matches()[0];
    if (!match) {
      return undefined;
    }
    return match.homeTeam.id === this.teamId ? match.homeTeam : match.awayTeam;
  }
}
