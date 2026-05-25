import { describe, expect, it } from 'vitest';
import { createBugDropAuthTokenForTest, verifyBugDropAuthToken } from '../src/lib/authToken';

const secret = 'test-secret-with-at-least-32-bytes-for-hmac';
const now = 1_779_710_400;

const payload = {
  iss: 'app.example.com',
  aud: 'bugdrop.example.workers.dev',
  sub: 'user-123',
  repo: 'owner/repo',
  origin: 'https://app.example.com',
  iat: now,
  nbf: now - 10,
  exp: now + 300,
  jti: 'jti-123',
};

describe('BugDrop auth token verification', () => {
  it('accepts a valid token scoped to the requested repo', async () => {
    const token = await createBugDropAuthTokenForTest(payload, secret);

    await expect(
      verifyBugDropAuthToken(token, {
        secret,
        repo: 'owner/repo',
        audience: 'bugdrop.example.workers.dev',
        issuer: 'app.example.com',
        now,
      })
    ).resolves.toMatchObject({ sub: 'user-123', repo: 'owner/repo' });
  });

  it('rejects a token scoped to another repo', async () => {
    const token = await createBugDropAuthTokenForTest(payload, secret);

    await expect(
      verifyBugDropAuthToken(token, {
        secret,
        repo: 'owner/other',
        audience: 'bugdrop.example.workers.dev',
        issuer: 'app.example.com',
        now,
      })
    ).rejects.toThrow('Token repo does not match request repo');
  });

  it('rejects expired tokens', async () => {
    const token = await createBugDropAuthTokenForTest({ ...payload, exp: now - 60 }, secret);

    await expect(
      verifyBugDropAuthToken(token, {
        secret,
        repo: 'owner/repo',
        audience: 'bugdrop.example.workers.dev',
        issuer: 'app.example.com',
        now,
      })
    ).rejects.toThrow('Token expired');
  });

  it('rejects tampered signatures', async () => {
    const token = await createBugDropAuthTokenForTest(payload, secret);
    const parts = token.split('.');
    const tampered = `${parts[0]}.${parts[1]}.bad${parts[2]}`;

    await expect(
      verifyBugDropAuthToken(tampered, {
        secret,
        repo: 'owner/repo',
        audience: 'bugdrop.example.workers.dev',
        issuer: 'app.example.com',
        now,
      })
    ).rejects.toThrow('Invalid token signature');
  });
});
