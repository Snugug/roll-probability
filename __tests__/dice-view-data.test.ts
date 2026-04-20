import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { computeViewData } from '../src/components/dice-view-data';
import type { DiceConfig } from '../src/thresholds';
import { BarColumn } from '../src/components/bar-column';
import '../src/renderer'; // registers custom elements

const config2d6: DiceConfig = {
  count: 2, sides: 6, label: '2d6',
  thresholds: [7, 10],
  categories: [
    { label: 'Miss', color: '#f87171' },
    { label: 'Weak Hit', color: '#facc15' },
    { label: 'Strong Hit', color: '#4ade80' },
  ],
  criticals: { type: 'none' },
  minMod: 0, maxMod: 2,
  advantageMethod: 'plus-one-drop-low' as const,
  disadvantageMethod: 'plus-one-drop-high' as const,
};

describe('computeViewData', () => {
  it('returns one ModifierData per modifier in range', () => {
    const data = computeViewData(config2d6, false, false);
    expect(data.length).toBe(3);
    expect(data[0].modifier).toBe(0);
    expect(data[1].modifier).toBe(1);
    expect(data[2].modifier).toBe(2);
  });

  it('includes only normal mode when adv/dis are off', () => {
    const data = computeViewData(config2d6, false, false);
    expect(data[0].results.normal).toBeDefined();
    expect(data[0].results.advantage).toBeUndefined();
    expect(data[0].results.disadvantage).toBeUndefined();
  });

  it('includes all three modes when adv and dis are on', () => {
    const data = computeViewData(config2d6, true, true);
    expect(data[0].results.normal).toBeDefined();
    expect(data[0].results.advantage).toBeDefined();
    expect(data[0].results.disadvantage).toBeDefined();
  });

  it('includes advantage only when showAdvantage is true', () => {
    const data = computeViewData(config2d6, true, false);
    expect(data[0].results.advantage).toBeDefined();
    expect(data[0].results.disadvantage).toBeUndefined();
  });

  it('segments match category count', () => {
    const data = computeViewData(config2d6, false, false);
    expect(data[0].results.normal!.segments.length).toBe(3);
  });

  it('segments have correct labels and colors from config', () => {
    const data = computeViewData(config2d6, false, false);
    const segs = data[0].results.normal!.segments;
    expect(segs[0].label).toBe('Miss');
    expect(segs[0].color).toBe('#f87171');
    expect(segs[2].label).toBe('Strong Hit');
    expect(segs[2].color).toBe('#4ade80');
  });

  it('segment percentages sum to approximately 100', () => {
    const data = computeViewData(config2d6, false, false);
    const sum = data[0].results.normal!.segments.reduce((s, seg) => s + seg.percent, 0);
    expect(sum).toBeCloseTo(100, 0);
  });

  it('includes critHitPerCategory and critMissPerCategory arrays', () => {
    const data = computeViewData(config2d6, false, false);
    expect(data[0].results.normal!.critHitPerCategory).toBeDefined();
    expect(data[0].results.normal!.critMissPerCategory).toBeDefined();
  });

  it('excludes advantage when advantageMethod is none even if toggle is on', () => {
    const noneConfig = { ...config2d6, advantageMethod: 'none' as const };
    const data = computeViewData(noneConfig, true, false);
    expect(data[0].results.advantage).toBeUndefined();
    expect(data[0].results.normal).toBeDefined();
  });

  it('excludes disadvantage when disadvantageMethod is none even if toggle is on', () => {
    const noneConfig = { ...config2d6, disadvantageMethod: 'none' as const };
    const data = computeViewData(noneConfig, false, true);
    expect(data[0].results.disadvantage).toBeUndefined();
    expect(data[0].results.normal).toBeDefined();
  });

  it('includes advantage when method is plus-one-drop-low and toggle is on', () => {
    const data = computeViewData(config2d6, true, false);
    expect(data[0].results.advantage).toBeDefined();
  });
});

import { BarChartView } from '../src/components/bar-chart-view';

const config2d6ForView: DiceConfig = {
  count: 2, sides: 6, label: '2d6',
  thresholds: [7, 10],
  categories: [
    { label: 'Miss', color: '#f87171' },
    { label: 'Weak Hit', color: '#facc15' },
    { label: 'Strong Hit', color: '#4ade80' },
  ],
  criticals: { type: 'none' },
  minMod: 0, maxMod: 1,
  advantageMethod: 'plus-one-drop-low' as const,
  disadvantageMethod: 'plus-one-drop-high' as const,
};

describe('BarChartView', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('creates bar-column elements for each modifier', () => {
    const view = document.createElement('bar-chart-view') as BarChartView;
    container.appendChild(view);
    const data = computeViewData(config2d6ForView, false, false);
    view.update(data, config2d6ForView, false, false);
    expect(view.querySelectorAll('bar-column').length).toBe(2);
  });

  it('replaces content on subsequent update calls', () => {
    const view = document.createElement('bar-chart-view') as BarChartView;
    container.appendChild(view);
    const data = computeViewData(config2d6ForView, false, false);
    view.update(data, config2d6ForView, false, false);
    view.update(data, config2d6ForView, false, false);
    expect(view.querySelectorAll('bar-column').length).toBe(2);
  });

  it('has .bars class on the container', () => {
    const view = document.createElement('bar-chart-view') as BarChartView;
    container.appendChild(view);
    const data = computeViewData(config2d6ForView, false, false);
    view.update(data, config2d6ForView, false, false);
    expect(view.querySelector('.bars')).toBeTruthy();
  });
});

describe('BarColumn with pre-computed data', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders stacked bars from modeResults', () => {
    const col = document.createElement('bar-column') as BarColumn;
    col.modifier = 0;
    col.showAdvantage = false;
    col.showDisadvantage = false;
    col.critConfig = { type: 'none' };
    col.modeResults = {
      normal: {
        segments: [
          { label: 'Miss', color: '#f87171', percent: 27.78 },
          { label: 'Weak Hit', color: '#facc15', percent: 44.44 },
          { label: 'Strong Hit', color: '#4ade80', percent: 27.78 },
        ],
        critHitPerCategory: [0, 0, 0],
        critMissPerCategory: [0, 0, 0],
      },
    };
    container.appendChild(col);
    expect(col.querySelectorAll('stacked-bar').length).toBe(1);
  });

  it('renders three bars when all modes provided', () => {
    const modeResult = {
      segments: [
        { label: 'A', color: '#f00', percent: 50 },
        { label: 'B', color: '#0f0', percent: 50 },
      ],
      critHitPerCategory: [0, 0],
      critMissPerCategory: [0, 0],
    };
    const col = document.createElement('bar-column') as BarColumn;
    col.modifier = 1;
    col.showAdvantage = true;
    col.showDisadvantage = true;
    col.critConfig = { type: 'none' };
    col.modeResults = {
      disadvantage: modeResult,
      normal: modeResult,
      advantage: modeResult,
    };
    container.appendChild(col);
    expect(col.querySelectorAll('stacked-bar').length).toBe(3);
  });
});
