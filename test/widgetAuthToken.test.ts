import { describe, expect, it, vi } from 'vitest';
import { getAuthHeaders, resolveAuthTokenProvider } from '../src/widget/auth-token';

describe('widget auth token helpers', () => {
  it('resolves a named global provider function', async () => {
    const tokenProvider = vi.fn(() => 'test-token');
    const provider = resolveAuthTokenProvider('getBugDropToken', {
      getBugDropToken: tokenProvider,
    } as unknown as Window & Record<string, unknown>);

    expect(await provider?.()).toBe('test-token');
  });

  it('returns undefined and warns when the named global is not a function', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(
      resolveAuthTokenProvider('getBugDropToken', {
        getBugDropToken: 'not-a-function',
      } as unknown as Window & Record<string, unknown>)
    ).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      '[BugDrop] data-auth-token-provider "getBugDropToken" must reference a function.'
    );

    warn.mockRestore();
  });

  it('omits auth headers when no provider exists', async () => {
    await expect(getAuthHeaders(undefined)).resolves.toEqual({});
  });

  it('adds a bearer prefix to raw tokens', async () => {
    await expect(getAuthHeaders(() => 'raw-token')).resolves.toEqual({
      Authorization: 'Bearer raw-token',
    });
  });

  it('preserves an existing bearer prefix', async () => {
    await expect(getAuthHeaders(() => 'Bearer existing-token')).resolves.toEqual({
      Authorization: 'Bearer existing-token',
    });
  });
});
