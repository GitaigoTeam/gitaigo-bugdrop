// Pure sanitization/validation helpers for the sandbox config UI.
// All inputs are user-typed; outputs are safe to embed in script tag attributes
// and URL parameters. Invalid inputs coerce to '' (the generator omits them).

const GITHUB_REPO_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/[A-Za-z0-9._-]{1,100}$/;
const SAFE_TEXT_PATTERN = /^[\w .,:;!?@#%&()[\]/'"_+=-]{0,120}$/;
const CSS_TOKEN_REJECT = /[<>"`{}\r\n\t]/;

export function escapeAttribute(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

export function isValidRepo(repo) {
  return GITHUB_REPO_PATTERN.test(repo) && !repo.endsWith('.git');
}

export function getRepoPath(repo) {
  const [owner, name] = repo.split('/');
  return `${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

export function sanitizePlainText(value, maxLength) {
  const trimmed = value.trim().slice(0, maxLength);
  return SAFE_TEXT_PATTERN.test(trimmed) ? trimmed : '';
}

export function sanitizeCssToken(value, maxLength) {
  const trimmed = value.trim().slice(0, maxLength);
  return !CSS_TOKEN_REJECT.test(trimmed) ? trimmed : '';
}

export function sanitizeIcon(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'none') return trimmed;
  try {
    const url = new URL(trimmed);
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    // Reject embedded credentials (e.g. https://user:pass@host) — they would
    // leak into the generated script's data-icon attribute.
    if (url.username || url.password) return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function sanitizeDismissDuration(value) {
  if (!value || value === 'session') return value;
  return /^\d{1,5}$/.test(value) ? value : '';
}

export function sanitizeScreenshotScale(value) {
  if (!value) return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 4 ? String(parsed) : '';
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function sanitizeCategoryLabels(value) {
  if (!value) return '';
  if (value.length > 1000) return '';
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    return '';
  }
  // Widget expects a non-null, non-array object. Other JSON shapes are rejected.
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return '';
  }
  // Reject prototype-pollution-style keys; downstream consumers may still
  // process this JSON, so don't let those keys survive validation.
  if (Object.keys(parsed).some(key => FORBIDDEN_KEYS.has(key))) return '';
  return value;
}

export function normalizeConfig(config) {
  return {
    ...config,
    showName: config.requireName || config.showName,
    showEmail: config.requireEmail || config.showEmail,
  };
}

const THEMES = ['auto', 'light', 'dark'];
const POSITIONS = ['bottom-right', 'bottom-left'];
const SCREENSHOTS = ['optional', 'required', 'auto'];
const WELCOMES = ['once', 'always', 'never'];

export function sanitizeConfig(config) {
  const normalized = normalizeConfig(config);
  return {
    ...normalized,
    repo: isValidRepo(normalized.repo) ? normalized.repo : '',
    theme: THEMES.includes(normalized.theme) ? normalized.theme : 'auto',
    position: POSITIONS.includes(normalized.position) ? normalized.position : 'bottom-right',
    screenshot: SCREENSHOTS.includes(normalized.screenshot) ? normalized.screenshot : 'optional',
    welcome: WELCOMES.includes(normalized.welcome) ? normalized.welcome : 'once',
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
