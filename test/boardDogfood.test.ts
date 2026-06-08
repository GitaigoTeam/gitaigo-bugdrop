import { describe, expect, it } from 'vitest';
import app from '../src/index';
import type { Env } from '../src/types';

const boardSecret = 'board-dogfood-secret-with-at-least-32-bytes';
const boardId = 'board_mean_weasel_bugdrop_board_production_dogfood';

const env = {
  GITHUB_APP_ID: 'test-app-id',
  GITHUB_PRIVATE_KEY: 'test-private-key',
  ENVIRONMENT: 'test',
  ALLOWED_ORIGINS: '*',
  GITHUB_APP_NAME: 'test-bugdrop-app',
  MAX_SCREENSHOT_SIZE_MB: '5',
  ASSETS: { fetch: () => new Response('not found', { status: 404 }) } as Fetcher,
  BUGDROP_BOARD_TOKEN_SECRET: boardSecret,
} satisfies Env;

describe('BugDrop Board dogfood host', () => {
  it('redirects legacy board dogfood traffic to the first-party board demo', async () => {
    const response = await app.fetch(
      new Request('https://bugdrop.dev/board-dogfood?viewer=b'),
      env
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/board?viewer=b');
  });

  it('redirects legacy board dogfood traffic without a viewer query', async () => {
    const response = await app.fetch(new Request('https://bugdrop.dev/board-dogfood'), env);

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/board');
  });

  it('signs a short-lived board token for viewer b without exposing the secret', async () => {
    const response = await app.fetch(
      new Request('https://bugdrop.dev/api/bugdrop-board-token?viewer=b'),
      env
    );
    const body = (await response.json()) as { token: string };
    const claims = await verifyBoardToken(body.token, boardSecret);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(JSON.stringify(body)).not.toContain(boardSecret);
    expect(claims).toMatchObject({
      boardId,
      externalUserId: 'bugdrop-dev-dogfood-b',
      displayName: 'BugDrop Demo B',
      aud: 'bugdrop-board',
      iss: 'bugdrop-board-production-host',
    });
    expect(claims).not.toHaveProperty('tenantId');
    expect(claims).not.toHaveProperty('appId');
    expect(claims.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(claims.exp).toBeLessThanOrEqual(Math.floor(Date.now() / 1000) + 300);
  });

  it('adds hosted tenant and app claims when configured', async () => {
    const response = await app.fetch(
      new Request('https://bugdrop.dev/api/bugdrop-board-token?viewer=a'),
      {
        ...env,
        BUGDROP_BOARD_TENANT_ID: 'tenant_mean_weasel',
        BUGDROP_BOARD_APP_ID: 'app_mean_weasel_bugdrop_dogfood',
      }
    );
    const body = (await response.json()) as { token: string };
    const claims = await verifyBoardToken(body.token, boardSecret);

    expect(response.status).toBe(200);
    expect(claims).toMatchObject({
      boardId,
      tenantId: 'tenant_mean_weasel',
      appId: 'app_mean_weasel_bugdrop_dogfood',
    });
  });

  it('rejects token requests when the board signing secret is missing', async () => {
    const response = await app.fetch(
      new Request('https://bugdrop.dev/api/bugdrop-board-token?viewer=a'),
      { ...env, BUGDROP_BOARD_TOKEN_SECRET: '' }
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: 'BugDrop Board dogfood token signing is not configured',
    });
  });
});

interface BoardTokenClaims {
  boardId: string;
  tenantId?: string;
  appId?: string;
  externalUserId: string;
  displayName: string;
  exp: number;
  aud: string;
  iss: string;
}

async function verifyBoardToken(token: string, secret: string): Promise<BoardTokenClaims> {
  const [payload, signature, extra] = token.split('.');
  expect(payload).toBeTruthy();
  expect(signature).toBeTruthy();
  expect(extra).toBeUndefined();

  const expectedSignature = await sign(payload ?? '', secret);
  expect(signature).toBe(expectedSignature);

  return JSON.parse(base64UrlDecode(payload ?? '')) as BoardTokenClaims;
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

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
}
