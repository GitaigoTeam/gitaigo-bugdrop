import type { Env } from '../types';

const DEFAULT_BOARD_ID = 'board_mean_weasel_bugdrop_board_production_dogfood';
const DEFAULT_TOKEN_AUDIENCE = 'bugdrop-board';
const DEFAULT_TOKEN_ISSUER = 'bugdrop-board-production-host';
const TOKEN_TTL_SECONDS = 300;

interface BoardDogfoodConfig {
  boardId: string;
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
