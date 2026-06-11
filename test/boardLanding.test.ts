import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import app from '../src/index';
import type { Env } from '../src/types';

const boardLandingHtml = readFileSync('public/board/index.html', 'utf8');

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
          return new Response(boardLandingHtml, {
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
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('BugDrop Board fits inside your app.');
    expect(html).toContain('data-mount-selector="#bugdrop-board-demo"');
  });

  it('serves /board/ from the static board page asset', async () => {
    const response = await app.fetch(new Request('http://localhost/board/'), createEnv());
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('BugDrop Board');
  });

  it('declares a social preview image for Discord and other unfurlers', () => {
    expect(boardLandingHtml).toContain(
      '<link rel="canonical" href="https://bugdrop.dev/board/" />'
    );
    expect(boardLandingHtml).toContain('<meta property="og:type" content="website" />');
    expect(boardLandingHtml).toContain(
      '<meta property="og:image" content="https://bugdrop.dev/board/assets/launch-dark.png" />'
    );
    expect(boardLandingHtml).toContain('<meta property="og:image:width" content="1280" />');
    expect(boardLandingHtml).toContain('<meta property="og:image:height" content="720" />');
    expect(boardLandingHtml).toContain(
      '<meta name="twitter:card" content="summary_large_image" />'
    );
    expect(boardLandingHtml).toContain(
      '<meta name="twitter:image" content="https://bugdrop.dev/board/assets/launch-dark.png" />'
    );
  });

  it('embeds the live first-party board in the static page without dogfood framing', () => {
    expect(boardLandingHtml).toContain('id="live-demo"');
    expect(boardLandingHtml).toContain('Try the embedded board.');
    expect(boardLandingHtml).toContain('id="bugdrop-board-demo"');
    expect(boardLandingHtml).toContain('id="bugdrop-board-demo-config"');
    expect(boardLandingHtml).toContain('src="https://board.bugdrop.dev/board.js"');
    expect(boardLandingHtml).toContain(
      'data-board-id="board_mean_weasel_bugdrop_board_production_dogfood"'
    );
    expect(boardLandingHtml).toContain('data-api-url="https://board.bugdrop.dev"');
    expect(boardLandingHtml).toContain('data-token-endpoint="/api/bugdrop-board-token?viewer=a"');
    expect(boardLandingHtml).toContain('data-mount-selector="#bugdrop-board-demo"');
    expect(boardLandingHtml).toContain('data-config-selector="#bugdrop-board-demo-config"');
    expect(boardLandingHtml).toContain('"layout": "kanban"');
    expect(boardLandingHtml).toContain('"heading": "Feature requests"');
    expect(boardLandingHtml).toContain('"submitLabel": "Add idea"');
    expect(boardLandingHtml).not.toContain('Northstar');
    expect(boardLandingHtml).not.toContain('Open the dogfood board');
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
