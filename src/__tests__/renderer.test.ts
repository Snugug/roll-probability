import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DiceConfig } from '../thresholds';
import { renderPage } from '../renderer';

const config2d6: DiceConfig = {
  count: 2, sides: 6, label: '2d6',
  thresholds: [7, 10],
  categories: [
    { label: 'Miss', color: '#f87171' },
    { label: 'Weak Hit', color: '#facc15' },
    { label: 'Strong Hit', color: '#4ade80' },
  ],
};

const config1d20: DiceConfig = {
  count: 1, sides: 20, label: '1d20',
  thresholds: [5, 10, 15, 20, 25, 30],
  categories: [
    { label: 'Trivial', color: '#94a3b8' },
    { label: 'Very Easy', color: '#4ade80' },
    { label: 'Easy', color: '#22d3ee' },
    { label: 'Medium', color: '#facc15' },
    { label: 'Hard', color: '#f97316' },
    { label: 'Very Hard', color: '#ef4444' },
    { label: 'Nearly Impossible', color: '#a855f7' },
  ],
};

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

describe('renderPage', () => {
  it('creates a dice-row for each config', () => {
    renderPage(container, [config2d6, config1d20], 0, 0, false, false);
    expect(container.querySelectorAll('dice-row').length).toBe(2);
  });

  it('clears previous content before rendering', () => {
    renderPage(container, [config2d6, config1d20], 0, 0, false, false);
    renderPage(container, [config2d6], 0, 0, false, false);
    expect(container.querySelectorAll('dice-row').length).toBe(1);
  });

  it('renders nothing for empty configs', () => {
    renderPage(container, [], 0, 0, false, false);
    expect(container.children.length).toBe(0);
  });
});

describe('dice-row', () => {
  it('renders header with label and N colored range items', () => {
    renderPage(container, [config2d6], 0, 0, false, false);
    const row = container.querySelector('dice-row')!;
    expect(row.querySelector('.dice-label')!.textContent).toBe('2d6');
    const items = row.querySelectorAll('.dice-range-item');
    expect(items.length).toBe(3);
    expect(items[0].textContent).toBe('Miss <7');
    expect(items[1].textContent).toBe('Weak Hit 7\u20139');
    expect(items[2].textContent).toBe('Strong Hit 10+');
  });

  it('renders inline swatch colors', () => {
    renderPage(container, [config2d6], 0, 0, false, false);
    const swatches = container.querySelectorAll('.range-swatch');
    expect((swatches[0] as HTMLElement).style.backgroundColor).toBeTruthy();
    expect((swatches[1] as HTMLElement).style.backgroundColor).toBeTruthy();
    expect((swatches[2] as HTMLElement).style.backgroundColor).toBeTruthy();
  });

  it('renders 7 range items for D&D config', () => {
    renderPage(container, [config1d20], 0, 0, false, false);
    const items = container.querySelectorAll('.dice-range-item');
    expect(items.length).toBe(7);
    expect(items[0].textContent).toBe('Trivial <5');
    expect(items[6].textContent).toBe('Nearly Impossible 30+');
  });

  it('creates bar-columns for each modifier in range', () => {
    renderPage(container, [config2d6], -1, 1, false, false);
    expect(container.querySelectorAll('bar-column').length).toBe(3);
  });

  it('renders a gear icon button', () => {
    renderPage(container, [config2d6], 0, 0, false, false);
    const gearBtn = container.querySelector('.gear-btn');
    expect(gearBtn).toBeTruthy();
    expect(gearBtn!.getAttribute('commandfor')).toBe('dialog-2d6');
    expect(gearBtn!.getAttribute('command')).toBe('show-modal');
  });

  it('renders a dialog element', () => {
    renderPage(container, [config2d6], 0, 0, false, false);
    const dialog = container.querySelector('dialog#dialog-2d6');
    expect(dialog).toBeTruthy();
  });
});

describe('bar-column', () => {
  it('shows all three sub-bars when both toggles on', () => {
    renderPage(container, [config2d6], 0, 0, true, true);
    expect(container.querySelectorAll('stacked-bar').length).toBe(3);
  });

  it('shows only normal bar when both toggles off', () => {
    renderPage(container, [config2d6], 0, 0, false, false);
    expect(container.querySelectorAll('stacked-bar').length).toBe(1);
  });

  it('renders positive modifier label', () => {
    renderPage(container, [config2d6], 2, 2, false, false);
    expect(container.querySelector('.mod-label')!.textContent).toBe('+2');
  });

  it('renders negative modifier label', () => {
    renderPage(container, [config2d6], -1, -1, false, false);
    expect(container.querySelector('.mod-label')!.textContent).toBe('-1');
  });
});

describe('stacked-bar', () => {
  it('renders segments with inline background colors', () => {
    renderPage(container, [config2d6], 0, 0, false, false);
    const bar = container.querySelector('stacked-bar')!;
    const segs = bar.querySelectorAll('.seg');
    expect(segs.length).toBe(3);
  });

  it('hides percentage text for segments below 5%', () => {
    renderPage(container, [config2d6], 4, 4, false, false);
    const segs = container.querySelectorAll('.seg');
    // Find the floor segment (Miss) — at +4 it should be ~2.78%
    const floorSeg = segs[segs.length - 1];
    expect(floorSeg.querySelector('span')).toBeNull();
  });

  it('omits 0% segments entirely', () => {
    // 1d20 -10: only Trivial, Very Easy, Easy are non-zero
    renderPage(container, [config1d20], -10, -10, false, false);
    const bar = container.querySelector('stacked-bar')!;
    const segs = bar.querySelectorAll('.seg');
    // Should have 3 segments, not 7
    expect(segs.length).toBe(3);
  });

  it('shows more segments as modifier increases', () => {
    // 1d20 +0: Trivial through Hard are non-zero (5 segments)
    renderPage(container, [config1d20], 0, 0, false, false);
    const bar = container.querySelector('stacked-bar')!;
    const segs = bar.querySelectorAll('.seg');
    expect(segs.length).toBe(5);
  });

  it('sets tooltip data attributes on all segments', () => {
    renderPage(container, [config2d6], 0, 0, false, false);
    const segs = container.querySelectorAll('.seg');
    for (const seg of segs) {
      expect(seg.getAttribute('data-tooltip')).toMatch(/\d+\.\d{2}%$/);
    }
  });
});
