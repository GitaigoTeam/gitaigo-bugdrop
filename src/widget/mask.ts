export interface MaskRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const EXPLICIT_SELECTOR = '[data-bugdrop-mask]';
const DEFAULT_SELECTOR =
  'input[type="password"], input[autocomplete*="cc-number"], input[autocomplete*="cc-csc"], input[autocomplete*="cc-exp"]';

function shouldMask(el: Element): boolean {
  return el.matches(EXPLICIT_SELECTOR) || el.matches(DEFAULT_SELECTOR);
}

function pushRect(el: Element, rects: MaskRect[]): void {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;
  rects.push({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
}

export function collectMaskRects(root: Element): MaskRect[] {
  const rects: MaskRect[] = [];

  if (shouldMask(root)) {
    pushRect(root, rects);
    return rects;
  }

  walk(root, rects);
  return rects;
}

function walk(node: Element, rects: MaskRect[]): void {
  for (const child of Array.from(node.children)) {
    if (shouldMask(child)) {
      pushRect(child, rects);
      // Top-most-ancestor rule: do not descend into masked subtrees.
      continue;
    }
    walk(child, rects);
  }
}

export async function applyMaskToImage(
  dataUrl: string,
  _rects: MaskRect[],
  _pixelRatio: number,
  _originOffset?: { x: number; y: number }
): Promise<string> {
  return dataUrl;
}
