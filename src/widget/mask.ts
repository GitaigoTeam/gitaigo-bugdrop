interface MaskRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type RedactionReason = 'developer-marked' | 'sensitive-input';
type RedactionStrategy = 'canvas-mask';

interface RedactionTarget {
  element: Element;
  rect: MaskRect;
  reason: RedactionReason;
  strategy: RedactionStrategy;
}

interface RedactionPlan {
  targets: RedactionTarget[];
}

export class MaskApplicationError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'MaskApplicationError';
  }
}

const EXPLICIT_SELECTOR =
  '[data-bugdrop-mask], [data-bugdrop-redact], [data-bd-redact], [data-bugdrop-redacted]';
const DEFAULT_SELECTOR =
  'input[type="password"], input[autocomplete*="cc-number"], input[autocomplete*="cc-csc"], input[autocomplete*="cc-exp"]';

function getRedactionReason(el: Element): RedactionReason | null {
  if (el.matches(EXPLICIT_SELECTOR)) return 'developer-marked';
  if (el.matches(DEFAULT_SELECTOR)) return 'sensitive-input';
  return null;
}

function createTarget(el: Element, reason: RedactionReason): RedactionTarget | null {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  return {
    element: el,
    rect: {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      w: rect.width,
      h: rect.height,
    },
    reason,
    strategy: 'canvas-mask',
  };
}

export function createRedactionPlan(root: Element): RedactionPlan {
  const targets: RedactionTarget[] = [];
  const rootReason = getRedactionReason(root);

  if (rootReason) {
    const rootTarget = createTarget(root, rootReason);
    return { targets: rootTarget ? [rootTarget] : [] };
  }

  walk(root, targets);
  walkOpenShadowRoot(root, targets);
  return { targets };
}

export function collectMaskRects(root: Element): MaskRect[] {
  return createRedactionPlan(root).targets.map(target => target.rect);
}

export function countMaskRects(root: Element = document.body, area?: DOMRect): number {
  const rects = createRedactionPlan(root).targets.map(target => target.rect);
  if (!area) return rects.length;
  return rects.filter(rect => intersects(rect, area)).length;
}

function intersects(rect: MaskRect, area: DOMRect): boolean {
  return (
    rect.x < area.x + area.width &&
    rect.x + rect.w > area.x &&
    rect.y < area.y + area.height &&
    rect.y + rect.h > area.y
  );
}

function walk(node: Element, targets: RedactionTarget[]): void {
  for (const child of Array.from(node.children)) {
    const reason = getRedactionReason(child);
    if (reason) {
      const target = createTarget(child, reason);
      if (target) targets.push(target);
      // Top-most-ancestor rule: do not descend into masked subtrees.
      continue;
    }
    walk(child, targets);
    walkOpenShadowRoot(child, targets);
  }
}

function walkOpenShadowRoot(node: Element, targets: RedactionTarget[]): void {
  const shadowRoot = node.shadowRoot;
  if (!shadowRoot) return;

  for (const child of Array.from(shadowRoot.children)) {
    const reason = getRedactionReason(child);
    if (reason) {
      const target = createTarget(child, reason);
      if (target) targets.push(target);
      continue;
    }
    walk(child, targets);
    walkOpenShadowRoot(child, targets);
  }
}

export function translateMaskRect(
  rect: MaskRect,
  pixelRatio: number,
  originOffset: { x: number; y: number },
  canvasWidth: number,
  canvasHeight: number
): MaskRect {
  const rawX = (rect.x - originOffset.x) * pixelRatio;
  const rawY = (rect.y - originOffset.y) * pixelRatio;
  const rawW = rect.w * pixelRatio;
  const rawH = rect.h * pixelRatio;

  const x = Math.max(0, Math.floor(rawX) - 1);
  const y = Math.max(0, Math.floor(rawY) - 1);
  const right = Math.min(canvasWidth, Math.ceil(rawX + rawW) + 1);
  const bottom = Math.min(canvasHeight, Math.ceil(rawY + rawH) + 1);

  return {
    x,
    y,
    w: right - x,
    h: bottom - y,
  };
}

export async function applyMaskToImage(
  dataUrl: string,
  rects: MaskRect[],
  pixelRatio: number,
  originOffset: { x: number; y: number } = { x: 0, y: 0 }
): Promise<string> {
  if (rects.length === 0) return dataUrl;

  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new MaskApplicationError('Failed to get canvas context for privacy masking');

  ctx.drawImage(img, 0, 0);
  ctx.fillStyle = '#000';
  for (const rect of rects) {
    const t = translateMaskRect(rect, pixelRatio, originOffset, canvas.width, canvas.height);
    if (!(t.w > 0 && t.h > 0)) continue;
    ctx.fillRect(t.x, t.y, t.w, t.h);
  }

  return canvas.toDataURL('image/png');
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new MaskApplicationError('Failed to load image for privacy masking'));
    img.src = dataUrl;
  });
}
