import { sanitizeCssColor, sanitizeCssFontFamily, sanitizeNonNegativePixelValue } from './sanitize';
import { resolveAccentColor } from '../defaults';

export interface PickerStyle {
  accentColor?: string;
  font?: string;
  radius?: string;
  borderWidth?: string;
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  theme?: string;
}

interface ResolvedPickerStyle {
  accent: string;
  fontFamily: string;
  radius: string;
  bw: string;
  tooltipBg: string;
  tooltipText: string;
  tooltipBorder: string;
}

const CLICKABLE_ROLES = new Set(['button', 'link', 'menuitem', 'tab', 'option']);
const CLICKABLE_FORM_TAGS = new Set(['button', 'input', 'select', 'textarea']);

function getSelectionTarget(element: Element): Element {
  return getNearestClickableAncestor(element) ?? element;
}

function getNearestClickableAncestor(element: Element): Element | null {
  const { body, documentElement } = element.ownerDocument;
  let current: Element | null = element;

  while (current && current !== body && current !== documentElement) {
    if (isClickableElement(current)) return current;
    current = current.parentElement;
  }

  return null;
}

function isClickableElement(element: Element): boolean {
  if (element.getAttribute('aria-disabled') === 'true') return false;

  const tagName = element.tagName.toLowerCase();
  if (tagName === 'a') return element.hasAttribute('href');
  if (CLICKABLE_FORM_TAGS.has(tagName)) {
    return !('disabled' in element && (element as HTMLButtonElement).disabled);
  }
  if (tagName === 'summary') return true;

  const role = element.getAttribute('role');
  if (role && role.split(/\s+/).some(roleToken => CLICKABLE_ROLES.has(roleToken.toLowerCase()))) {
    return true;
  }

  const tabIndex = element.getAttribute('tabindex');
  return tabIndex !== null && Number.parseInt(tabIndex, 10) >= 0;
}

export function resolvePickerStyle(style?: PickerStyle): ResolvedPickerStyle {
  const isDark = style?.theme === 'dark';
  const radius = sanitizeNonNegativePixelValue(style?.radius);
  const borderWidth = sanitizeNonNegativePixelValue(style?.borderWidth);
  const fontFamily = sanitizeCssFontFamily(style?.font);

  return {
    accent: resolveAccentColor(sanitizeCssColor(style?.accentColor)),
    fontFamily:
      style?.font === 'inherit'
        ? 'system-ui, sans-serif'
        : fontFamily || "'Space Grotesk', system-ui, sans-serif",
    radius: radius !== undefined ? `${radius}px` : '6px',
    bw: borderWidth !== undefined ? String(borderWidth) : '3',
    tooltipBg: sanitizeCssColor(style?.bgColor) || (isDark ? '#0f172a' : '#1a1a1a'),
    tooltipText: sanitizeCssColor(style?.textColor) || '#f1f5f9',
    tooltipBorder: sanitizeCssColor(style?.borderColor) || (isDark ? '#334155' : '#333'),
  };
}

export function createElementPicker(style?: PickerStyle): Promise<Element | null> {
  return new Promise(resolve => {
    // Small delay to ensure any modal has been removed from the DOM
    setTimeout(() => {
      startPicker(resolve, style);
    }, 50);
  });
}

function startPicker(resolve: (element: Element | null) => void, style?: PickerStyle): void {
  const { accent, fontFamily, radius, bw, tooltipBg, tooltipText, tooltipBorder } =
    resolvePickerStyle(style);

  const overlay = document.createElement('div');
  overlay.id = 'bugdrop-element-picker-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 2147483645;
    cursor: crosshair;
    touch-action: none;
    user-select: none;
    background: transparent;
  `;
  document.body.appendChild(overlay);

  // Create highlight overlay with higher z-index than modal (1000000)
  const highlight = document.createElement('div');
  highlight.id = 'bugdrop-element-picker-highlight';
  highlight.style.cssText = `
    position: fixed;
    box-sizing: content-box;
    pointer-events: none;
    border: ${bw}px solid ${accent};
    background: transparent;
    z-index: 2147483646;
    transition: all 0.05s ease-out;
    box-shadow: none;
    border-radius: ${radius};
  `;
  document.body.appendChild(highlight);

  // Instruction tooltip with higher z-index
  const tooltip = document.createElement('div');
  tooltip.id = 'bugdrop-element-picker-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${tooltipBg};
    color: ${tooltipText};
    padding: 14px 28px;
    border-radius: ${radius};
    font-family: ${fontFamily};
    font-size: 14px;
    font-weight: 500;
    z-index: 2147483647;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    border: ${bw}px solid ${tooltipBorder};
  `;
  tooltip.textContent = 'Click or tap any element to capture it (ESC to cancel)';
  document.body.appendChild(tooltip);

  let currentElement: Element | null = null;
  let activePointerId: number | null = null;

  function getSelectableElementAtPoint(x: number, y: number): Element | undefined {
    const previousPointerEvents = overlay.style.pointerEvents;
    overlay.style.pointerEvents = 'none';
    const elementsAtPoint = (() => {
      try {
        return document.elementsFromPoint(x, y);
      } finally {
        overlay.style.pointerEvents = previousPointerEvents;
      }
    })();

    return elementsAtPoint.find(el => {
      if (el === overlay) return false;
      if (el === highlight || el === tooltip) return false;
      if (el.id === 'bugdrop-element-picker-overlay') return false;
      if (el.id === 'bugdrop-element-picker-highlight') return false;
      if (el.id === 'bugdrop-element-picker-tooltip') return false;
      if (el.closest('#bugdrop-host')) return false;
      return true;
    });
  }

  function onMouseMove(e: MouseEvent) {
    // Get the element under the cursor, ignoring our picker elements
    const target = getSelectableElementAtPoint(e.clientX, e.clientY);

    if (!target) return;

    currentElement = getSelectionTarget(target);
    const rect = currentElement.getBoundingClientRect();

    // Update highlight position with slight padding
    highlight.style.top = `${rect.top - 2}px`;
    highlight.style.left = `${rect.left - 2}px`;
    highlight.style.width = `${rect.width + 4}px`;
    highlight.style.height = `${rect.height + 4}px`;
    highlight.style.display = 'block';
  }

  function selectElementAtPoint(x: number, y: number) {
    const target = getSelectableElementAtPoint(x, y);
    currentElement = target ? getSelectionTarget(target) : currentElement;
    cleanup();
    resolve(currentElement);
  }

  function onPointerDown(e: PointerEvent) {
    if (activePointerId !== null || !e.isPrimary) return;
    e.preventDefault();
    e.stopPropagation();
    activePointerId = e.pointerId;
    overlay.setPointerCapture?.(e.pointerId);
    const target = getSelectableElementAtPoint(e.clientX, e.clientY);
    currentElement = target ? getSelectionTarget(target) : currentElement;
  }

  function onPointerMove(e: PointerEvent) {
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    e.preventDefault();
    e.stopPropagation();
    onMouseMove(e);
  }

  function onPointerUp(e: PointerEvent) {
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    e.preventDefault();
    e.stopPropagation();
    activePointerId = null;
    overlay.releasePointerCapture?.(e.pointerId);
    selectElementAtPoint(e.clientX, e.clientY);
  }

  function onPointerCancel(e: PointerEvent) {
    if (e.pointerId !== activePointerId) return;
    activePointerId = null;
    overlay.releasePointerCapture?.(e.pointerId);
  }

  function onClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    selectElementAtPoint(e.clientX, e.clientY);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      cleanup();
      resolve(null);
    }
  }

  function cleanup() {
    overlay.removeEventListener('pointerdown', onPointerDown);
    overlay.removeEventListener('pointermove', onPointerMove);
    overlay.removeEventListener('pointerup', onPointerUp);
    overlay.removeEventListener('pointercancel', onPointerCancel);
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown);
    overlay.remove();
    highlight.remove();
    tooltip.remove();
    document.body.style.cursor = '';
  }

  // Set cursor and start listening
  document.body.style.cursor = 'crosshair';
  overlay.addEventListener('pointerdown', onPointerDown);
  overlay.addEventListener('pointermove', onPointerMove);
  overlay.addEventListener('pointerup', onPointerUp);
  overlay.addEventListener('pointercancel', onPointerCancel);
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown);
}
