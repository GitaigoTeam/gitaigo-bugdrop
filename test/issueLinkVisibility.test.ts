// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { shouldRenderIssueLink } from '../src/widget/ui';

describe('shouldRenderIssueLink', () => {
  it.each([
    [
      'private repo with default visibility',
      'https://github.com/acme/private/issues/1',
      false,
      'public',
      false,
    ],
    [
      'public repo with default visibility',
      'https://github.com/acme/public/issues/1',
      true,
      'public',
      true,
    ],
    [
      'private repo with always visibility',
      'https://github.com/acme/private/issues/1',
      false,
      'always',
      true,
    ],
    [
      'public repo with never visibility',
      'https://github.com/acme/public/issues/1',
      true,
      'never',
      false,
    ],
    [
      'private repo with never visibility',
      'https://github.com/acme/private/issues/1',
      false,
      'never',
      false,
    ],
    ['always visibility without an issue URL', undefined, false, 'always', false],
    ['always visibility with sentinel hash URL', '#', false, 'always', false],
    ['always visibility with sentinel none URL', 'none', false, 'always', false],
    ['always visibility with unsafe URL', 'javascript:alert(1)', false, 'always', false],
  ] as const)('%s', (_label, issueUrl, isPublic, issueLinkVisibility, expected) => {
    expect(shouldRenderIssueLink(issueUrl, isPublic, issueLinkVisibility)).toBe(expected);
  });
});
