import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CompetitionCatalogService } from '../../core/services/competition-catalog.service';
import { DEFAULT_DISCIPLINA_ID } from '../../core/config/catalog-defaults';
import { SelectorStepListComponent, type SelectableOption } from '../../shared/selector-step-list/selector-step-list.component';
import type { Competition, Discipline, Group, TeamOption } from '../../core/models/catalog.model';

type Step = 'discipline' | 'competition' | 'group' | 'team';

/**
 * The "cerca" replacement decided for Milestone 6: a cascading selector
 * (disciplina -> competició -> grup -> equip) built on the FCF's own
 * catalog endpoints, verified live to be reliable for every discipline —
 * unlike free-text search by club name, which testing showed is broken
 * for Futbol Sala specifically (see project notes). "Futbol Sala" is
 * preselected once `/api/disciplines` loads, but every step stays
 * changeable.
 *
 * The current selection is mirrored into the URL's query params
 * (`disciplinaId`/`competicioId`/`grupId`) so the browser's back button
 * steps back through the wizard and a mid-selection link is shareable —
 * see `syncUrl`.
 */
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

  readonly disciplines = signal<Discipline[]>([]);
  readonly competitions = signal<Competition[]>([]);
  readonly groups = signal<Group[]>([]);
  readonly teams = signal<TeamOption[]>([]);

  readonly selectedDisciplinaId = signal<string | undefined>(undefined);
  readonly selectedCompeticioId = signal<string | undefined>(undefined);
  readonly selectedGrupId = signal<string | undefined>(undefined);

  readonly loading = signal(false);
  readonly error = signal<string | undefined>(undefined);

  readonly step = computed<Step>(() => {
    if (!this.selectedDisciplinaId()) return 'discipline';
    if (!this.selectedCompeticioId()) return 'competition';
    if (!this.selectedGrupId()) return 'group';
    return 'team';
  });

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
    const params = this.route.snapshot.queryParamMap;
    const disciplinaId = params.get('disciplinaId') ?? undefined;
    const competicioId = params.get('competicioId') ?? undefined;
    const grupId = params.get('grupId') ?? undefined;

    this.loadDisciplines(disciplinaId);
    if (disciplinaId) {
      this.selectDiscipline(disciplinaId, { updateUrl: false });
    }
    if (disciplinaId && competicioId) {
      this.selectCompetition(competicioId, { updateUrl: false });
    }
    if (disciplinaId && competicioId && grupId) {
      this.selectGroup(grupId, { updateUrl: false });
    }
  }

  selectDiscipline(disciplinaId: string, opts: { updateUrl?: boolean } = {}): void {
    this.selectedDisciplinaId.set(disciplinaId);
    this.selectedCompeticioId.set(undefined);
    this.selectedGrupId.set(undefined);
    this.competitions.set([]);
    this.groups.set([]);
    this.teams.set([]);
    this.syncUrl(opts.updateUrl !== false);

    this.loading.set(true);
    this.error.set(undefined);
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
  }

  selectCompetition(competicioId: string, opts: { updateUrl?: boolean } = {}): void {
    this.selectedCompeticioId.set(competicioId);
    this.selectedGrupId.set(undefined);
    this.groups.set([]);
    this.teams.set([]);
    this.syncUrl(opts.updateUrl !== false);

    this.loading.set(true);
    this.error.set(undefined);
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
  }

  selectGroup(grupId: string, opts: { updateUrl?: boolean } = {}): void {
    this.selectedGrupId.set(grupId);
    this.teams.set([]);
    this.syncUrl(opts.updateUrl !== false);

    this.loading.set(true);
    this.error.set(undefined);
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
  }

  selectTeam(team: SelectableOption): void {
    const grupId = this.selectedGrupId();
    if (!grupId) {
      return;
    }
    void this.router.navigate(['/equip', grupId, team.id]);
  }

  goBack(): void {
    switch (this.step()) {
      case 'team':
        this.selectedGrupId.set(undefined);
        this.teams.set([]);
        this.syncUrl(true);
        break;
      case 'group':
        this.selectedCompeticioId.set(undefined);
        this.groups.set([]);
        this.teams.set([]);
        this.syncUrl(true);
        break;
      case 'competition':
        this.selectedDisciplinaId.set(undefined);
        this.competitions.set([]);
        this.groups.set([]);
        this.teams.set([]);
        this.syncUrl(true);
        break;
      case 'discipline':
        break;
    }
  }

  private loadDisciplines(preselectedDisciplinaId: string | undefined): void {
    this.loading.set(true);
    this.catalog.listDisciplines().subscribe({
      next: (disciplines) => {
        this.disciplines.set(disciplines);
        this.loading.set(false);

        // Preselect Futbol Sala only when nothing came from the URL —
        // a shared link with its own disciplinaId must win.
        if (!preselectedDisciplinaId) {
          const futsal = disciplines.find((d) => d.id === DEFAULT_DISCIPLINA_ID);
          if (futsal) {
            this.selectDiscipline(futsal.id, { updateUrl: false });
          }
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set("No s'ha pogut carregar la llista de disciplines. Torna-ho a provar.");
      },
    });
  }

  private syncUrl(updateUrl: boolean): void {
    if (!updateUrl) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        disciplinaId: this.selectedDisciplinaId() ?? null,
        competicioId: this.selectedCompeticioId() ?? null,
        grupId: this.selectedGrupId() ?? null,
      },
      queryParamsHandling: 'merge',
    });
  }
}
