import { describe, expect, it } from 'vitest';
import app from '../src/index';
import type { Env } from '../src/types';

function createEnv(): Env {
  return {
    GITHUB_APP_ID: 'test-app-id',
    GITHUB_PRIVATE_KEY: 'test-private-key',
    ENVIRONMENT: 'test',
    ALLOWED_ORIGINS: 'http://localhost:8787',
    GITHUB_APP_NAME: 'test-app',
    MAX_SCREENSHOT_SIZE_MB: '5',
    ASSETS: {
      fetch: async request => {
        const pathname = new URL(request.url).pathname;
        if (pathname === '/board/index.html') {
          return new Response('<html><h1>BugDrop Board fits inside your app.</h1></html>', {
            headers: { 'content-type': 'text/html; charset=utf-8' },
          });
        }
        if (pathname === '/board/assets/compact-saas.png') {
          return new Response('png', {
            headers: { 'content-type': 'image/png' },
          });
        }
        return new Response('Not found', { status: 404 });
      },
    } as Fetcher,
  };
}

describe('BugDrop Board landing page', () => {
  it('serves /board from the static board page asset', async () => {
    const response = await app.fetch(new Request('http://localhost/board'), createEnv());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(await response.text()).toContain('BugDrop Board fits inside your app.');
  });

  it('serves /board/ from the static board page asset', async () => {
    const response = await app.fetch(new Request('http://localhost/board/'), createEnv());

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
  });

  it('passes through board gallery assets', async () => {
    const response = await app.fetch(
      new Request('http://localhost/board/assets/compact-saas.png'),
      createEnv()
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(await response.text()).toBe('png');
  });
});
