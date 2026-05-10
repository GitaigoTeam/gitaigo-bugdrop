// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { collectMaskRects, applyMaskToImage } from '../src/widget/mask';

describe('mask module exports', () => {
  it('exports collectMaskRects', () => {
    expect(typeof collectMaskRects).toBe('function');
  });

  it('exports applyMaskToImage', () => {
    expect(typeof applyMaskToImage).toBe('function');
  });
});
