import { test, expect } from '@playwright/test';

test.describe('BugDrop Sandbox', () => {
  test('serves sandbox route assets from the Worker', async ({ request }) => {
    for (const path of [
      '/sandbox/',
      '/sandbox/preview',
      '/sandbox/sandbox.css',
      '/sandbox/sandbox.js',
      '/widget.js',
    ]) {
      const response = await request.get(path);
      expect(response.ok(), `${path} should resolve`).toBe(true);
    }
  });

  test('generates a script tag and loads the configured preview widget', async ({ page }) => {
    const widgetRequests: string[] = [];
    page.on('request', request => {
      if (request.url().endsWith('/widget.js')) widgetRequests.push(request.url());
    });

    await page.route('**/api/check/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ installed: true, repo: 'mean-weasel/bugdrop' }),
      });
    });

    await page.goto('/sandbox/');

    await expect(page.getByRole('heading', { name: 'BugDrop Sandbox' })).toBeVisible();
    await expect(page.locator('#sandbox-preview')).toHaveAttribute('sandbox', /allow-scripts/);
    await expect(page.locator('#script-code')).toContainText('data-repo="mean-weasel/bugdrop"');

    await page.locator('#repo').fill('acme/app');
    await page.locator('#theme').selectOption('dark');
    await page.locator('#position').selectOption('bottom-left');
    await page.locator('#screenshot').selectOption('required');
    await page.locator('#label').fill('Send Feedback');
    await page.locator('#icon').fill('none');
    await page.locator('#screenshotScale').fill('3');
    await page.locator('#radius').fill('10px');
    await page.locator('#categoryLabels').fill('{"bug":["defect"],"feature":"idea"}');

    const scriptCode = page.locator('#script-code');
    await expect(scriptCode).toContainText('data-repo="acme/app"');
    await expect(scriptCode).toContainText('data-theme="dark"');
    await expect(scriptCode).toContainText('data-position="bottom-left"');
    await expect(scriptCode).toContainText('data-screenshot="required"');
    await expect(scriptCode).toContainText('data-label="Send Feedback"');
    await expect(scriptCode).toContainText('data-icon="none"');
    await expect(scriptCode).toContainText('data-screenshot-scale="3"');
    await expect(scriptCode).toContainText('data-radius="10px"');
    await expect(scriptCode).toContainText(
      'data-category-labels="{&quot;bug&quot;:[&quot;defect&quot;],&quot;feature&quot;:&quot;idea&quot;}"'
    );
    await expect(scriptCode).not.toContainText('async');
    await expect(scriptCode).not.toContainText('defer');

    const frame = page.frameLocator('#sandbox-preview');
    await expect(frame.locator('#bugdrop-host').locator('css=.bd-trigger')).toBeVisible({
      timeout: 10_000,
    });
    await expect(frame.locator('[data-bugdrop-mask]')).toHaveCount(3);
    expect(widgetRequests.some(url => url === `${new URL(page.url()).origin}/widget.js`)).toBe(
      true
    );
  });

  test('validates and encodes repo paths before checking installation', async ({ page }) => {
    const checkRequests: string[] = [];
    await page.route('**/api/check/**', async route => {
      checkRequests.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ installed: false, repo: 'acme/app' }),
      });
    });

    await page.goto('/sandbox/');

    await page.locator('#repo').fill('not-a-repo');
    await expect(page.locator('#repo-feedback')).toHaveText(
      'Repository must use GitHub owner/repo format with letters, numbers, dots, underscores, or hyphens.'
    );

    await page.locator('#repo').fill('acme/app?x=1');
    await expect(page.locator('#repo-feedback')).toHaveText(
      'Repository must use GitHub owner/repo format with letters, numbers, dots, underscores, or hyphens.'
    );

    await page.locator('#repo').fill('acme/app');
    await expect(page.locator('#repo-feedback')).toHaveText('Ready to check installation.');
    await page.locator('#check-installation').click();
    await expect(page.locator('#repo-feedback')).toHaveText(
      'BugDrop is not installed on acme/app.'
    );
    expect(checkRequests).toContain(`${new URL(page.url()).origin}/api/check/acme/app`);
  });

  test('ignores stale installation checks when repo changes', async ({ page }) => {
    await page.route('**/api/check/slow/repo', async route => {
      await new Promise(resolve => setTimeout(resolve, 250));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ installed: true, repo: 'slow/repo' }),
      });
    });
    await page.route('**/api/check/fast/repo', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ installed: false, repo: 'fast/repo' }),
      });
    });

    await page.goto('/sandbox/');
    await page.locator('#repo').fill('slow/repo');
    await page.locator('#check-installation').click();
    await page.locator('#repo').fill('fast/repo');
    await page.locator('#check-installation').click();

    await expect(page.locator('#repo-feedback')).toHaveText(
      'BugDrop is not installed on fast/repo.'
    );
    await page.waitForTimeout(300);
    await expect(page.locator('#repo-feedback')).toHaveText(
      'BugDrop is not installed on fast/repo.'
    );
  });

  test('required contact fields imply visible contact fields in generated script', async ({
    page,
  }) => {
    await page.goto('/sandbox/');

    await page.locator('#requireEmail').check();
    await page.locator('#requireName').check();

    const scriptCode = page.locator('#script-code');
    await expect(scriptCode).toContainText('data-show-email="true"');
    await expect(scriptCode).toContainText('data-require-email="true"');
    await expect(scriptCode).toContainText('data-show-name="true"');
    await expect(scriptCode).toContainText('data-require-name="true"');
  });

  test('reports clipboard failures without throwing', async ({ page }) => {
    await page.goto('/sandbox/');
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      });
    });

    await page.locator('#copy-script').click();
    await expect(page.locator('#copy-script')).toHaveText('Copy failed');
  });
});
