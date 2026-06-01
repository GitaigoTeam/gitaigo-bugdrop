// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { injectStyles } from '../src/widget/ui';

describe('widget UI styles', () => {
  it('defines the default border style where the border color is available', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });

    injectStyles(shadow, {
      position: 'bottom-right',
      theme: 'light',
    });

    const styleText = shadow.querySelector('style')?.textContent ?? '';
    const hostBlock = styleText.match(/:host\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    const rootBlock = styleText.match(/\.bd-root\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';

    expect(hostBlock).toContain('--bd-border-width: 1px;');
    expect(hostBlock).not.toContain('--bd-border-style:');
    expect(rootBlock).toContain('--bd-border: #e7e5e4;');
    expect(rootBlock).toContain(
      '--bd-border-style: var(--bd-border-width) solid var(--bd-border);'
    );
  });
});
