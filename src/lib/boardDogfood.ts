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
  composer: 'collapsed',
  layout: 'kanban',
  density: 'comfortable',
  emptyLaneDisplay: 'hidden',
  issueLinks: 'hidden',
  copy: {
    heading: 'Feature requests',
    description: 'Add ideas, vote, and track progress.',
    titleLabel: 'What should we improve?',
    titlePlaceholder: 'A short product idea',
    descriptionLabel: 'Why does this matter?',
    descriptionPlaceholder: 'Who needs this, and what would it unlock?',
    submitLabel: 'Add idea',
    submittingLabel: 'Adding...',
    loadingLabel: 'Loading feature requests...',
    emptyLabel: 'No ideas yet. Add the first one for the team to review.',
    errorTitle: "We couldn't load feature requests.",
    retryLabel: 'Try again',
    issuePrefix: 'GitHub #',
    upvoteLabel: 'Vote',
    upvotedLabel: 'Voted',
  },
  theme: {
    accent: '#0f766e',
    accentSoft: '#ccfbf1',
    background: 'transparent',
    border: '#d8e2dc',
    borderWidth: '0px',
    buttonBackground: '#0f766e',
    buttonPadding: '6px 10px',
    buttonRadius: '9px',
    buttonText: '#ffffff',
    fieldBackground: '#ffffff',
    fieldRadius: '8px',
    fieldText: '#172026',
    focus: '#0f766e',
    fontSize: '14px',
    gap: '12px',
    headingSize: '22px',
    itemRadius: '10px',
    itemPadding: '14px',
    itemShadow: '0 12px 28px rgba(15, 23, 42, 0.06)',
    padding: '0',
    maxWidth: '100%',
    muted: '#60736f',
    radius: '12px',
    shadow: 'none',
    surface: '#ffffff',
    surfaceAlt: '#f3f7f4',
    text: '#172026',
    upvoteBackground: '#ecfdf5',
    upvoteBorder: '#99f6e4',
    upvoteText: '#0f766e',
  },
};

const DOGFOOD_PAGE_STYLE = `
      * { box-sizing: border-box; }
      body {
        background: #f4f7f5; color: #172026;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin: 0;
      }
      main { min-height: 100vh; }
      h1 { font-size: 32px; line-height: 1.2; margin: 0; }
      p { color: #64748b; margin: 0; }
      .demo-app { display: grid; grid-template-columns: 232px minmax(0, 1fr); min-height: 100vh; }
      .sidebar { background: #10201d; color: #dce8e3; padding: 24px; }
      .brand {
        align-items: center; display: flex; gap: 10px;
        font-size: 18px; font-weight: 800; margin-bottom: 28px;
      }
      .brand-mark {
        background: #14b8a6; border-radius: 8px; color: #ffffff;
        display: inline-grid; font-size: 13px; height: 30px;
        place-items: center; width: 30px;
      }
      .nav-item {
        border-radius: 8px; color: #bfd0ca; display: block;
        font-size: 14px; font-weight: 650; padding: 10px 12px;
      }
      .nav-item.active { background: #17342f; color: #ffffff; }
      .workspace { padding: 30px; }
      .topbar {
        align-items: center; display: flex; gap: 16px;
        justify-content: space-between; margin: 0 0 18px;
      }
      .viewer, .stat {
        background: #ffffff; border: 1px solid #d8e2dc; border-radius: 999px;
        color: #40524e; font-size: 13px; font-weight: 650;
      }
      .viewer { padding: 8px 12px; }
      .kicker {
        color: #0f766e; font-size: 12px; font-weight: 800;
        letter-spacing: 0; text-transform: uppercase;
      }
      .demo-framing {
        color: #40524e; font-size: 14px; line-height: 1.55;
      }
      .intro { display: grid; gap: 8px; max-width: 720px; }
      .intro-row { align-items: center; display: flex; flex-wrap: wrap; gap: 8px; }
      .stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 22px; }
      .stat { padding: 7px 10px; }
      .board-frame { display: grid; gap: 10px; max-width: 1180px; }
      .board-label {
        color: #60736f; font-size: 12px; font-weight: 750;
        letter-spacing: 0; text-transform: uppercase;
      }
      .board-surface { max-width: 1180px; }
      @media (max-width: 760px) {
        .demo-app { grid-template-columns: 1fr; }
        .sidebar { display: none; }
        .workspace { padding: 18px; }
        .topbar { align-items: flex-start; flex-direction: column; }
      }
`;

export function renderBoardDogfoodPage(env: Env, rawViewer: string | null): string {
  const viewer = normalizeViewer(rawViewer);
  const config = dogfoodConfig(env);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>BugDrop Feature Board Demo</title>
    <style>${DOGFOOD_PAGE_STYLE}</style>
  </head>
  <body>
    <main>
      <div class="demo-app">
        <aside class="sidebar" aria-label="Demo app navigation">
          <div class="brand"><span class="brand-mark">N</span>Northstar</div>
          <span class="nav-item">Overview</span>
          <span class="nav-item">Accounts</span>
          <span class="nav-item active">Feedback</span>
          <span class="nav-item">Roadmap</span>
          <span class="nav-item">Customers</span>
          <span class="nav-item">Settings</span>
        </aside>
        <section class="workspace" aria-label="Demo app workspace">
          <div class="topbar">
            <div class="intro">
              <div class="intro-row">
                <span class="kicker">BugDrop Board</span>
                <span class="stat">Demo</span>
              </div>
              <h1>Embedded feedback board</h1>
              <p>Collect feature requests, votes, and status updates inside your app.</p>
              <p class="demo-framing">Shown here themed for Northstar and synced to GitHub Issues.</p>
            </div>
            <span class="viewer">${viewerDisplayName(viewer)}</span>
          </div>
          <div class="stats" aria-label="Feedback board summary">
            <span class="stat">11 requests</span>
            <span class="stat">18 votes</span>
            <span class="stat">Private beta workspace</span>
            <span class="stat">GitHub sync</span>
            <span class="stat">Self-hostable</span>
          </div>
          <div class="board-frame">
            <span class="board-label">Demo board</span>
            <section class="board-surface" id="bugdrop-board-dogfood"></section>
          </div>
        </section>
      </div>
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
      data-color="#0f766e"
      data-mount-selector="#bugdrop-board-dogfood"
      data-config-selector="#${BOARD_CONFIG_SCRIPT_ID}"
    ></script>
  </body>
</html>`;
}

function viewerDisplayName(viewer: 'a' | 'b'): string {
  return viewer === 'b' ? 'Jordan Lee, beta user' : 'Maya Chen, beta user';
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
    displayName: `BugDrop Demo ${viewer.toUpperCase()}`,
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
