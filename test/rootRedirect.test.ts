import { describe, expect, it, vi } from 'vitest';
import { resolveRootRedirectUrl } from '../src/index';

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
