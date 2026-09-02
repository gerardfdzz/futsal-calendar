import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { Competition, Discipline, Group, TeamOption } from '../models/catalog.model';

@Injectable({ providedIn: 'root' })
export class CompetitionCatalogService {
  private readonly http = inject(HttpClient);

  listDisciplines(): Observable<Discipline[]> {
    return this.http.get<Discipline[]>('/api/disciplines');
  }

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
