import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DiceConfig } from '../engine';
import { renderPage } from '../renderer';

const config2d6: DiceConfig = { count: 2, sides: 6, label: '2d6', missMax: 6, weakMax: 9 };
const config2d8: DiceConfig = { count: 2, sides: 8, label: '2d8', missMax: 8, weakMax: 12 };

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
    renderPage(container, [config2d6, config2d8], 0, 0, false, false);
    expect(container.querySelectorAll('dice-row').length).toBe(2);
  });

  it('clears previous content before rendering', () => {
    renderPage(container, [config2d6, config2d8], 0, 0, false, false);
    renderPage(container, [config2d6], 0, 0, false, false);
    expect(container.querySelectorAll('dice-row').length).toBe(1);
  });

  it('renders nothing for empty configs', () => {
    renderPage(container, [], 0, 0, false, false);
    expect(container.children.length).toBe(0);
  });
});

describe('dice-row', () => {
  it('renders header with label and colored range swatches', () => {
    renderPage(container, [config2d6], 0, 0, false, false);
    const row = container.querySelector('dice-row')!;
    expect(row.querySelector('.dice-label')!.textContent).toBe('2d6');

    const items = row.querySelectorAll('.dice-range-item');
    expect(items.length).toBe(3);
    expect(items[0].textContent).toBe('Miss 2\u20136');
    expect(items[1].textContent).toBe('Weak Hit 7\u20139');
    expect(items[2].textContent).toBe('Strong Hit 10+');

    expect(items[0].querySelector('.range-swatch-miss')).toBeTruthy();
    expect(items[1].querySelector('.range-swatch-weak')).toBeTruthy();
    expect(items[2].querySelector('.range-swatch-strong')).toBeTruthy();
  });

  it('creates bar-columns for each modifier in range', () => {
    renderPage(container, [config2d6], -1, 1, false, false);
    expect(container.querySelectorAll('bar-column').length).toBe(3);
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

  it('shows dis and base labels when only disadvantage on', () => {
    renderPage(container, [config2d6], 0, 0, false, true);
    const labels = container.querySelectorAll('.bar-type-row span');
    expect(labels.length).toBe(2);
    expect(labels[0].textContent).toBe('dis');
    expect(labels[1].textContent).toBe('base');
  });

  it('shows base and adv labels when only advantage on', () => {
    renderPage(container, [config2d6], 0, 0, true, false);
    const labels = container.querySelectorAll('.bar-type-row span');
    expect(labels.length).toBe(2);
    expect(labels[0].textContent).toBe('base');
    expect(labels[1].textContent).toBe('adv');
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
  it('renders three segments with percentages for large values', () => {
    renderPage(container, [config2d6], 0, 0, false, false);
    const bar = container.querySelector('stacked-bar')!;
    const segs = bar.querySelectorAll('.seg');
    expect(segs.length).toBe(3);
    // 2d6 +0: strong ~17%, weak ~42%, miss ~42% — all >= 5%
    expect(segs[0].querySelector('span')!.textContent).toBe('17%');
    expect(segs[1].querySelector('span')!.textContent).toBe('42%');
    expect(segs[2].querySelector('span')!.textContent).toBe('42%');
  });

  it('hides percentage text for segments below 5%', () => {
    // 2d6 +5: miss is ~2.78%
    renderPage(container, [config2d6], 5, 5, false, false);
    const missSeg = container.querySelector('.seg-m')!;
    expect(missSeg.querySelector('span')).toBeNull();
  });

  it('sets tooltip data attributes on all segments', () => {
    renderPage(container, [config2d6], 0, 0, false, false);
    const segs = container.querySelectorAll('.seg');
    for (const seg of segs) {
      expect(seg.getAttribute('data-tooltip')).toMatch(/\d+\.\d{2}%$/);
    }
  });
});
