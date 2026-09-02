import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Competition, Discipline, Group, TeamOption } from '../models/catalog.model';

/**
 * Thin wrapper around the backend's catalog-browsing endpoints. Uses
 * same-origin relative URLs since this app is deployed alongside the
 * Vercel functions, so no base URL configuration is needed.
 */
@Injectable({ providedIn: 'root' })
export class CompetitionCatalogService {
  private readonly http = inject(HttpClient);

  listDisciplines(): Observable<Discipline[]> {
    return this.http.get<Discipline[]>('/api/disciplines');
  }

  /** `temporada` is optional — the backend defaults to the current
   *  season when omitted. */
  listCompetitions(disciplinaId: string, temporada?: string): Observable<Competition[]> {
    const params: Record<string, string> = { disciplinaId };
    if (temporada) {
      params['temporada'] = temporada;
    }
    return this.http.get<Competition[]>('/api/competitions', { params });
  }

  listGroups(competicioId: string): Observable<Group[]> {
    return this.http.get<Group[]>(`/api/competitions/${encodeURIComponent(competicioId)}/groups`);
  }

  listTeams(grupId: string): Observable<TeamOption[]> {
    return this.http.get<TeamOption[]>(`/api/groups/${encodeURIComponent(grupId)}/teams`);
  }
}
