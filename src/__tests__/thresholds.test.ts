import { describe, it, expect } from 'vitest';
import { PBTA_PRESET, DND_PRESET, type ThresholdPreset } from '../thresholds';

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
