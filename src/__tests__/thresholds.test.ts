import { describe, it, expect } from 'vitest';
import { PBTA_PRESET, DND_PRESET, mapThresholds, type ThresholdPreset } from '../thresholds';

describe('built-in presets', () => {
  it('PbtA preset has correct structure', () => {
    expect(PBTA_PRESET.name).toBe('PbtA');
    expect(PBTA_PRESET.referenceDie).toBe('2d6');
    expect(PBTA_PRESET.thresholds).toEqual([7, 10]);
    expect(PBTA_PRESET.categories).toHaveLength(3);
    expect(PBTA_PRESET.categories[0]).toEqual({ label: 'Miss', color: '#f87171' });
    expect(PBTA_PRESET.categories[1]).toEqual({ label: 'Weak Hit', color: '#facc15' });
    expect(PBTA_PRESET.categories[2]).toEqual({ label: 'Strong Hit', color: '#4ade80' });
  });

  it('PbtA has one more category than thresholds', () => {
    expect(PBTA_PRESET.categories.length).toBe(PBTA_PRESET.thresholds.length + 1);
  });

  it('D&D preset has correct structure', () => {
    expect(DND_PRESET.name).toBe('D&D');
    expect(DND_PRESET.referenceDie).toBe('1d20');
    expect(DND_PRESET.thresholds).toEqual([5, 10, 15, 20, 25, 30]);
    expect(DND_PRESET.categories).toHaveLength(7);
    expect(DND_PRESET.categories[0]).toEqual({ label: 'Trivial', color: '#94a3b8' });
    expect(DND_PRESET.categories[6]).toEqual({ label: 'Nearly Impossible', color: '#a855f7' });
  });

  it('D&D has one more category than thresholds', () => {
    expect(DND_PRESET.categories.length).toBe(DND_PRESET.thresholds.length + 1);
  });

  it('D&D thresholds are ascending', () => {
    for (let i = 1; i < DND_PRESET.thresholds.length; i++) {
      expect(DND_PRESET.thresholds[i]).toBeGreaterThan(DND_PRESET.thresholds[i - 1]);
    }
  });
});

describe('mapThresholds', () => {
  it('maps PbtA (2d6) to itself (identity)', () => {
    const result = mapThresholds(PBTA_PRESET, 2, 6);
    expect(result).toEqual([7, 10]);
  });

  it('maps D&D (1d20) to itself (identity)', () => {
    const result = mapThresholds(DND_PRESET, 1, 20);
    expect(result).toEqual([5, 10, 15, 20, 25, 30]);
  });

  it('maps D&D to 2d6 using linear proportional formula', () => {
    // ref 1d20: min=1, max=20, range=19
    // target 2d6: min=2, max=12, range=10
    // threshold 5:  2 + round(4/19 * 10)  = 2 + round(2.105) = 2+2 = 4
    // threshold 10: 2 + round(9/19 * 10)  = 2 + round(4.737) = 2+5 = 7
    // threshold 15: 2 + round(14/19 * 10) = 2 + round(7.368) = 2+7 = 9
    // threshold 20: 2 + round(19/19 * 10) = 2 + round(10)    = 2+10 = 12
    // threshold 25: 2 + round(24/19 * 10) = 2 + round(12.63) = 2+13 = 15
    // threshold 30: 2 + round(29/19 * 10) = 2 + round(15.26) = 2+15 = 17
    const result = mapThresholds(DND_PRESET, 2, 6);
    expect(result).toEqual([4, 7, 9, 12, 15, 17]);
  });

  it('maps PbtA to 1d20', () => {
    // ref 2d6: min=2, max=12, range=10
    // target 1d20: min=1, max=20, range=19
    // threshold 7:  1 + round(5/10 * 19)  = 1 + round(9.5) = 1+10 = 11
    // threshold 10: 1 + round(8/10 * 19)  = 1 + round(15.2) = 1+15 = 16
    const result = mapThresholds(PBTA_PRESET, 1, 20);
    expect(result).toEqual([11, 16]);
  });

  it('maps PbtA to 2d12', () => {
    // ref 2d6: min=2, max=12, range=10
    // target 2d12: min=2, max=24, range=22
    // threshold 7:  2 + round(5/10 * 22) = 2 + round(11) = 13
    // threshold 10: 2 + round(8/10 * 22) = 2 + round(17.6) = 2+18 = 20
    const result = mapThresholds(PBTA_PRESET, 2, 12);
    expect(result).toEqual([13, 20]);
  });

  it('preserves ascending order', () => {
    const result = mapThresholds(DND_PRESET, 2, 6);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]);
    }
  });
});
