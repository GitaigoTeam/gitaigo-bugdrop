const form = document.querySelector('#sandbox-form');
const preview = document.querySelector('#sandbox-preview');
const scriptCode = document.querySelector('#script-code');
const repoFeedback = document.querySelector('#repo-feedback');
const copyButton = document.querySelector('#copy-script');
const checkButton = document.querySelector('#check-installation');
const refreshButton = document.querySelector('#refresh-preview');
const GITHUB_REPO_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/[A-Za-z0-9._-]{1,100}$/;
const SAFE_TEXT_PATTERN = /^[\w .,:;!?@#%&()[\]/'"_+=-]{0,120}$/;
let installationCheckId = 0;

const SCRIPT_ATTRIBUTE_MAP = {
  repo: 'data-repo',
  theme: 'data-theme',
  position: 'data-position',
  color: 'data-color',
  label: 'data-label',
  icon: 'data-icon',
  screenshot: 'data-screenshot',
  welcome: 'data-welcome',
  showName: 'data-show-name',
  requireName: 'data-require-name',
  showEmail: 'data-show-email',
  requireEmail: 'data-require-email',
  buttonDismissible: 'data-button-dismissible',
  dismissDuration: 'data-dismiss-duration',
  showRestore: 'data-show-restore',
  showButton: 'data-button',
  screenshotScale: 'data-screenshot-scale',
  font: 'data-font',
  radius: 'data-radius',
  bg: 'data-bg',
  text: 'data-text',
  borderWidth: 'data-border-width',
  borderColor: 'data-border-color',
  shadow: 'data-shadow',
  categoryLabels: 'data-category-labels',
};

function readConfig() {
  return {
    repo: form.repo.value.trim(),
    theme: form.theme.value,
    position: form.position.value,
    color: form.color.value.trim(),
    label: form.label.value.trim(),
    icon: form.icon.value,
    screenshot: form.screenshot.value,
    welcome: form.welcome.value,
    showName: form.showName.checked,
    requireName: form.requireName.checked,
    showEmail: form.showEmail.checked,
    requireEmail: form.requireEmail.checked,
    buttonDismissible: form.buttonDismissible.checked,
    dismissDuration: form.dismissDuration.value.trim(),
    showRestore: form.showRestore.checked,
    showButton: form.showButton.checked,
    screenshotScale: form.screenshotScale.value.trim(),
    font: form.font.value.trim(),
    radius: form.radius.value.trim(),
    bg: form.bg.value.trim(),
    text: form.text.value.trim(),
    borderWidth: form.borderWidth.value.trim(),
    borderColor: form.borderColor.value.trim(),
    shadow: form.shadow.value.trim(),
    categoryLabels: form.categoryLabels.value.trim(),
  };
}

function normalizeConfig(config) {
  return {
    ...config,
    showName: config.requireName || config.showName,
    showEmail: config.requireEmail || config.showEmail,
  };
}

function sanitizeConfig(config) {
  const normalized = normalizeConfig(config);
  const validRepo = isValidRepo(normalized.repo) ? normalized.repo : '';

  return {
    ...normalized,
    repo: validRepo,
    theme: ['auto', 'light', 'dark'].includes(normalized.theme) ? normalized.theme : 'auto',
    position: ['bottom-right', 'bottom-left'].includes(normalized.position)
      ? normalized.position
      : 'bottom-right',
    screenshot: ['optional', 'required', 'auto'].includes(normalized.screenshot)
      ? normalized.screenshot
      : 'optional',
    welcome: ['once', 'always', 'never'].includes(normalized.welcome)
      ? normalized.welcome
      : 'once',
    color: sanitizeCssToken(normalized.color, 80),
    label: sanitizePlainText(normalized.label, 80),
    icon: sanitizeIcon(normalized.icon),
    dismissDuration: sanitizeDismissDuration(normalized.dismissDuration),
    screenshotScale: sanitizeScreenshotScale(normalized.screenshotScale),
    font: sanitizeCssToken(normalized.font, 120),
    radius: sanitizeCssToken(normalized.radius, 40),
    bg: sanitizeCssToken(normalized.bg, 80),
    text: sanitizeCssToken(normalized.text, 80),
    borderWidth: sanitizeCssToken(normalized.borderWidth, 40),
    borderColor: sanitizeCssToken(normalized.borderColor, 80),
    shadow: sanitizeCssToken(normalized.shadow, 120),
    categoryLabels: sanitizeCategoryLabels(normalized.categoryLabels),
  };
}

function getWidgetSrc() {
  return `${window.location.origin}/widget.js`;
}

function getScriptAttributes(config) {
  const attrs = {
    repo: config.repo,
    theme: config.theme,
    position: config.position,
    color: config.color,
    label: config.label,
    icon: config.icon,
    screenshot: config.screenshot,
    welcome: config.welcome === 'once' ? '' : config.welcome,
    showName: config.showName ? 'true' : '',
    requireName: config.requireName ? 'true' : '',
    showEmail: config.showEmail ? 'true' : '',
    requireEmail: config.requireEmail ? 'true' : '',
    buttonDismissible: config.buttonDismissible ? 'true' : '',
    dismissDuration: config.dismissDuration,
    showRestore: config.showRestore ? '' : 'false',
    showButton: config.showButton ? '' : 'false',
    screenshotScale: config.screenshotScale === '2' ? '' : config.screenshotScale,
    font: config.font,
    radius: config.radius,
    bg: config.bg,
    text: config.text,
    borderWidth: config.borderWidth,
    borderColor: config.borderColor,
    shadow: config.shadow,
    categoryLabels: config.categoryLabels,
  };

  return Object.entries(attrs).filter(([, value]) => value !== '');
}

function generateScriptTag(config) {
  const lines = [`<script`, `  src="${getWidgetSrc()}"`];

  for (const [key, value] of getScriptAttributes(config)) {
    lines.push(`  ${SCRIPT_ATTRIBUTE_MAP[key]}="${escapeAttribute(value)}"`);
  }

  lines[lines.length - 1] = `${lines[lines.length - 1]}></script>`;
  return lines.join('\n');
}

function escapeAttribute(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function isValidRepo(repo) {
  return GITHUB_REPO_PATTERN.test(repo) && !repo.endsWith('.git');
}

function getRepoPath(repo) {
  const [owner, name] = repo.split('/');
  return `${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

function sanitizePlainText(value, maxLength) {
  const trimmed = value.trim().slice(0, maxLength);
  return SAFE_TEXT_PATTERN.test(trimmed) ? trimmed : '';
}

function sanitizeCssToken(value, maxLength) {
  const trimmed = value.trim().slice(0, maxLength);
  return /^[^<>"`{}]*$/.test(trimmed) ? trimmed : '';
}

function sanitizeIcon(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'none') return trimmed;

  try {
    const url = new URL(trimmed);
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function sanitizeDismissDuration(value) {
  if (!value || value === 'session') return value;
  return /^\d{1,5}$/.test(value) ? value : '';
}

function sanitizeScreenshotScale(value) {
  if (!value) return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 4 ? String(parsed) : '';
}

function sanitizeCategoryLabels(value) {
  if (!value) return '';

  try {
    JSON.parse(value);
    return value.length <= 1000 ? value : '';
  } catch {
    return '';
  }
}

function updateRequiredImplications() {
  if (form.requireName.checked) form.showName.checked = true;
  if (form.requireEmail.checked) form.showEmail.checked = true;
}

function updatePreview() {
  updateRequiredImplications();
  const rawConfig = normalizeConfig(readConfig());
  const config = sanitizeConfig(rawConfig);
  const params = new URLSearchParams();

  for (const [key, value] of getScriptAttributes(config)) {
    params.set(key, value);
  }

  scriptCode.textContent = generateScriptTag(config);
  preview.src = `./preview?${params.toString()}&v=${Date.now()}`;
  validateRepo(rawConfig.repo, false);
}

function validateRepo(repo, announceSuccess) {
  repoFeedback.className = 'repo-feedback';

  if (!repo) {
    repoFeedback.classList.add('error');
    repoFeedback.textContent = 'Enter a repository in owner/repo format.';
    return false;
  }

  if (!isValidRepo(repo)) {
    repoFeedback.classList.add('error');
    repoFeedback.textContent =
      'Repository must use GitHub owner/repo format with letters, numbers, dots, underscores, or hyphens.';
    return false;
  }

  repoFeedback.classList.add('ok');
  repoFeedback.textContent = announceSuccess
    ? 'Repository format looks valid.'
    : 'Ready to check installation.';

  return true;
}

async function checkInstallation() {
  const { repo } = readConfig();
  if (!validateRepo(repo, false)) return;

  const requestId = ++installationCheckId;
  repoFeedback.className = 'repo-feedback';
  repoFeedback.textContent = 'Checking GitHub App installation...';

  try {
    const response = await fetch(`/api/check/${getRepoPath(repo)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (requestId !== installationCheckId || readConfig().repo !== repo) return;

    repoFeedback.className = `repo-feedback ${result.installed ? 'ok' : 'warn'}`;
    repoFeedback.textContent = result.installed
      ? `BugDrop is installed on ${result.repo}.`
      : `BugDrop is not installed on ${result.repo}.`;
  } catch {
    if (requestId !== installationCheckId || readConfig().repo !== repo) return;
    repoFeedback.className = 'repo-feedback error';
    repoFeedback.textContent = 'Unable to reach the BugDrop API from this page.';
  }
}

async function copyScript() {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(scriptCode.textContent);
    copyButton.textContent = 'Copied';
  } catch {
    copyButton.textContent = 'Copy failed';
  }

  window.setTimeout(() => {
    copyButton.textContent = 'Copy';
  }, 1400);
}

form.addEventListener('input', updatePreview);
form.addEventListener('change', updatePreview);
checkButton.addEventListener('click', checkInstallation);
refreshButton.addEventListener('click', updatePreview);
copyButton.addEventListener('click', copyScript);

updatePreview();
