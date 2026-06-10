// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createModal, injectStyles } from '../src/widget/ui';

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

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

  it('opens modals when matchMedia is unavailable', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    delete (window as Partial<Window>).matchMedia;

    expect(() => createModal(root, 'Feedback', '<p>Body</p>')).not.toThrow();
    expect(root.querySelector('.bd-modal')).not.toBeNull();
  });

  it('cleans up modal resize listeners when the modal is removed', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof matchMedia;
    const addListener = vi.spyOn(window, 'addEventListener');
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const root = document.createElement('div');
    document.body.appendChild(root);

    const modal = createModal(root, 'Feedback', '<p>Body</p>');
    modal.remove();
    await new Promise(resolve => window.setTimeout(resolve, 0));

    expect(addListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
