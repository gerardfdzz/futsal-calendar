import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { OAuth2Client } from 'google-auth-library';

const CREDENTIALS_PATH = new URL('./credentials.json', import.meta.url);
const TOKEN_PATH = new URL('./token.json', import.meta.url);
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const PORT = 53682;

interface StoredCredentials {
  readonly installed: {
    readonly client_id: string;
    readonly client_secret: string;
  };
}

async function main(): Promise<void> {
  const raw = await readFile(CREDENTIALS_PATH, 'utf8');
  const { installed } = JSON.parse(raw) as StoredCredentials;
  const { client_id, client_secret } = installed;

  const redirectUri = `http://localhost:${PORT}/oauth2callback`;
  const client = new OAuth2Client(client_id, client_secret, redirectUri);

  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('\nObre aquesta URL al navegador i autoritza amb el teu compte de Google:\n');
  console.log(authUrl);
  console.log(`\nEsperant la resposta a ${redirectUri} ...`);

  const code = await waitForAuthorizationCode(PORT);
  const { tokens } = await client.getToken(code);

  await writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), 'utf8');
  console.log(`\nFet. Tokens desats a ${TOKEN_PATH.pathname}.`);
}

function waitForAuthorizationCode(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');

      if (error) {
        res.end(`Autorització denegada: ${error}. Ja pots tancar aquesta finestra.`);
        server.close();
        reject(new Error(`Google OAuth error: ${error}`));
        return;
      }

      if (!code) {
        res.end('No s\'ha rebut cap codi. Ja pots tancar aquesta finestra.');
        return;
      }

      res.end('Autoritzat correctament. Ja pots tancar aquesta finestra i tornar a la terminal.');
      server.close();
      resolve(code);
    });

    server.listen(port);
  });
}

main().catch((error) => {
  console.error('Authorization failed:', error);
  process.exitCode = 1;
});
