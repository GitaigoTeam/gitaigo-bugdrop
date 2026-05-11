import { test, expect } from '@playwright/test';

test.describe('BugDrop Sandbox', () => {
  test('serves sandbox route assets from the Worker', async ({ request }) => {
    const cases: Array<{ path: string; contentType: RegExp }> = [
      { path: '/sandbox/', contentType: /html/ },
      { path: '/sandbox/preview', contentType: /html/ },
      { path: '/sandbox/attribute-map.js', contentType: /javascript/ },
      { path: '/sandbox/sanitizers.js', contentType: /javascript/ },
      { path: '/sandbox/sandbox.css', contentType: /css/ },
      { path: '/sandbox/sandbox.js', contentType: /javascript/ },
      { path: '/widget.js', contentType: /javascript/ },
    ];
    for (const { path, contentType } of cases) {
      const response = await request.get(path);
      expect(response.ok(), `${path} should resolve`).toBe(true);
      expect(response.headers()['content-type'], `${path} content-type`).toMatch(contentType);
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
    let releaseSlow: (() => void) | undefined;
    const slowReleased = new Promise<void>(resolve => {
      releaseSlow = resolve;
    });
    await page.route('**/api/check/slow/repo', async route => {
      await slowReleased;
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
    await expect(page.locator('#repo-feedback')).toHaveText('Checking GitHub App installation...');
    await page.locator('#repo').fill('fast/repo');
    await page.locator('#check-installation').click();
    await expect(page.locator('#repo-feedback')).toHaveText(
      'BugDrop is not installed on fast/repo.'
    );

    // Now release the slow request; its callback must not clobber the fast result.
    releaseSlow?.();
    // Drive the deterministic guarantee: poll for stability rather than wall-clock wait.
    await expect
      .poll(() => page.locator('#repo-feedback').textContent(), { timeout: 2000 })
      .toBe('BugDrop is not installed on fast/repo.');
  });

  test('discards stale check when repo input changes mid-flight (no second click)', async ({
    page,
  }) => {
    let releaseSlow: (() => void) | undefined;
    const slowReleased = new Promise<void>(resolve => {
      releaseSlow = resolve;
    });
    await page.route('**/api/check/slow/repo', async route => {
      await slowReleased;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ installed: true, repo: 'slow/repo' }),
      });
    });

    await page.goto('/sandbox/');
    await page.locator('#repo').fill('slow/repo');
    await page.locator('#check-installation').click();
    await expect(page.locator('#repo-feedback')).toHaveText('Checking GitHub App installation...');

    // User edits the repo without clicking check again, then the slow response returns.
    await page.locator('#repo').fill('other/repo');
    releaseSlow?.();

    // Validation feedback (from input handler) is fine; what must NOT happen is the
    // stale "installed on slow/repo" text overwriting it.
    await expect(page.locator('#repo-feedback')).not.toHaveText(/installed on slow\/repo/, {
      timeout: 2000,
    });
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

  test('surfaces an "ignored invalid values" notice when sanitizers reject input', async ({
    page,
  }) => {
    await page.goto('/sandbox/');
    const notice = page.locator('#sanitize-feedback');
    await expect(notice).toBeHidden();

    // Inject a value the CSS-token sanitizer rejects.
    await page.locator('#color').fill('red"; onerror="alert(1)');

    await expect(notice).toBeVisible();
    await expect(notice).toContainText(/Ignored invalid values for: .*Accent color/);
    await expect(page.locator('#script-code')).not.toContainText('data-color');

    // Restoring a valid value clears the notice.
    await page.locator('#color').fill('#7c3aed');
    await expect(notice).toBeHidden();
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
