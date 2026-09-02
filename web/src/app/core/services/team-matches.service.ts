import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';
import type { Match } from '../models/match.model';

interface TeamMatchesResponse {
  readonly matches: Match[];
}

/** Wraps `GET /api/matches/{groupId}/{teamId}` — see
 *  `src/http/matches-http-handler.ts` on the backend. */
@Injectable({ providedIn: 'root' })
export class TeamMatchesService {
  private readonly http = inject(HttpClient);

  getTeamMatches(groupId: string, teamId: string): Observable<Match[]> {
    return this.http
      .get<TeamMatchesResponse>(`/api/matches/${encodeURIComponent(groupId)}/${encodeURIComponent(teamId)}`)
      .pipe(map((response) => response.matches));
  }
}
