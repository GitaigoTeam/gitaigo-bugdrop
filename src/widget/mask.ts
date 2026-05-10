export interface MaskRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function collectMaskRects(_root: Element): MaskRect[] {
  return [];
}

export async function applyMaskToImage(
  dataUrl: string,
  _rects: MaskRect[],
  _pixelRatio: number,
  _originOffset?: { x: number; y: number }
): Promise<string> {
  return dataUrl;
}
