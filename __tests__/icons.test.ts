import { describe, it, expect } from 'vitest';
import { createDownloadSvg, createUploadSvg } from '../src/components/icons';

describe('icon functions', () => {
  it('createDownloadSvg returns an SVG element', () => {
    const svg = createDownloadSvg();
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('width')).toBe('18');
    expect(svg.getAttribute('height')).toBe('18');
    expect(svg.getAttribute('viewBox')).toBe('0 -960 960 960');
    expect(svg.getAttribute('fill')).toBe('currentColor');
    expect(svg.querySelector('path')).not.toBeNull();
  });

  it('createUploadSvg returns an SVG element', () => {
    const svg = createUploadSvg();
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('width')).toBe('18');
    expect(svg.getAttribute('height')).toBe('18');
    expect(svg.getAttribute('viewBox')).toBe('0 -960 960 960');
    expect(svg.getAttribute('fill')).toBe('currentColor');
    expect(svg.querySelector('path')).not.toBeNull();
  });
});
