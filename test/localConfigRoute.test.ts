import { describe, expect, it } from 'vitest';
import app from '../src/index';
import type { Env } from '../src/types';

function createEnv(assetResponse: Response): Env {
  return {
    GITHUB_APP_ID: 'test-app-id',
    GITHUB_PRIVATE_KEY: 'test-private-key',
    ENVIRONMENT: 'test',
    ALLOWED_ORIGINS: 'http://localhost:8787',
    GITHUB_APP_NAME: 'test-app',
    MAX_SCREENSHOT_SIZE_MB: '5',
    ASSETS: {
      fetch: async () => assetResponse,
    } as Fetcher,
  };
}

describe('GET /test/local-config.js', () => {
  it('returns an empty JavaScript response when the local config asset is missing', async () => {
    const response = await app.fetch(
      new Request('http://localhost/test/local-config.js'),
      createEnv(new Response('Not found', { status: 404 }))
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
    expect(await response.text()).toBe('');
  });

  it('passes through an existing local config asset', async () => {
    const source = 'window.BugDropTestConfig = { repo: "local-owner/local-repo" };';
    const response = await app.fetch(
      new Request('http://localhost/test/local-config.js'),
      createEnv(
        new Response(source, {
          headers: { 'content-type': 'text/javascript; charset=utf-8' },
        })
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/javascript; charset=utf-8');
    expect(await response.text()).toBe(source);
  });
});
