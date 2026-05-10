// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { collectMaskRects, applyMaskToImage } from '../src/widget/mask';

describe('mask module exports', () => {
  it('exports collectMaskRects', () => {
    expect(typeof collectMaskRects).toBe('function');
  });

  it('exports applyMaskToImage', () => {
    expect(typeof applyMaskToImage).toBe('function');
  });
});

function withRect(el: HTMLElement, x: number, y: number, w: number, h: number): HTMLElement {
  el.getBoundingClientRect = () =>
    ({
      x,
      y,
      width: w,
      height: h,
      top: y,
      left: x,
      bottom: y + h,
      right: x + w,
      toJSON() {
        return {};
      },
    }) as DOMRect;
  return el;
}

describe('collectMaskRects — explicit attribute', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    Object.defineProperty(window, 'scrollX', { value: 0, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('returns empty array for clean DOM', () => {
    expect(collectMaskRects(document.body)).toEqual([]);
  });

  it('returns rect for a single masked div', () => {
    const div = withRect(document.createElement('div'), 10, 20, 100, 50);
    div.setAttribute('data-bugdrop-mask', '');
    document.body.appendChild(div);

    expect(collectMaskRects(document.body)).toEqual([{ x: 10, y: 20, w: 100, h: 50 }]);
  });

  it('returns rects for multiple sibling masked elements', () => {
    const a = withRect(document.createElement('div'), 0, 0, 50, 50);
    a.setAttribute('data-bugdrop-mask', '');
    const b = withRect(document.createElement('div'), 100, 0, 50, 50);
    b.setAttribute('data-bugdrop-mask', '');
    document.body.append(a, b);

    expect(collectMaskRects(document.body)).toEqual([
      { x: 0, y: 0, w: 50, h: 50 },
      { x: 100, y: 0, w: 50, h: 50 },
    ]);
  });
});

describe('collectMaskRects — built-in defaults', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('masks input[type="password"] without explicit attribute', () => {
    const input = withRect(document.createElement('input'), 0, 0, 200, 30);
    input.type = 'password';
    document.body.appendChild(input);

    expect(collectMaskRects(document.body)).toEqual([{ x: 0, y: 0, w: 200, h: 30 }]);
  });

  it('masks credit-card autocomplete inputs', () => {
    const ccNumber = withRect(document.createElement('input'), 0, 0, 200, 30);
    ccNumber.setAttribute('autocomplete', 'cc-number');
    const ccCsc = withRect(document.createElement('input'), 0, 40, 80, 30);
    ccCsc.setAttribute('autocomplete', 'cc-csc');
    const ccExp = withRect(document.createElement('input'), 0, 80, 80, 30);
    ccExp.setAttribute('autocomplete', 'cc-exp');
    document.body.append(ccNumber, ccCsc, ccExp);

    const rects = collectMaskRects(document.body);
    expect(rects).toHaveLength(3);
    expect(rects).toContainEqual({ x: 0, y: 0, w: 200, h: 30 });
    expect(rects).toContainEqual({ x: 0, y: 40, w: 80, h: 30 });
    expect(rects).toContainEqual({ x: 0, y: 80, w: 80, h: 30 });
  });

  it('does not double-count an element matching multiple criteria', () => {
    const input = withRect(document.createElement('input'), 0, 0, 200, 30);
    input.type = 'password';
    input.setAttribute('data-bugdrop-mask', '');
    document.body.appendChild(input);

    expect(collectMaskRects(document.body)).toEqual([{ x: 0, y: 0, w: 200, h: 30 }]);
  });
});
