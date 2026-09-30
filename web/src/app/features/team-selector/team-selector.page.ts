import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CompetitionCatalogService } from '../../core/services/competition-catalog.service';
import { SeoService } from '../../core/services/seo.service';
import { SITE_BASE_URL } from '../../core/seo.config';
import { SelectorStepListComponent, type SelectableOption } from '../../shared/selector-step-list/selector-step-list.component';
import type { Competition, Discipline, Group, TeamOption } from '../../core/models/catalog.model';

type Step = 'discipline' | 'competition' | 'group' | 'team';

@Component({
  selector: 'app-team-selector-page',
  standalone: true,
  imports: [SelectorStepListComponent],
  templateUrl: './team-selector.page.html',
  styleUrl: './team-selector.page.scss',
})
export class TeamSelectorPage {
  private readonly catalog = inject(CompetitionCatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  private readonly paramMap = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });

  readonly disciplinaId = computed(() => this.paramMap().get('disciplinaId') ?? undefined);
  readonly competicioId = computed(() => this.paramMap().get('competicioId') ?? undefined);
  readonly grupId = computed(() => this.paramMap().get('grupId') ?? undefined);

  readonly step = computed<Step>(() => {
    if (!this.disciplinaId()) return 'discipline';
    if (!this.competicioId()) return 'competition';
    if (!this.grupId()) return 'group';
    return 'team';
  });

  readonly disciplines = signal<Discipline[]>([]);
  readonly competitions = signal<Competition[]>([]);
  readonly groups = signal<Group[]>([]);
  readonly teams = signal<TeamOption[]>([]);

  readonly loading = signal(false);
  readonly error = signal<string | undefined>(undefined);

  readonly title = computed(() => {
    switch (this.step()) {
      case 'discipline':
        return 'Tria la disciplina';
      case 'competition':
        return 'Tria la competició';
      case 'group':
        return 'Tria el grup';
      case 'team':
        return 'Tria el teu equip';
    }
  });

  constructor() {
    this.seo.update({
      title: 'Partits al Calendari — Sincronitza el teu equip de la FCF',
      description:
        "Sincronitza automàticament els partits del teu equip de la Federació Catalana de Futbol (FCF) amb el teu Apple Calendar o Google Calendar. Troba el teu equip, qualsevol disciplina o categoria.",
      url: `${SITE_BASE_URL}/`,
    });

    effect(() => {
      const step = this.step();
      this.error.set(undefined);

      switch (step) {
        case 'discipline':
          this.loading.set(true);
          this.catalog.listDisciplines().subscribe({
            next: (disciplines) => {
              this.disciplines.set(disciplines);
              this.loading.set(false);
            },
            error: () => {
              this.loading.set(false);
              this.error.set("No s'ha pogut carregar la llista de disciplines. Torna-ho a provar.");
            },
          });
          break;

        case 'competition': {
          const disciplinaId = this.disciplinaId();
          if (!disciplinaId) return;
          this.loading.set(true);
          this.catalog.listCompetitions(disciplinaId).subscribe({
            next: (competitions) => {
              this.competitions.set(competitions);
              this.loading.set(false);
            },
            error: () => {
              this.loading.set(false);
              this.error.set("No s'han pogut carregar les competicions. Torna-ho a provar.");
            },
          });
          break;
        }

        case 'group': {
          const competicioId = this.competicioId();
          if (!competicioId) return;
          this.loading.set(true);
          this.catalog.listGroups(competicioId).subscribe({
            next: (groups) => {
              this.groups.set(groups);
              this.loading.set(false);
            },
            error: () => {
              this.loading.set(false);
              this.error.set("No s'han pogut carregar els grups. Torna-ho a provar.");
            },
          });
          break;
        }

        case 'team': {
          const grupId = this.grupId();
          if (!grupId) return;
          this.loading.set(true);
          this.catalog.listTeams(grupId).subscribe({
            next: (teams) => {
              this.teams.set(teams);
              this.loading.set(false);
            },
            error: () => {
              this.loading.set(false);
              this.error.set("No s'han pogut carregar els equips. Torna-ho a provar.");
            },
          });
          break;
        }
      }
    }, { allowSignalWrites: true });
  }

  selectDiscipline(disciplinaId: string): void {
    void this.router.navigate(['/competicio', disciplinaId]);
  }

  selectCompetition(competicioId: string): void {
    void this.router.navigate(['/grup', this.disciplinaId(), competicioId]);
  }

  selectGroup(grupId: string): void {
    void this.router.navigate(['/equips', this.disciplinaId(), this.competicioId(), grupId]);
  }

  selectTeam(team: SelectableOption): void {
    const grupId = this.grupId();
    if (!grupId) {
      return;
    }
    void this.router.navigate(['/equip', grupId, team.id]);
  }

  goBack(): void {
    switch (this.step()) {
      case 'team':
        void this.router.navigate(['/grup', this.disciplinaId(), this.competicioId()]);
        break;
      case 'group':
        void this.router.navigate(['/competicio', this.disciplinaId()]);
        break;
      case 'competition':
        void this.router.navigate(['/']);
        break;
      case 'discipline':
        break;
    }
  }
}
