import { readFile, writeFile } from 'node:fs/promises';
import { OAuth2Client, type Credentials } from 'google-auth-library';

const CREDENTIALS_PATH = new URL('./credentials.json', import.meta.url);
const TOKEN_PATH = new URL('./token.json', import.meta.url);
const STATE_PATH = new URL('./state.json', import.meta.url);

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

interface StoredCredentials {
  readonly installed: {
    readonly client_id: string;
    readonly client_secret: string;
  };
}

interface StoredState {
  readonly calendarId?: string;
}

export interface GoogleCalendarEventInput {
  readonly codacta: string;
  readonly summary: string;
  readonly startIso: string;
  readonly endIso: string;
  readonly timeZone: string;
  readonly location?: string;
}

export class GoogleCalendarClient {
  private constructor(private readonly auth: OAuth2Client) {}

  static async fromStoredCredentials(): Promise<GoogleCalendarClient> {
    const auth = await loadAuthorizedClient();
    return new GoogleCalendarClient(auth);
  }

  async getOrCreateCalendarId(summary: string): Promise<string> {
    const state = await readState();
    if (state.calendarId) {
      return state.calendarId;
    }

    const calendarId = await this.createCalendar(summary);
    await writeState({ calendarId });
    return calendarId;
  }

  private async createCalendar(summary: string): Promise<string> {
    const response = (await this.request('POST', '/calendars', { summary })) as { id: string };
    return response.id;
  }

  async upsertEvent(calendarId: string, event: GoogleCalendarEventInput): Promise<'created' | 'updated'> {
    const existingId = await this.findEventIdByCodacta(calendarId, event.codacta);
    const body = this.buildEventBody(event);

    if (existingId) {
      await this.request('PATCH', `/calendars/${encodeURIComponent(calendarId)}/events/${existingId}`, body);
      return 'updated';
    }

    await this.request('POST', `/calendars/${encodeURIComponent(calendarId)}/events`, body);
    return 'created';
  }

  private buildEventBody(event: GoogleCalendarEventInput): Record<string, unknown> {
    return {
      summary: event.summary,
      ...(event.location ? { location: event.location } : {}),
      start: { dateTime: event.startIso, timeZone: event.timeZone },
      end: { dateTime: event.endIso, timeZone: event.timeZone },
      extendedProperties: { private: { fcfCodacta: event.codacta } },
    };
  }

  private async findEventIdByCodacta(calendarId: string, codacta: string): Promise<string | undefined> {
    const query = `privateExtendedProperty=${encodeURIComponent(`fcfCodacta=${codacta}`)}`;
    const response = (await this.request('GET', `/calendars/${encodeURIComponent(calendarId)}/events?${query}`)) as {
      items?: { id: string }[];
    };
    return response.items?.[0]?.id;
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const accessToken = await this.getAccessToken();
    const response = await fetch(`${CALENDAR_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Google Calendar API ${method} ${path} failed: ${response.status} ${text}`);
    }

    if (response.status === 204) {
      return undefined;
    }

    return response.json();
  }

  private async getAccessToken(): Promise<string> {
    const { token } = await this.auth.getAccessToken();
    if (!token) {
      throw new Error('Google Calendar: no s\'ha pogut obtenir un access token. Torna a executar el script authorize.');
    }
    return token;
  }
}

async function loadAuthorizedClient(): Promise<OAuth2Client> {
  const credentials = await readJsonFile<StoredCredentials>(CREDENTIALS_PATH);
  if (!credentials) {
    throw new Error(
      `No es troba ${CREDENTIALS_PATH.pathname}. Descarrega un client OAuth "Desktop app" des de Google Cloud Console i desa'l aquí.`,
    );
  }

  const tokens = await readJsonFile<Credentials>(TOKEN_PATH);
  if (!tokens) {
    throw new Error(`No es troba ${TOKEN_PATH.pathname}. Executa primer "npm run sync:personal:authorize".`);
  }

  const client = new OAuth2Client(credentials.installed.client_id, credentials.installed.client_secret);
  client.setCredentials(tokens);

  client.on('tokens', (newTokens: Credentials) => {
    void persistMergedTokens(tokens, newTokens);
  });

  return client;
}

async function persistMergedTokens(previous: Credentials, fresh: Credentials): Promise<void> {
  const merged = { ...previous, ...fresh };
  await writeFile(TOKEN_PATH, JSON.stringify(merged, null, 2), 'utf8');
}

async function readState(): Promise<StoredState> {
  return (await readJsonFile<StoredState>(STATE_PATH)) ?? {};
}

async function writeState(state: StoredState): Promise<void> {
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

async function readJsonFile<T>(path: URL): Promise<T | undefined> {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}
