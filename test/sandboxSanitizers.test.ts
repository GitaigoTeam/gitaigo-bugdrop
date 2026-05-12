import { describe, it, expect } from 'vitest';
import {
  escapeAttribute,
  isValidRepo,
  getRepoPath,
  sanitizePlainText,
  sanitizeCssToken,
  sanitizeIcon,
  sanitizeDismissDuration,
  sanitizeScreenshotScale,
  sanitizeCategoryLabels,
  normalizeConfig,
  sanitizeConfig,
  // @ts-expect-error — plain JS module, no type declarations
} from '../public/sandbox/sanitizers.js';

describe('escapeAttribute', () => {
  it('escapes & before " so order is correct', () => {
    expect(escapeAttribute('&"')).toBe('&amp;&quot;');
  });

  it('replaces all occurrences, not just the first', () => {
    expect(escapeAttribute('a&b&c"d"e')).toBe('a&amp;b&amp;c&quot;d&quot;e');
  });

  it('coerces non-strings via String()', () => {
    expect(escapeAttribute(42)).toBe('42');
    expect(escapeAttribute(true)).toBe('true');
  });
});

describe('isValidRepo', () => {
  it('accepts valid owner/repo names', () => {
    expect(isValidRepo('mean-weasel/bugdrop')).toBe(true);
    expect(isValidRepo('acme/app.io')).toBe(true);
    expect(isValidRepo('Acme/my_repo')).toBe(true);
    expect(isValidRepo('a/b')).toBe(true);
  });

  it('rejects names ending with .git', () => {
    expect(isValidRepo('acme/app.git')).toBe(false);
  });

  it('rejects formats without exactly one slash', () => {
    expect(isValidRepo('justone')).toBe(false);
    expect(isValidRepo('one/two/three')).toBe(false);
    expect(isValidRepo('')).toBe(false);
  });

  it('rejects unsafe characters', () => {
    expect(isValidRepo('acme/app?x=1')).toBe(false);
    expect(isValidRepo('acme/app#frag')).toBe(false);
    expect(isValidRepo('acme/<script>')).toBe(false);
    expect(isValidRepo('acme /app')).toBe(false);
  });

  it('accepts owner at exactly 39 chars and rejects 40', () => {
    const owner39 = 'a' + 'b'.repeat(37) + 'c';
    const owner40 = 'a' + 'b'.repeat(38) + 'c';
    expect(owner39.length).toBe(39);
    expect(owner40.length).toBe(40);
    expect(isValidRepo(`${owner39}/repo`)).toBe(true);
    expect(isValidRepo(`${owner40}/repo`)).toBe(false);
  });

  it('accepts repo name up to 100 chars and rejects 101', () => {
    const repo100 = 'r'.repeat(100);
    const repo101 = 'r'.repeat(101);
    expect(isValidRepo(`acme/${repo100}`)).toBe(true);
    expect(isValidRepo(`acme/${repo101}`)).toBe(false);
  });
});

describe('getRepoPath', () => {
  it('encodes both segments with encodeURIComponent', () => {
    expect(getRepoPath('acme/app')).toBe('acme/app');
  });

  it('encodes characters that need URL escaping', () => {
    // Owner/name pulled apart and re-encoded; would only hit this path post-validation
    expect(getRepoPath('a c/d e')).toBe('a%20c/d%20e');
  });
});

describe('sanitizePlainText', () => {
  it('returns trimmed value when it matches SAFE_TEXT_PATTERN', () => {
    expect(sanitizePlainText('  Send Feedback  ', 80)).toBe('Send Feedback');
  });

  it('returns empty string for newlines, <, >, or non-ASCII', () => {
    expect(sanitizePlainText('line1\nline2', 80)).toBe('');
    expect(sanitizePlainText('<script>', 80)).toBe('');
    expect(sanitizePlainText('hello>world', 80)).toBe('');
    expect(sanitizePlainText('Send 💬', 80)).toBe('');
  });

  it('preserves all characters in SAFE_TEXT_PATTERN', () => {
    expect(sanitizePlainText('Word . , : ; ! ? @ # % & ( ) [ ] / \' " _ + = -', 80)).toBe(
      'Word . , : ; ! ? @ # % & ( ) [ ] / \' " _ + = -'
    );
  });

  it('truncates to maxLength before validation', () => {
    expect(sanitizePlainText('abcdef', 3)).toBe('abc');
  });
});

describe('sanitizeCssToken', () => {
  it('rejects values containing <, >, ", backtick, {, or }', () => {
    expect(sanitizeCssToken('red<', 80)).toBe('');
    expect(sanitizeCssToken('red>', 80)).toBe('');
    expect(sanitizeCssToken('red"', 80)).toBe('');
    expect(sanitizeCssToken('red`', 80)).toBe('');
    expect(sanitizeCssToken('red{', 80)).toBe('');
    expect(sanitizeCssToken('red}', 80)).toBe('');
  });

  it('rejects embedded whitespace control chars that would break <pre> display', () => {
    expect(sanitizeCssToken('red\nbackground:url(evil)', 80)).toBe('');
    expect(sanitizeCssToken('red\rbg', 80)).toBe('');
    expect(sanitizeCssToken('a\tb', 80)).toBe('');
  });

  it('still trims surrounding whitespace before validating', () => {
    expect(sanitizeCssToken('  red  ', 80)).toBe('red');
    expect(sanitizeCssToken('red\n', 80)).toBe('red');
  });

  it('preserves valid CSS tokens', () => {
    expect(sanitizeCssToken('#7c3aed', 80)).toBe('#7c3aed');
    expect(sanitizeCssToken('0 8px 30px rgba(0,0,0,0.12)', 120)).toBe(
      '0 8px 30px rgba(0,0,0,0.12)'
    );
    expect(sanitizeCssToken('inherit', 120)).toBe('inherit');
  });

  it('truncates to maxLength before validation', () => {
    expect(sanitizeCssToken('a'.repeat(200), 5)).toBe('aaaaa');
  });
});

describe('sanitizeIcon', () => {
  it('rejects javascript:, data:, and file: URLs', () => {
    expect(sanitizeIcon('javascript:alert(1)')).toBe('');
    expect(sanitizeIcon('data:image/png;base64,xxx')).toBe('');
    expect(sanitizeIcon('file:///etc/passwd')).toBe('');
  });

  it('accepts http and https URLs', () => {
    expect(sanitizeIcon('https://example.com/icon.svg')).toBe('https://example.com/icon.svg');
    expect(sanitizeIcon('http://example.com/icon.svg')).toBe('http://example.com/icon.svg');
  });

  it('returns "none" verbatim and "" for empty', () => {
    expect(sanitizeIcon('none')).toBe('none');
    expect(sanitizeIcon('')).toBe('');
    expect(sanitizeIcon('   ')).toBe('');
  });

  it('returns "" for malformed URLs', () => {
    expect(sanitizeIcon('not-a-url')).toBe('');
    expect(sanitizeIcon('htps://typo.com')).toBe('');
    expect(sanitizeIcon('//missing-scheme.com')).toBe('');
  });

  it('rejects URLs with embedded credentials', () => {
    expect(sanitizeIcon('https://user:pass@example.com/icon.svg')).toBe('');
    expect(sanitizeIcon('https://user@example.com/icon.svg')).toBe('');
    expect(sanitizeIcon('http://:pass@example.com/icon.svg')).toBe('');
  });
});

describe('sanitizeDismissDuration', () => {
  it('preserves "session" and empty', () => {
    expect(sanitizeDismissDuration('session')).toBe('session');
    expect(sanitizeDismissDuration('')).toBe('');
  });

  it('preserves 1-5 digit numeric strings', () => {
    expect(sanitizeDismissDuration('1')).toBe('1');
    expect(sanitizeDismissDuration('99999')).toBe('99999');
  });

  it('rejects negative, decimal, exponential, or non-digit input', () => {
    expect(sanitizeDismissDuration('-5')).toBe('');
    expect(sanitizeDismissDuration('12.5')).toBe('');
    expect(sanitizeDismissDuration('1e9')).toBe('');
    expect(sanitizeDismissDuration('abc')).toBe('');
  });

  it('rejects 6+ digit numeric strings', () => {
    expect(sanitizeDismissDuration('100000')).toBe('');
  });
});

describe('sanitizeScreenshotScale', () => {
  it('clamps to [1,4] inclusive and rejects out-of-range', () => {
    expect(sanitizeScreenshotScale('1')).toBe('1');
    expect(sanitizeScreenshotScale('4')).toBe('4');
    expect(sanitizeScreenshotScale('0.99')).toBe('');
    expect(sanitizeScreenshotScale('4.01')).toBe('');
    expect(sanitizeScreenshotScale('100')).toBe('');
  });

  it('rejects NaN, Infinity, and empty input', () => {
    expect(sanitizeScreenshotScale('NaN')).toBe('');
    expect(sanitizeScreenshotScale('Infinity')).toBe('');
    expect(sanitizeScreenshotScale('')).toBe('');
    expect(sanitizeScreenshotScale('abc')).toBe('');
  });

  it('preserves valid decimal values', () => {
    expect(sanitizeScreenshotScale('2.5')).toBe('2.5');
  });
});

describe('sanitizeCategoryLabels', () => {
  it('returns empty for whitespace-only or empty input', () => {
    expect(sanitizeCategoryLabels('')).toBe('');
  });

  it('returns empty for malformed JSON', () => {
    expect(sanitizeCategoryLabels('{not json')).toBe('');
    expect(sanitizeCategoryLabels("{'single': 'quotes'}")).toBe('');
    expect(sanitizeCategoryLabels('{"trailing":,}')).toBe('');
  });

  it('returns empty for non-object JSON (string, number, null, array)', () => {
    expect(sanitizeCategoryLabels('null')).toBe('');
    expect(sanitizeCategoryLabels('"a string"')).toBe('');
    expect(sanitizeCategoryLabels('42')).toBe('');
    expect(sanitizeCategoryLabels('[]')).toBe('');
    expect(sanitizeCategoryLabels('[1,2]')).toBe('');
  });

  it('passes through valid object JSON', () => {
    const value = '{"bug":["defect"],"feature":"idea"}';
    expect(sanitizeCategoryLabels(value)).toBe(value);
  });

  it('returns empty when value exceeds 1000 characters', () => {
    const oversize = '{"a":"' + 'x'.repeat(995) + '"}';
    expect(oversize.length).toBeGreaterThan(1000);
    expect(sanitizeCategoryLabels(oversize)).toBe('');
  });

  it('rejects prototype-pollution-style keys', () => {
    expect(sanitizeCategoryLabels('{"__proto__":{"polluted":true}}')).toBe('');
    expect(sanitizeCategoryLabels('{"constructor":{"prototype":{}}}')).toBe('');
    expect(sanitizeCategoryLabels('{"prototype":"x"}')).toBe('');
  });
});

describe('normalizeConfig', () => {
  it('forces showName=true when requireName=true', () => {
    const result = normalizeConfig({ requireName: true, showName: false });
    expect(result.showName).toBe(true);
  });

  it('forces showEmail=true when requireEmail=true', () => {
    const result = normalizeConfig({ requireEmail: true, showEmail: false });
    expect(result.showEmail).toBe(true);
  });

  it('preserves showName when require is false', () => {
    const result = normalizeConfig({ requireName: false, showName: true });
    expect(result.showName).toBe(true);
  });
});

describe('sanitizeConfig', () => {
  const base = {
    repo: 'mean-weasel/bugdrop',
    theme: 'auto',
    position: 'bottom-right',
    color: '',
    label: '',
    icon: '',
    screenshot: 'optional',
    welcome: 'once',
    showName: false,
    requireName: false,
    showEmail: false,
    requireEmail: false,
    buttonDismissible: false,
    dismissDuration: '',
    showRestore: true,
    showButton: true,
    screenshotScale: '',
    font: '',
    radius: '',
    bg: '',
    text: '',
    borderWidth: '',
    borderColor: '',
    shadow: '',
    categoryLabels: '',
  };

  it('falls back to default theme when invalid', () => {
    expect(sanitizeConfig({ ...base, theme: 'rainbow' }).theme).toBe('auto');
  });

  it('falls back to default position when invalid', () => {
    expect(sanitizeConfig({ ...base, position: 'top-left' }).position).toBe('bottom-right');
  });

  it('falls back to default screenshot mode when invalid', () => {
    expect(sanitizeConfig({ ...base, screenshot: 'maybe' }).screenshot).toBe('optional');
  });

  it('falls back to default welcome when invalid', () => {
    expect(sanitizeConfig({ ...base, welcome: 'sometimes' }).welcome).toBe('once');
  });

  it('clears repo when invalid', () => {
    expect(sanitizeConfig({ ...base, repo: 'not a repo' }).repo).toBe('');
  });

  it('applies require → show implication via normalizeConfig', () => {
    const result = sanitizeConfig({ ...base, requireEmail: true, showEmail: false });
    expect(result.showEmail).toBe(true);
  });
});
