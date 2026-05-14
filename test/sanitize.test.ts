// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  sanitizeCssColor,
  sanitizeCssFontFamily,
  sanitizeNonNegativeNumber,
  sanitizeNonNegativePixelValue,
  sanitizePositiveInteger,
  sanitizeShadowPreset,
  sanitizeUrl,
} from '../src/widget/sanitize';

describe('widget sanitizers', () => {
  it('escapes text for HTML and attribute contexts', () => {
    expect(escapeHtml(`"><img src=x onerror=alert(1)>`)).toBe(
      '&quot;&gt;&lt;img src=x onerror=alert(1)&gt;'
    );
  });

  it('allows http image URLs and rejects executable or data URLs', () => {
    expect(sanitizeUrl('https://example.com/icon.svg')).toBe('https://example.com/icon.svg');
    expect(sanitizeUrl('http://example.com/icon.svg')).toBe('http://example.com/icon.svg');
    expect(sanitizeUrl('none')).toBe('none');
    expect(sanitizeUrl('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBeUndefined();
  });

  it('allows ordinary CSS colors and rejects CSS-breaking tokens', () => {
    expect(sanitizeCssColor('#2563eb')).toBe('#2563eb');
    expect(sanitizeCssColor('rgb(10, 20, 30)')).toBe('rgb(10, 20, 30)');
    expect(sanitizeCssColor('red')).toBe('red');
    expect(sanitizeCssColor('red; } .hostile { color: red }')).toBeUndefined();
    expect(sanitizeCssColor('url(https://example.com/x)')).toBeUndefined();
    expect(sanitizeCssColor('</style><script>alert(1)</script>')).toBeUndefined();
  });

  it('allows plain font family lists and rejects CSS injection tokens', () => {
    expect(sanitizeCssFontFamily('Inter, system-ui, sans-serif')).toBe(
      'Inter, system-ui, sans-serif'
    );
    expect(sanitizeCssFontFamily('"Space Grotesk", system-ui')).toBe('"Space Grotesk", system-ui');
    expect(sanitizeCssFontFamily('inherit')).toBe('inherit');
    expect(sanitizeCssFontFamily('Inter; color: red')).toBeUndefined();
    expect(sanitizeCssFontFamily('url(https://example.com/font.woff2)')).toBeUndefined();
  });

  it('normalizes numeric and enum config values', () => {
    expect(sanitizeNonNegativeNumber('0')).toBe(0);
    expect(sanitizeNonNegativeNumber('8.5')).toBe(8.5);
    expect(sanitizeNonNegativeNumber('-1')).toBeUndefined();
    expect(sanitizeNonNegativeNumber('8px')).toBeUndefined();

    expect(sanitizeNonNegativePixelValue('0')).toBe(0);
    expect(sanitizeNonNegativePixelValue('8.5')).toBe(8.5);
    expect(sanitizeNonNegativePixelValue('8px')).toBe(8);
    expect(sanitizeNonNegativePixelValue('8.5px')).toBe(8.5);
    expect(sanitizeNonNegativePixelValue('-1px')).toBeUndefined();
    expect(sanitizeNonNegativePixelValue('8em')).toBeUndefined();

    expect(sanitizePositiveInteger('30')).toBe(30);
    expect(sanitizePositiveInteger('0')).toBeUndefined();
    expect(sanitizePositiveInteger('1.5')).toBeUndefined();

    expect(sanitizeShadowPreset('soft')).toBe('soft');
    expect(sanitizeShadowPreset('hard')).toBe('hard');
    expect(sanitizeShadowPreset('0 0 4px red')).toBeUndefined();
  });
});
