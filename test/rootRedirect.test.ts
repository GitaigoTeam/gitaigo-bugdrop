import { describe, expect, it, vi } from 'vitest';
import {
  hasWeakAdditionalAuthTokenSecret,
  isWeakAuthTokenSecret,
  resolveRootRedirectUrl,
} from '../src/index';

describe('resolveRootRedirectUrl', () => {
  it('uses the hosted site by default', () => {
    expect(resolveRootRedirectUrl()).toBe('https://bugdrop.dev');
  });

  it('uses a configured HTTP or HTTPS URL', () => {
    expect(resolveRootRedirectUrl('https://example.com')).toBe('https://example.com');
    expect(resolveRootRedirectUrl('http://localhost:8787')).toBe('http://localhost:8787');
  });

  it('falls back when the configured value is invalid', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(resolveRootRedirectUrl('javascript:alert(1)')).toBe('https://bugdrop.dev');
    expect(resolveRootRedirectUrl('not a url')).toBe('https://bugdrop.dev');
    expect(warnSpy).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
  });
});

describe('isWeakAuthTokenSecret', () => {
  it('does not warn when auth token enforcement is unset', () => {
    expect(isWeakAuthTokenSecret()).toBe(false);
    expect(isWeakAuthTokenSecret('')).toBe(false);
  });

  it('flags configured secrets shorter than 32 characters', () => {
    expect(isWeakAuthTokenSecret('too-short')).toBe(true);
    expect(isWeakAuthTokenSecret('x'.repeat(31))).toBe(true);
  });

  it('accepts secrets with at least 32 characters', () => {
    expect(isWeakAuthTokenSecret('x'.repeat(32))).toBe(false);
  });

  it('flags weak additional secrets in comma or newline separated values', () => {
    const strongSecret = 'x'.repeat(32);
    const anotherStrongSecret = 'y'.repeat(32);

    expect(hasWeakAdditionalAuthTokenSecret(`${strongSecret}\nshort`)).toBe(true);
    expect(hasWeakAdditionalAuthTokenSecret(`${strongSecret}, ${anotherStrongSecret}`)).toBe(false);
  });
});
