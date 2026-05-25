import { Hono } from 'hono';
import { logger } from 'hono/logger';
import type { Env } from './types';
import api from './routes/api';

const app = new Hono<{ Bindings: Env }>();

// Log warning about missing credentials (but don't block non-authenticated routes)
let envChecked = false;
app.use('*', async (c, next) => {
  if (!envChecked) {
    const missing: string[] = [];
    if (!c.env.GITHUB_APP_ID) missing.push('GITHUB_APP_ID');
    if (!c.env.GITHUB_PRIVATE_KEY) missing.push('GITHUB_PRIVATE_KEY');

    if (missing.length > 0) {
      console.warn(
        `[BugDrop] Missing env vars (feedback endpoint will fail): ${missing.join(', ')}`
      );
    }

    // Warn about development-only settings
    if (c.env.ALLOWED_ORIGINS === '*' && c.env.ENVIRONMENT !== 'development') {
      console.warn('WARNING: ALLOWED_ORIGINS is set to "*" in non-development environment');
    }
    if (isWeakAuthTokenSecret(c.env.AUTH_TOKEN_SECRET)) {
      console.warn(
        '[BugDrop] AUTH_TOKEN_SECRET should be a long random value of at least 32 characters.'
      );
    }

    envChecked = true;
  }
  return next();
});

// Request logging
app.use('*', logger());

// Mount API routes
app.route('/api', api);

export function isWeakAuthTokenSecret(secret?: string): boolean {
  return typeof secret === 'string' && secret.length > 0 && secret.length < 32;
}

export function resolveRootRedirectUrl(rawUrl?: string): string {
  if (!rawUrl) {
    return 'https://bugdrop.dev';
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return rawUrl;
    }
  } catch {
    // Fall through to the hosted default.
  }

  console.warn(`[BugDrop] Ignoring invalid ROOT_REDIRECT_URL: ${rawUrl}`);
  return 'https://bugdrop.dev';
}

// Redirect to landing page on Vercel
app.get('/', c => {
  return c.redirect(resolveRootRedirectUrl(c.env.ROOT_REDIRECT_URL), 301);
});

// Serve widget.js from static assets
app.get('/widget.js', async c => {
  return c.env.ASSETS.fetch(c.req.raw);
});

// Local self-hosting override. If the ignored file is absent, return an empty
// script so test fixtures do not emit missing-resource console errors.
app.get('/test/local-config.js', async c => {
  const response = await c.env.ASSETS.fetch(c.req.raw);
  if (response.ok) {
    return response;
  }
  return new Response('', {
    headers: {
      'content-type': 'text/javascript; charset=utf-8',
    },
  });
});

export default app;
