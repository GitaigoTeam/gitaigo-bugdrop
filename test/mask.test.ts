// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { collectMaskRects, applyMaskToImage, translateMaskRect } from '../src/widget/mask';

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

describe('collectMaskRects — nesting and scoping', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('returns parent-only rect when a masked element is inside another masked element', () => {
    const parent = withRect(document.createElement('div'), 0, 0, 200, 100);
    parent.setAttribute('data-bugdrop-mask', '');
    const child = withRect(document.createElement('div'), 10, 10, 50, 30);
    child.setAttribute('data-bugdrop-mask', '');
    parent.appendChild(child);
    document.body.appendChild(parent);

    expect(collectMaskRects(document.body)).toEqual([{ x: 0, y: 0, w: 200, h: 100 }]);
  });

  it('does not separately mask password input nested inside masked ancestor', () => {
    const parent = withRect(document.createElement('div'), 0, 0, 200, 100);
    parent.setAttribute('data-bugdrop-mask', '');
    const password = withRect(document.createElement('input'), 10, 10, 100, 20);
    password.type = 'password';
    parent.appendChild(password);
    document.body.appendChild(parent);

    expect(collectMaskRects(document.body)).toEqual([{ x: 0, y: 0, w: 200, h: 100 }]);
  });

  it('returns rects for descendant masks of an unmasked parent', () => {
    const parent = withRect(document.createElement('div'), 0, 0, 200, 100);
    const a = withRect(document.createElement('span'), 10, 10, 50, 20);
    a.setAttribute('data-bugdrop-mask', '');
    const b = withRect(document.createElement('span'), 100, 10, 50, 20);
    b.setAttribute('data-bugdrop-mask', '');
    parent.append(a, b);
    document.body.appendChild(parent);

    expect(collectMaskRects(document.body)).toEqual([
      { x: 10, y: 10, w: 50, h: 20 },
      { x: 100, y: 10, w: 50, h: 20 },
    ]);
  });

  it('scoped collection ignores siblings outside the root', () => {
    const target = withRect(document.createElement('div'), 0, 0, 200, 100);
    const inside = withRect(document.createElement('span'), 10, 10, 50, 20);
    inside.setAttribute('data-bugdrop-mask', '');
    target.appendChild(inside);
    const outside = withRect(document.createElement('span'), 300, 0, 50, 20);
    outside.setAttribute('data-bugdrop-mask', '');
    document.body.append(target, outside);

    expect(collectMaskRects(target)).toEqual([{ x: 10, y: 10, w: 50, h: 20 }]);
  });

  it('root inclusion: returns a rect when root itself is masked', () => {
    const root = withRect(document.createElement('div'), 0, 0, 200, 100);
    root.setAttribute('data-bugdrop-mask', '');
    document.body.appendChild(root);

    expect(collectMaskRects(root)).toEqual([{ x: 0, y: 0, w: 200, h: 100 }]);
  });

  it('root inclusion: returns a rect when root is a built-in default (password input)', () => {
    const input = withRect(document.createElement('input'), 0, 0, 200, 30);
    input.type = 'password';
    document.body.appendChild(input);

    expect(collectMaskRects(input)).toEqual([{ x: 0, y: 0, w: 200, h: 30 }]);
  });
});

describe('collectMaskRects — coordinates and visibility', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    Object.defineProperty(window, 'scrollX', { value: 0, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('returns document coordinates by adding window.scrollX / scrollY', () => {
    Object.defineProperty(window, 'scrollX', { value: 50, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 200, configurable: true });

    const div = withRect(document.createElement('div'), 10, 20, 100, 50);
    div.setAttribute('data-bugdrop-mask', '');
    document.body.appendChild(div);

    expect(collectMaskRects(document.body)).toEqual([{ x: 60, y: 220, w: 100, h: 50 }]);
  });

  it('skips elements with zero getBoundingClientRect()', () => {
    const div = withRect(document.createElement('div'), 0, 0, 0, 0);
    div.setAttribute('data-bugdrop-mask', '');
    document.body.appendChild(div);

    expect(collectMaskRects(document.body)).toEqual([]);
  });

  it('includes visibility:hidden elements (defense in depth)', () => {
    const div = withRect(document.createElement('div'), 10, 20, 100, 50);
    div.setAttribute('data-bugdrop-mask', '');
    div.style.visibility = 'hidden';
    document.body.appendChild(div);

    expect(collectMaskRects(document.body)).toEqual([{ x: 10, y: 20, w: 100, h: 50 }]);
  });

  it('includes opacity:0 elements (defense in depth)', () => {
    const div = withRect(document.createElement('div'), 10, 20, 100, 50);
    div.setAttribute('data-bugdrop-mask', '');
    div.style.opacity = '0';
    document.body.appendChild(div);

    expect(collectMaskRects(document.body)).toEqual([{ x: 10, y: 20, w: 100, h: 50 }]);
  });
});

describe('translateMaskRect', () => {
  it('scales a rect by pixelRatio with no origin offset', () => {
    expect(
      translateMaskRect({ x: 10, y: 20, w: 100, h: 50 }, 2, { x: 0, y: 0 }, 1000, 1000)
    ).toEqual({ x: 20, y: 40, w: 200, h: 100 });
  });

  it('subtracts originOffset before scaling', () => {
    expect(
      translateMaskRect({ x: 110, y: 220, w: 100, h: 50 }, 2, { x: 100, y: 200 }, 1000, 1000)
    ).toEqual({ x: 20, y: 40, w: 200, h: 100 });
  });

  it('clips a rect that overflows the canvas on the right and bottom', () => {
    expect(translateMaskRect({ x: 90, y: 90, w: 30, h: 30 }, 1, { x: 0, y: 0 }, 100, 100)).toEqual({
      x: 90,
      y: 90,
      w: 10,
      h: 10,
    });
  });

  it('clips a rect that starts to the left and above the canvas', () => {
    expect(
      translateMaskRect({ x: -10, y: -20, w: 30, h: 50 }, 1, { x: 0, y: 0 }, 100, 100)
    ).toEqual({ x: 0, y: 0, w: 20, h: 30 });
  });

  it('returns a non-positive size when fully outside the canvas', () => {
    const out = translateMaskRect({ x: 1000, y: 1000, w: 50, h: 50 }, 1, { x: 0, y: 0 }, 100, 100);
    expect(out.w).toBeLessThanOrEqual(0);
    expect(out.h).toBeLessThanOrEqual(0);
  });
});
