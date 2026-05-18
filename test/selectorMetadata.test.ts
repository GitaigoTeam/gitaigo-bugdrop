// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { getElementSelector, getFullElementSelector } from '../src/widget/selector-metadata';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('selector metadata', () => {
  it('escapes short and full selectors without CSS.escape', () => {
    const originalCss = globalThis.CSS;
    Object.defineProperty(globalThis, 'CSS', {
      configurable: true,
      value: undefined,
    });

    try {
      document.body.innerHTML = `
        <main>
          <button id="123 save" class="0primary action">Save</button>
        </main>
      `;
      const element = document.querySelector('button')!;

      expect(document.querySelector(getElementSelector(element))).toBe(element);
      expect(document.querySelector(getFullElementSelector(element))).toBe(element);
    } finally {
      Object.defineProperty(globalThis, 'CSS', {
        configurable: true,
        value: originalCss,
      });
    }
  });

  it.each(['-', '-1target', 'line\nbreak', 'delete\u007fchar'])(
    'escapes fallback identifier edge case %s',
    value => {
      const originalCss = globalThis.CSS;
      Object.defineProperty(globalThis, 'CSS', {
        configurable: true,
        value: undefined,
      });

      try {
        const element = document.createElement('button');
        element.setAttribute('id', value);
        document.body.appendChild(element);

        expect(document.querySelector(getElementSelector(element))).toBe(element);
        expect(document.querySelector(getFullElementSelector(element))).toBe(element);
      } finally {
        Object.defineProperty(globalThis, 'CSS', {
          configurable: true,
          value: originalCss,
        });
      }
    }
  );

  it('uses structural segments instead of truncating long identifiers', () => {
    const longId = `target-${'x'.repeat(180)}`;
    document.body.innerHTML = `
      <main>
        <section>
          <button id="${longId}">Save</button>
        </section>
      </main>
    `;
    const element = document.querySelector('button')!;

    expect(document.querySelector(getElementSelector(element))).toBe(element);
    expect(getFullElementSelector(element)).toBe('html > body > main > section > button');
  });

  it('returns queryable selectors for document edge elements', () => {
    expect(getElementSelector(document.body)).toBe('body');
    expect(document.querySelector(getElementSelector(document.body))).toBe(document.body);
    expect(document.querySelector(getFullElementSelector(document.body))).toBe(document.body);
    expect(document.querySelector(getElementSelector(document.documentElement))).toBe(
      document.documentElement
    );
    expect(document.querySelector(getFullElementSelector(document.documentElement))).toBe(
      document.documentElement
    );
  });

  it('bounds deep full selectors while keeping the target queryable', () => {
    let html = '<main>';
    for (let i = 0; i < 180; i += 1) {
      html += `<div class="segment-${i} utility-class-${i} generated-token-${i}">`;
    }
    html += '<button id="deep-target">Save</button>';
    html += '</div>'.repeat(180);
    html += '</main>';
    document.body.innerHTML = html;
    const element = document.querySelector('#deep-target')!;

    const selector = getFullElementSelector(element);

    expect(selector.length).toBeLessThanOrEqual(1024);
    expect(selector).toContain('button#deep-target');
    expect(document.querySelector(selector)).toBe(element);
  });

  it('keeps bounded selectors unambiguous across repeated deep branches', () => {
    const buildBranch = (index: number) => {
      let html = `<section class="branch branch-${index}">`;
      for (let i = 0; i < 90; i += 1) {
        html += `<div class="level-${i} utility-${i} token-${i}">`;
      }
      html += `<button class="target">Save ${index}</button>`;
      html += '</div>'.repeat(90);
      html += '</section>';
      return html;
    };
    document.body.innerHTML = `<main>${buildBranch(0)}${buildBranch(1)}</main>`;
    const element = document.querySelectorAll('button.target')[1]!;

    const selector = getFullElementSelector(element);

    expect(selector.length).toBeLessThanOrEqual(1024);
    expect(document.querySelector(selector)).toBe(element);
  });

  it('handles SVG classes, class truncation, and first same-tag siblings', () => {
    document.body.innerHTML = `
      <main>
        <svg>
          <g class="first second third fourth"></g>
          <g class="target icon state"></g>
        </svg>
      </main>
    `;
    const element = document.querySelector('g')!;
    const selector = getFullElementSelector(element);

    expect(selector).toContain('g.first.second.third:nth-of-type(1)');
    expect(selector).not.toContain('fourth');
    expect(document.querySelector(selector)).toBe(element);
  });

  it('preserves case-sensitive SVG tag selectors', () => {
    document.body.innerHTML = `
      <main>
        <svg>
          <defs>
            <linearGradient class="brand-gradient">
              <stop></stop>
            </linearGradient>
          </defs>
        </svg>
      </main>
    `;
    const element = document.querySelector('linearGradient')!;

    const selector = getFullElementSelector(element);

    expect(selector).toContain('linearGradient.brand-gradient');
    expect(document.querySelector(selector)).toBe(element);
  });

  it('escapes colon-containing tag names in full selectors', () => {
    const wrapper = document.createElement('main');
    const first = document.createElement('foo:bar');
    const second = document.createElement('foo:bar');
    second.className = 'target';
    wrapper.append(first, second);
    document.body.appendChild(wrapper);

    const selector = getFullElementSelector(second);

    expect(selector).toContain('foo\\:bar.target:nth-of-type(2)');
    expect(document.querySelector(selector)).toBe(second);
  });
});
