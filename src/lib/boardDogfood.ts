import type { Env } from '../types';

const DEFAULT_BOARD_ID = 'board_mean_weasel_bugdrop_board_production_dogfood';
const DEFAULT_WORKER_ORIGIN = 'https://board.bugdrop.dev';
const DEFAULT_TOKEN_AUDIENCE = 'bugdrop-board';
const DEFAULT_TOKEN_ISSUER = 'bugdrop-board-production-host';
const BOARD_CONFIG_SCRIPT_ID = 'bugdrop-board-dogfood-config';
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

const boardCustomization = {
  layout: 'kanban',
  density: 'comfortable',
  copy: {
    heading: 'BugDrop launch board',
    titleLabel: 'Request',
    titlePlaceholder: 'Short launch request',
    descriptionLabel: 'Context',
    descriptionPlaceholder: 'Who needs this and what would it unblock?',
    submitLabel: 'Add request',
    submittingLabel: 'Adding...',
    loadingLabel: 'Loading launch requests...',
    emptyLabel: 'No launch requests yet. Add the first one for review.',
    errorTitle: "We couldn't load the launch board.",
    retryLabel: 'Try again',
    issuePrefix: 'GitHub #',
    upvoteLabel: 'Prioritize',
    upvotedLabel: 'Prioritized',
  },
  theme: {
    accent: '#8b5cf6',
    accentSoft: '#261b42',
    background: '#0b1020',
    border: '#2b3656',
    buttonBackground: '#8b5cf6',
    buttonRadius: '12px',
    buttonText: '#ffffff',
    fieldBackground: '#11172a',
    fieldRadius: '12px',
    fieldText: '#f8fbff',
    focus: '#c4b5fd',
    fontSize: '14px',
    headingSize: '24px',
    itemRadius: '16px',
    maxWidth: '1120px',
    muted: '#9aa8c7',
    radius: '18px',
    shadow: '0 24px 70px rgba(3, 7, 18, 0.32)',
    surface: '#11172a',
    surfaceAlt: '#171f36',
    text: '#f8fbff',
    upvoteBackground: '#171f36',
    upvoteBorder: '#2b3656',
    upvoteText: '#f8fbff',
  },
};

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
        background: radial-gradient(circle at top left, #261b42, transparent 34%), #080b18;
        color: #f8fbff;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin: 0;
      }
      main {
        margin: 0 auto;
        max-width: 1180px;
        padding: 40px 20px;
      }
      h1 {
        font-size: 32px;
        line-height: 1.2;
        margin: 0 0 12px;
      }
      p {
        color: #9aa8c7;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>BugDrop Board Dogfood</h1>
      <p>Signed in as dogfood viewer ${viewer.toUpperCase()}.</p>
      <section id="bugdrop-board-dogfood"></section>
    </main>
    <script type="application/json" id="${BOARD_CONFIG_SCRIPT_ID}">${escapeScriptJson(
      boardCustomization
    )}</script>
    <script
      src="${escapeAttribute(config.workerOrigin)}/board.js"
      data-board-id="${escapeAttribute(config.boardId)}"
      data-api-url="${escapeAttribute(config.workerOrigin)}"
      data-token-endpoint="/api/bugdrop-board-token?viewer=${viewer}"
      data-poll-interval="750"
      data-color="#8b5cf6"
      data-mount-selector="#bugdrop-board-dogfood"
      data-config-selector="#${BOARD_CONFIG_SCRIPT_ID}"
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

function escapeScriptJson(value: unknown): string {
  return JSON.stringify(value).replaceAll('</', '<\\/');
}
