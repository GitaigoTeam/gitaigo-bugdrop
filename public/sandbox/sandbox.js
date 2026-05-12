import { ATTRIBUTE_MAP } from './attribute-map.js';
import {
  escapeAttribute,
  isValidRepo,
  getRepoPath,
  normalizeConfig,
  sanitizeConfig,
} from './sanitizers.js';

const form = document.querySelector('#sandbox-form');
const preview = document.querySelector('#sandbox-preview');
const scriptCode = document.querySelector('#script-code');
const repoFeedback = document.querySelector('#repo-feedback');
const sanitizeFeedback = document.querySelector('#sanitize-feedback');
const copyButton = document.querySelector('#copy-script');
const checkButton = document.querySelector('#check-installation');
const refreshButton = document.querySelector('#refresh-preview');

// Monotonic id; in-flight installation checks are discarded when this advances
// or when the repo input changes mid-flight.
let installationCheckId = 0;

const BOOLEAN_FIELDS = new Set([
  'showName',
  'requireName',
  'showEmail',
  'requireEmail',
  'buttonDismissible',
  'showRestore',
  'showButton',
]);

// User-facing labels for fields whose sanitizer can reject input (coerce non-empty
// input to ''). Used by describeRejectedFields to build the sanitize-feedback notice.
// Enum-fallback fields (theme/position/screenshot/welcome) are intentionally absent
// since they always return a non-empty default. Boolean fields are also absent.
// IMPORTANT: when adding a new sanitizer in sanitizers.js whose output can be '',
// add the matching key here so its rejection is surfaced to the user.
const FIELD_LABELS = {
  repo: 'GitHub repository',
  color: 'Accent color',
  label: 'Button label',
  icon: 'Icon',
  dismissDuration: 'Dismiss duration',
  screenshotScale: 'Screenshot scale',
  font: 'Font',
  radius: 'Radius',
  bg: 'Background color',
  text: 'Text color',
  borderWidth: 'Border width',
  borderColor: 'Border color',
  shadow: 'Shadow',
  categoryLabels: 'Category labels',
};

function readConfig() {
  const config = {};
  for (const key of Object.keys(ATTRIBUTE_MAP)) {
    const field = form[key];
    if (!field) {
      // ATTRIBUTE_MAP drift: a config key has no matching form input. Surface
      // this loudly so a regression is visible rather than silently sending '' .
      console.warn(`[BugDrop sandbox] no form field for config key "${key}"`);
      config[key] = '';
      continue;
    }
    if (BOOLEAN_FIELDS.has(key)) {
      config[key] = field.checked;
    } else {
      const value = field.value;
      config[key] = typeof value === 'string' ? value.trim() : value;
    }
  }
  return config;
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
    lines.push(`  ${ATTRIBUTE_MAP[key]}="${escapeAttribute(value)}"`);
  }

  lines[lines.length - 1] = `${lines[lines.length - 1]}></script>`;
  return lines.join('\n');
}

function updateRequiredImplications() {
  if (form.requireName.checked) form.showName.checked = true;
  if (form.requireEmail.checked) form.showEmail.checked = true;
}

function describeRejectedFields(raw, sanitized) {
  const rejected = [];
  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    const before = typeof raw[key] === 'string' ? raw[key] : '';
    if (before && !sanitized[key]) rejected.push(label);
  }
  return rejected;
}

function renderSanitizeFeedback(rejected) {
  if (!sanitizeFeedback) return;
  if (rejected.length === 0) {
    sanitizeFeedback.textContent = '';
    sanitizeFeedback.hidden = true;
    return;
  }
  sanitizeFeedback.textContent = `Ignored invalid values for: ${rejected.join(', ')}.`;
  sanitizeFeedback.hidden = false;
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
  renderSanitizeFeedback(describeRejectedFields(rawConfig, config));
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
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}${detail ? `: ${detail.slice(0, 80)}` : ''}`);
    }
    let result;
    try {
      result = await response.json();
    } catch (parseErr) {
      throw new Error(`HTTP ${response.status}: invalid JSON response`, { cause: parseErr });
    }
    if (requestId !== installationCheckId || readConfig().repo !== repo) return;

    repoFeedback.className = `repo-feedback ${result.installed ? 'ok' : 'warn'}`;
    repoFeedback.textContent = result.installed
      ? `BugDrop is installed on ${result.repo}.`
      : `BugDrop is not installed on ${result.repo}.`;
  } catch (err) {
    if (requestId !== installationCheckId || readConfig().repo !== repo) return;
    console.warn('[BugDrop sandbox] installation check failed:', err);
    const message = err instanceof Error ? err.message : '';
    repoFeedback.className = 'repo-feedback error';
    repoFeedback.textContent = message.startsWith('HTTP')
      ? `Installation check failed (${message}). Try again or open an issue.`
      : 'Unable to reach the BugDrop API from this page.';
  }
}

async function copyScript() {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(scriptCode.textContent);
    copyButton.textContent = 'Copied';
  } catch (err) {
    console.warn('[BugDrop sandbox] clipboard write failed:', err);
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
