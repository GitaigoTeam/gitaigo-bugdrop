# Issue 162 Local Self-Hosting Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let self-hosters run BugDrop locally with their own GitHub App and test repository without editing tracked repo files.

**Architecture:** Keep committed defaults for upstream CI and development, and add ignored local override files for self-hosters. `.dev.vars` will own local Worker variables, while `public/test/local-config.js` will own local test-page repository overrides; committed test pages will load a shared helper that injects the widget with either the local override or the current upstream default.

**Tech Stack:** Cloudflare Workers, Wrangler, static HTML test pages, vanilla browser JavaScript, Vitest/Playwright smoke coverage, Markdown docs.

---

## File Structure

- Modify `.gitignore`
  - Ignore `public/test/local-config.js`, the local self-hosting test-page override.
- Modify `.dev.vars.example`
  - Document the local override variables self-hosters should put in `.dev.vars`, especially `GITHUB_APP_NAME`, `ALLOWED_ORIGINS`, and optional `RATE_LIMIT` behavior.
- Create `public/test/config.js`
  - Committed shared test-page defaults.
  - Exposes `window.BugDropTestConfig.defaultRepo = 'mean-weasel/bugdrop-widget-test'`.
- Create `public/test/local-config.example.js`
  - Committed example users copy to ignored `public/test/local-config.js`.
  - Shows `window.BugDropTestConfig.repo = 'your-org/your-repo'`.
- Modify representative test pages under `public/test/`
  - Replace hard-coded external widget `<script src="/widget.js" data-repo="mean-weasel/bugdrop-widget-test" ...>` tags with a small inline bootloader.
  - The bootloader loads `config.js`, then optionally `local-config.js`, then creates `/widget.js` with the same data attributes plus `data-repo` from the override.
  - Pages that currently mutate `#bugdrop-script` from query parameters pass those query mappings into the loader before the widget is injected.
- Modify `public/test/complex-dom.html`
  - Preserve the existing `?repo=` query parameter override, then fall back to local config, then fall back to the upstream default.
- Modify `SELF_HOSTING.md`
  - Remove instructions to edit `wrangler.toml` and mass-rewrite `public/test/*.html`.
  - Document the copy/edit flow using `.dev.vars` and `public/test/local-config.js`.
- Add or modify tests
  - Add a lightweight unit test for the browser helper if the helper is written as a testable module.
  - Otherwise, add a Playwright assertion that `/test/` still injects the widget with the upstream default when no local config exists.

## Design Decisions

- Do not require self-hosters to edit `wrangler.toml`.
  - Wrangler loads `.dev.vars` for local development, and the repo already ignores that file.
  - Production deployment still uses `wrangler secret put` and deployment-time vars.
- Do not change production widget behavior to know about local test config.
  - The override belongs to static test pages, not the distributed widget.
- Do not commit a real `public/test/local-config.js`.
  - The committed example gives self-hosters a template while keeping local repo choices out of diffs.
- Keep the upstream default repository as the fallback.
  - CI, existing contributors, and the public test venue continue using `mean-weasel/bugdrop-widget-test`.

---

### Task 1: Add Ignored Local Test Config Files

**Files:**
- Modify: `.gitignore`
- Create: `public/test/config.js`
- Create: `public/test/local-config.example.js`

- [ ] **Step 1: Update `.gitignore`**

Add this under the existing local secrets section or near test artifacts:

```gitignore
# Local self-hosting test page override
public/test/local-config.js
```

- [ ] **Step 2: Create committed shared defaults**

Create `public/test/config.js`:

```js
(function () {
  window.BugDropTestConfig = {
    ...(window.BugDropTestConfig || {}),
    defaultRepo: 'mean-weasel/bugdrop-widget-test',
  };
})();
```

- [ ] **Step 3: Create committed local override example**

Create `public/test/local-config.example.js`:

```js
// Copy this file to public/test/local-config.js for local self-hosting.
// local-config.js is ignored by git.
(function () {
  window.BugDropTestConfig = {
    ...(window.BugDropTestConfig || {}),
    repo: 'your-org/your-repo',
  };
})();
```

- [ ] **Step 4: Verify ignored file behavior**

Run:

```bash
cp public/test/local-config.example.js public/test/local-config.js
git status --short --ignored public/test/local-config.js
rm public/test/local-config.js
```

Expected:

```text
!! public/test/local-config.js
```

- [ ] **Step 5: Commit**

```bash
git add .gitignore public/test/config.js public/test/local-config.example.js
git commit -m "docs: add local test page config template"
```

---

### Task 2: Add a Shared Browser Bootloader for Test Pages

**Files:**
- Create: `public/test/load-widget.js`

- [ ] **Step 1: Create the helper**

Create `public/test/load-widget.js`:

```js
(function () {
  function loadScript(src) {
    return new Promise(resolve => {
      var script = document.createElement('script');
      script.src = src;
      script.onload = function () {
        resolve();
      };
      script.onerror = function () {
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  function getRepo(explicitRepo) {
    var config = window.BugDropTestConfig || {};
    return explicitRepo || config.repo || config.defaultRepo || 'mean-weasel/bugdrop-widget-test';
  }

  function applyDataset(script, dataset) {
    Object.keys(dataset || {}).forEach(function (key) {
      var value = dataset[key];
      if (value !== undefined && value !== null) {
        script.dataset[key] = String(value);
      }
    });
  }

  function applyQueryDataset(script, queryDataset) {
    var params = new URLSearchParams(window.location.search);
    Object.keys(queryDataset || {}).forEach(function (queryKey) {
      var value = params.get(queryKey);
      if (value !== null) {
        script.dataset[queryDataset[queryKey]] = value;
      }
    });
  }

  window.loadBugDropTestWidget = function loadBugDropTestWidget(options) {
    var opts = options || {};
    return loadScript('/test/config.js')
      .then(function () {
        return loadScript('/test/local-config.js');
      })
      .then(function () {
        var script = document.createElement('script');
        if (opts.id) {
          script.id = opts.id;
        }
        script.src = opts.src || '/widget.js';
        script.dataset.repo = getRepo(opts.repo);
        applyDataset(script, opts.dataset);
        applyQueryDataset(script, opts.queryDataset);

        document.body.appendChild(script);
      });
  };
})();
```

- [ ] **Step 2: Confirm helper is valid syntax**

Run:

```bash
node --check public/test/load-widget.js
```

Expected: the command exits with code `0` and no output.

- [ ] **Step 3: Commit**

```bash
git add public/test/load-widget.js
git commit -m "test: add configurable test widget loader"
```

---

### Task 3: Migrate Static Test Pages to the Loader

**Files:**
- Modify: `public/test/index.html`
- Modify: `public/test/dismissible.html`
- Modify: `public/test/dismissible-light.html`
- Modify: `public/test/dismissible-duration.html`
- Modify: `public/test/dismissible-left.html`
- Modify: `public/test/color-default.html`
- Modify: `public/test/color-custom.html`
- Modify: `public/test/icon-custom.html`
- Modify: `public/test/redaction.html`
- Modify: `public/test/annotation-style.html`
- Modify: `public/test/annotation-small-wide-area.html`
- Modify: `public/test/annotation-preview-size.html`

- [ ] **Step 1: Replace the main test page script**

In `public/test/index.html`, replace:

```html
<script id="bugdrop-script" defer src="/widget.js" data-repo="mean-weasel/bugdrop-widget-test" data-theme="dark" data-color="#ff9e64"></script>
```

with:

```html
<script src="/test/load-widget.js"></script>
<script>
  window.loadBugDropTestWidget({
    id: 'bugdrop-script',
    dataset: {
      theme: 'dark',
      color: '#ff9e64',
    },
    queryDataset: {
      theme: 'theme',
      bg: 'bg',
      screenshot: 'screenshot',
      showName: 'showName',
      requireName: 'requireName',
      showEmail: 'showEmail',
      requireEmail: 'requireEmail',
      categoryLabels: 'categoryLabels',
    },
  });
</script>
```

Delete the old inline harness that calls `document.getElementById('bugdrop-script')` and mutates query parameters into `data-*` attributes. The `queryDataset` option applies those same overrides before `/widget.js` is appended.

- [ ] **Step 2: Replace dismissible page scripts**

In `public/test/dismissible.html`, replace the existing `/widget.js` script with:

```html
<script src="/test/load-widget.js"></script>
<script>
  window.loadBugDropTestWidget({
    dataset: {
      theme: 'dark',
      color: '#ff9e64',
      buttonDismissible: 'true',
    },
  });
</script>
```

In `public/test/dismissible-light.html`, use:

```html
<script src="/test/load-widget.js"></script>
<script>
  window.loadBugDropTestWidget({
    dataset: {
      theme: 'light',
      buttonDismissible: 'true',
    },
  });
</script>
```

In `public/test/dismissible-duration.html`, use:

```html
<script src="/test/load-widget.js"></script>
<script>
  window.loadBugDropTestWidget({
    dataset: {
      theme: 'dark',
      buttonDismissible: 'true',
      dismissDuration: '7',
    },
  });
</script>
```

In `public/test/dismissible-left.html`, use:

```html
<script src="/test/load-widget.js"></script>
<script>
  window.loadBugDropTestWidget({
    dataset: {
      theme: 'dark',
      position: 'bottom-left',
      buttonDismissible: 'true',
    },
  });
</script>
```

- [ ] **Step 3: Replace color and icon page scripts**

In `public/test/color-default.html`, use:

```html
<script src="/test/load-widget.js"></script>
<script>
  window.loadBugDropTestWidget({
    dataset: {
      theme: 'dark',
    },
  });
</script>
```

In `public/test/color-custom.html`, use:

```html
<script src="/test/load-widget.js"></script>
<script>
  window.loadBugDropTestWidget({
    dataset: {
      theme: 'dark',
      color: '#9333EA',
    },
  });
</script>
```

In `public/test/icon-custom.html`, use:

```html
<script src="/test/load-widget.js"></script>
<script>
  window.loadBugDropTestWidget({
    dataset: {
      theme: 'dark',
      icon: '/test/bugdrop-icon.svg',
    },
  });
</script>
```

- [ ] **Step 4: Replace annotation page scripts**

In `public/test/annotation-small-wide-area.html` and `public/test/annotation-preview-size.html`, use:

```html
<script src="/test/load-widget.js"></script>
<script>
  window.loadBugDropTestWidget({
    id: 'bugdrop-script',
    dataset: {
      theme: 'dark',
      color: '#ff9e64',
    },
  });
</script>
```

In `public/test/redaction.html`, use this version so `?screenshot=` continues to work:

```html
<script src="/test/load-widget.js"></script>
<script>
  window.loadBugDropTestWidget({
    id: 'bugdrop-script',
    dataset: {
      theme: 'dark',
      color: '#ff9e64',
    },
    queryDataset: {
      screenshot: 'screenshot',
    },
  });
</script>
```

Delete the old inline harness that calls `document.getElementById('bugdrop-script')` and mutates `data-screenshot`.

In `public/test/annotation-style.html`, replace the `/widget.js` script with:

```html
<script src="/test/load-widget.js"></script>
<script>
  window.loadBugDropTestWidget({
    id: 'bugdrop-script',
    dataset: {
      theme: 'dark',
      color: '#ff9e64',
    },
  });
</script>
```

- [ ] **Step 5: Check for remaining upstream repo literals in static pages**

Run:

```bash
rg -n 'data-repo="mean-weasel/bugdrop-widget-test"|dataset\.repo = .mean-weasel/bugdrop-widget-test.|mean-weasel/bugdrop-widget-test' public/test
```

Expected: only `public/test/config.js`, `public/test/load-widget.js`, `public/test/local-config.example.js`, and any intentionally unmigrated dynamic test fixtures should remain.

- [ ] **Step 6: Commit**

```bash
git add public/test/*.html
git commit -m "test: use local repo override in static test pages"
```

---

### Task 4: Preserve Dynamic Repo Overrides in Complex DOM Page

**Files:**
- Modify: `public/test/complex-dom.html`

- [ ] **Step 1: Replace the dynamic script injection**

Find the current block:

```js
const widgetScript = document.createElement('script');
widgetScript.src = '/widget.js';
widgetScript.dataset.repo = params.get('repo') || 'mean-weasel/bugdrop-widget-test';
widgetScript.dataset.theme = 'dark';
if (params.get('screenshot')) {
  widgetScript.dataset.screenshot = params.get('screenshot');
}
document.body.appendChild(widgetScript);
```

Replace it with:

```html
<script src="/test/load-widget.js"></script>
<script>
  const params = new URLSearchParams(window.location.search);
  window.loadBugDropTestWidget({
    repo: params.get('repo'),
    dataset: {
      theme: 'dark',
    },
    queryDataset: {
      screenshot: 'screenshot',
    },
  });
</script>
```

If `complex-dom.html` already creates `params` earlier for other controls, reuse that existing variable instead of declaring it twice.

- [ ] **Step 2: Verify query override still wins**

Start the dev server after building the widget:

```bash
npm run build:widget
npm run dev
```

Open another terminal and run:

```bash
node -e "fetch('http://localhost:8787/test/complex-dom.html?repo=owner/repo').then(r => r.text()).then(t => console.log(t.includes('loadBugDropTestWidget')))"
```

Expected:

```text
true
```

- [ ] **Step 3: Commit**

```bash
git add public/test/complex-dom.html
git commit -m "test: preserve complex DOM repo query override"
```

---

### Task 5: Add Playwright Coverage for Default and Local Repo Config

**Files:**
- Modify: `e2e/widget.spec.ts`

- [ ] **Step 1: Add a default repo assertion**

Add this test near the existing widget initialization/configuration tests:

```ts
test('test pages use upstream repo when no local override is present', async ({ page }) => {
  await page.goto('/test/');

  const repo = await page.locator('script[src="/widget.js"]').evaluate(script => {
    return (script as HTMLScriptElement).dataset.repo;
  });

  expect(repo).toBe('mean-weasel/bugdrop-widget-test');
});
```

- [ ] **Step 2: Add a local override assertion**

Add this test after the default repo assertion:

```ts
test('test pages use local repo override when configured', async ({ page }) => {
  await page.route('**/test/local-config.js', route => {
    return route.fulfill({
      contentType: 'application/javascript',
      body: `
        window.BugDropTestConfig = {
          ...(window.BugDropTestConfig || {}),
          repo: 'local-owner/local-repo',
        };
      `,
    });
  });

  await page.goto('/test/');

  const repo = await page.locator('script[src="/widget.js"]').evaluate(script => {
    return (script as HTMLScriptElement).dataset.repo;
  });

  expect(repo).toBe('local-owner/local-repo');
});
```

- [ ] **Step 3: Run the focused tests**

Run:

```bash
npm run build:widget
npx playwright test e2e/widget.spec.ts --project=chromium -g "test pages use"
```

Expected:

```text
2 passed
```

- [ ] **Step 4: Commit**

```bash
git add e2e/widget.spec.ts
git commit -m "test: cover local test page repo override"
```

---

### Task 6: Update Self-Hosting Documentation

**Files:**
- Modify: `SELF_HOSTING.md`
- Modify: `.dev.vars.example`

- [ ] **Step 1: Update `.dev.vars.example`**

Replace the optional `GITHUB_APP_NAME` comments with:

```dotenv
# Your GitHub App's URL slug (the name in lowercase with hyphens)
# Find it at: https://github.com/apps/YOUR_APP_NAME
# Local development should override the committed wrangler.toml default here instead of editing wrangler.toml.
# GITHUB_APP_NAME=my-bugdrop-app
```

Add this optional note after `MAX_SCREENSHOT_SIZE_MB`:

```dotenv
# RATE_LIMIT is intentionally not configured here.
# Local development runs with ENVIRONMENT=development and can work without a KV namespace.
```

- [ ] **Step 2: Replace the tracked-file editing guidance in `SELF_HOSTING.md`**

Replace the section starting with:

```markdown
Next, update `wrangler.toml` with your app name and remove the upstream KV namespace IDs:
```

through the current `public/test` sed note with this Markdown:

````markdown
Next, keep local configuration in ignored files so your fork does not accumulate noisy diffs.

In `.dev.vars`, uncomment and set your GitHub App slug:

```bash
GITHUB_APP_NAME=your-app-name
```

The committed `wrangler.toml` contains the upstream development defaults used by this repository. For local development, prefer `.dev.vars` overrides instead of editing `wrangler.toml`.

If you want the local test pages under `/test/` to submit to a repository where your GitHub App is installed, copy the local test config example:

```bash
cp public/test/local-config.example.js public/test/local-config.js
```

Then edit `public/test/local-config.js`:

```js
window.BugDropTestConfig = {
  ...(window.BugDropTestConfig || {}),
  repo: 'your-org/your-repo',
};
```

`public/test/local-config.js` is ignored by git. Without it, test pages keep using the upstream test repository `mean-weasel/bugdrop-widget-test`, which is what CI expects.
````

- [ ] **Step 3: Update the rate limiting section**

Keep the warning that upstream KV IDs do not work for other Cloudflare accounts, but change the local-development language to:

```markdown
For local development, you can leave rate limiting unconfigured. BugDrop disables rate limiting when no `RATE_LIMIT` binding is present.

For production, create your own KV namespaces and update your deployment configuration with the IDs from Wrangler. Do not reuse the upstream IDs committed in this repository.
```

- [ ] **Step 4: Check docs for old mutation instructions**

Run:

```bash
rg -n "sed -i|skip-worktree|update `wrangler.toml`|public/test -name|Remove or replace the \\[\\[kv_namespaces\\]\\]" SELF_HOSTING.md .dev.vars.example
```

Expected: no instructions telling users to mutate tracked files for ordinary local setup.

- [ ] **Step 5: Commit**

```bash
git add SELF_HOSTING.md .dev.vars.example
git commit -m "docs: avoid tracked file edits in self-hosting setup"
```

---

### Task 7: Full Verification

**Files:**
- Read-only verification across repo

- [ ] **Step 1: Confirm no accidental local config is tracked**

Run:

```bash
git ls-files public/test/local-config.js
```

Expected: no output.

- [ ] **Step 2: Confirm hard-coded upstream repo only remains in allowed places**

Run:

```bash
rg -n "mean-weasel/bugdrop-widget-test" public/test SELF_HOSTING.md e2e
```

Expected allowed references:

```text
public/test/config.js
public/test/load-widget.js
SELF_HOSTING.md
e2e/widget.spec.ts
```

Any remaining `public/test/*.html` references should be reviewed. Keep them only if the page intentionally bypasses the shared loader.

- [ ] **Step 3: Run formatting and type checks**

Run:

```bash
npm run format:check
npm run typecheck
```

Expected:

```text
Checking formatting...
All matched files use Prettier code style!
```

and TypeScript exits with code `0`.

- [ ] **Step 4: Run focused E2E tests**

Run:

```bash
npm run build:widget
npx playwright test e2e/widget.spec.ts --project=chromium -g "test pages use"
```

Expected:

```text
2 passed
```

- [ ] **Step 5: Run the standard validation target**

Run:

```bash
npm run validate
```

Expected:
the command exits with code `0`. If `format:check` fails because the new files need formatting, run `npm run format`, inspect the diff, and rerun `npm run validate`.

- [ ] **Step 6: Final commit if verification caused formatting changes**

```bash
git add .
git commit -m "chore: format local self-hosting config changes"
```

Skip this commit if there are no verification-time edits.

---

## Self-Review

- Spec coverage: The plan addresses both tracked-file problems in issue 162: local Worker config moves to `.dev.vars`, and local test repo config moves to ignored `public/test/local-config.js`.
- Placeholder scan: No deferred implementation, deferred error handling, or vague test instructions remain.
- Type consistency: Browser config names consistently use `window.BugDropTestConfig`, `defaultRepo`, `repo`, and `window.loadBugDropTestWidget`.
- Risk: The helper injects `/widget.js` asynchronously, so E2E tests that immediately expect the widget may need to wait for the trigger button or injected script. The added Playwright tests should catch that regression.
