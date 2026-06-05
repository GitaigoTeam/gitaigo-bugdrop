import type { Env } from '../types';

const DEFAULT_BOARD_ID = 'board_mean_weasel_bugdrop_board_production_dogfood';
const DEFAULT_WORKER_ORIGIN = 'https://board.bugdrop.dev';
const DEFAULT_TOKEN_AUDIENCE = 'bugdrop-board';
const DEFAULT_TOKEN_ISSUER = 'bugdrop-board-production-host';
const TOKEN_TTL_SECONDS = 300;

interface BoardDogfoodConfig {
  boardId: string;
  workerOrigin: string;
  tokenAudience: string;
  tokenIssuer: string;
}

interface BoardTokenClaims {
  boardId: string;
  externalUserId: string;
  displayName: string;
  exp: number;
  aud: string;
  iss: string;
}

export function renderBoardDogfoodPage(env: Env, rawViewer: string | null): string {
  const viewer = normalizeViewer(rawViewer);
  const config = dogfoodConfig(env);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>BugDrop Board Dogfood</title>
    <style>
      body {
        background: #f8fafc;
        color: #172026;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin: 0;
      }
      main {
        margin: 0 auto;
        max-width: 880px;
        padding: 32px 20px;
      }
      h1 {
        font-size: 28px;
        line-height: 1.2;
        margin: 0 0 12px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>BugDrop Board Dogfood</h1>
      <p>Signed in as dogfood viewer ${viewer.toUpperCase()}.</p>
    </main>
    <script
      src="${escapeAttribute(config.workerOrigin)}/board.js"
      data-board-id="${escapeAttribute(config.boardId)}"
      data-api-url="${escapeAttribute(config.workerOrigin)}"
      data-token-endpoint="/api/bugdrop-board-token?viewer=${viewer}"
      data-poll-interval="750"
      data-color="#1f883d"
    ></script>
  </body>
</html>`;
}

export async function createBoardDogfoodToken(env: Env, rawViewer: string | null): Promise<string> {
  const secret = envValue(env.BUGDROP_BOARD_TOKEN_SECRET);
  if (!secret) {
    throw new Error('BugDrop Board dogfood token signing is not configured');
  }

  const viewer = normalizeViewer(rawViewer);
  const config = dogfoodConfig(env);
  const claims: BoardTokenClaims = {
    boardId: config.boardId,
    externalUserId: `bugdrop-dev-dogfood-${viewer}`,
    displayName: `BugDrop Dogfood ${viewer.toUpperCase()}`,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    aud: config.tokenAudience,
    iss: config.tokenIssuer,
  };
  const payload = base64UrlEncodeString(JSON.stringify(claims));
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

function dogfoodConfig(env: Env): BoardDogfoodConfig {
  return {
    boardId: envValue(env.BUGDROP_BOARD_ID) ?? DEFAULT_BOARD_ID,
    workerOrigin: stripTrailingSlash(
      envValue(env.BUGDROP_BOARD_WORKER_ORIGIN) ?? DEFAULT_WORKER_ORIGIN
    ),
    tokenAudience: envValue(env.BUGDROP_BOARD_TOKEN_AUDIENCE) ?? DEFAULT_TOKEN_AUDIENCE,
    tokenIssuer: envValue(env.BUGDROP_BOARD_TOKEN_ISSUER) ?? DEFAULT_TOKEN_ISSUER,
  };
}

function normalizeViewer(value: string | null): 'a' | 'b' {
  return value === 'b' ? 'b' : 'a';
}

function envValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function base64UrlEncodeString(value: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
