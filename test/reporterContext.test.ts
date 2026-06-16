import { describe, it, expect } from 'vitest';
import { formatIssueBody } from '../src/routes/api';
import type { FeedbackPayload } from '../src/types';

function basePayload(overrides: Partial<FeedbackPayload> = {}): FeedbackPayload {
  return {
    repo: 'owner/repo',
    title: 'Test title',
    description: 'Test description',
    metadata: {
      url: 'https://example.com/app',
      userAgent: 'test-agent',
      viewport: { width: 1024, height: 768 },
      timestamp: '2026-06-16T00:00:00.000Z',
    },
    ...overrides,
  };
}

describe('formatIssueBody — Reporter context', () => {
  it('renders a Reporter context section with all provided meta fields', () => {
    const body = formatIssueBody(
      basePayload({
        meta: {
          user_id: 42,
          role: 'admin',
          level: 'pro',
          route: '/dashboard',
          app_version: '1.2.3',
          env: 'production',
        },
      })
    );

    expect(body).toContain('## Reporter context');
    expect(body).toContain('| **User ID** | 42 |');
    expect(body).toContain('| **Role** | admin |');
    expect(body).toContain('| **Level** | pro |');
    expect(body).toContain('| **Route** | /dashboard |');
    expect(body).toContain('| **App version** | 1.2.3 |');
    expect(body).toContain('| **Env** | production |');
  });

  it('omits the Reporter context section when meta is absent', () => {
    const body = formatIssueBody(basePayload());
    expect(body).not.toContain('## Reporter context');
  });

  it('omits the Reporter context section when meta has no renderable values', () => {
    const body = formatIssueBody(basePayload({ meta: { email: 'a@b.com', full_name: 'A B' } }));
    // email/full_name are identity fields shown in "Submitted by", not in this table
    expect(body).not.toContain('## Reporter context');
  });

  it('neutralizes markdown-breaking newline characters via normalizeMarkdownValue', () => {
    const body = formatIssueBody(
      basePayload({
        meta: { role: 'admin\nINJECTED ROW' },
      })
    );

    expect(body).toContain('## Reporter context');
    // The newline is collapsed to a single space, so the injected content cannot
    // start a new markdown table row.
    expect(body).toContain('| **Role** | admin INJECTED ROW |');
    expect(body).not.toContain('admin\nINJECTED ROW');
  });

  it('keeps a pipe-containing value on a single normalized row', () => {
    const body = formatIssueBody(
      basePayload({
        meta: { route: '/a|/b' },
      })
    );

    // normalizeMarkdownValue does not strip pipes, but the value stays on one row
    // (no control chars / newlines introduced) so the table structure is preserved.
    const rowLines = body.split('\n').filter(line => line.includes('**Route**'));
    expect(rowLines).toHaveLength(1);
    expect(rowLines[0]).toContain('/a|/b');
  });
});
