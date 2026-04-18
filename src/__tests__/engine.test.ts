import { describe, it, expect } from 'vitest';
import {
  computeNormalProbabilities,
  computeAdvantageProbabilities,
  computeDisadvantageProbabilities,
  computeProbabilities,
  parseDiceNotation,
} from '../engine';

describe('computeNormalProbabilities', () => {
  it('computes 2d6 with PbtA thresholds [7, 10] and no modifier', () => {
    const result = computeNormalProbabilities(2, 6, [7, 10], 0);
    expect(result.categories).toHaveLength(3);
    expect(result.categories[0]).toBeCloseTo((15 / 36) * 100, 10);
    expect(result.categories[1]).toBeCloseTo((15 / 36) * 100, 10);
    expect(result.categories[2]).toBeCloseTo((6 / 36) * 100, 10);
  });

  it('computes 2d6 with PbtA thresholds and +1 modifier', () => {
    const result = computeNormalProbabilities(2, 6, [7, 10], 1);
    expect(result.categories).toHaveLength(3);
    expect(result.categories[0]).toBeCloseTo((10 / 36) * 100, 10);
    expect(result.categories[1]).toBeCloseTo((16 / 36) * 100, 10);
    expect(result.categories[2]).toBeCloseTo((10 / 36) * 100, 10);
  });

  it('computes 1d20 with D&D thresholds and no modifier', () => {
    const result = computeNormalProbabilities(1, 20, [5, 10, 15, 20, 25, 30], 0);
    expect(result.categories).toHaveLength(7);
    expect(result.categories[0]).toBeCloseTo(20, 10);
    expect(result.categories[1]).toBeCloseTo(25, 10);
    expect(result.categories[2]).toBeCloseTo(25, 10);
    expect(result.categories[3]).toBeCloseTo(25, 10);
    expect(result.categories[4]).toBeCloseTo(5, 10);
    expect(result.categories[5]).toBeCloseTo(0, 10);
    expect(result.categories[6]).toBeCloseTo(0, 10);
  });

  it('computes 1d20 with D&D thresholds and +5 modifier', () => {
    const result = computeNormalProbabilities(1, 20, [5, 10, 15, 20, 25, 30], 5);
    expect(result.categories).toHaveLength(7);
    expect(result.categories[0]).toBeCloseTo(0, 10);
    expect(result.categories[1]).toBeCloseTo(20, 10);
    expect(result.categories[2]).toBeCloseTo(25, 10);
    expect(result.categories[3]).toBeCloseTo(25, 10);
    expect(result.categories[4]).toBeCloseTo(25, 10);
    expect(result.categories[5]).toBeCloseTo(5, 10);
    expect(result.categories[6]).toBeCloseTo(0, 10);
  });

  it('all categories sum to exactly 100', () => {
    const result = computeNormalProbabilities(2, 6, [7, 10], 0);
    const sum = result.categories.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 10);
  });

  it('all categories sum to 100 for D&D thresholds', () => {
    const result = computeNormalProbabilities(1, 20, [5, 10, 15, 20, 25, 30], 0);
    const sum = result.categories.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 10);
  });

  it('handles single threshold (2 categories)', () => {
    const result = computeNormalProbabilities(1, 6, [4], 0);
    expect(result.categories).toHaveLength(2);
    expect(result.categories[0]).toBeCloseTo(50, 10);
    expect(result.categories[1]).toBeCloseTo(50, 10);
  });
});

describe('computeAdvantageProbabilities', () => {
  it('computes 3d6 keep highest 2 with PbtA thresholds', () => {
    const result = computeAdvantageProbabilities(2, 6, [7, 10], 0);
    expect(result.categories).toHaveLength(3);
    expect(result.categories[0]).toBeCloseTo((42 / 216) * 100, 10);
    expect(result.categories[1]).toBeCloseTo((97 / 216) * 100, 10);
    expect(result.categories[2]).toBeCloseTo((77 / 216) * 100, 10);
  });

  it('sums to 100', () => {
    const result = computeAdvantageProbabilities(2, 6, [7, 10], 0);
    const sum = result.categories.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 10);
  });
});

describe('computeDisadvantageProbabilities', () => {
  it('computes 3d6 keep lowest 2 with PbtA thresholds', () => {
    const result = computeDisadvantageProbabilities(2, 6, [7, 10], 0);
    expect(result.categories).toHaveLength(3);
    expect(result.categories[0]).toBeCloseTo((147 / 216) * 100, 10);
    expect(result.categories[1]).toBeCloseTo((58 / 216) * 100, 10);
    expect(result.categories[2]).toBeCloseTo((11 / 216) * 100, 10);
  });

  it('sums to 100', () => {
    const result = computeDisadvantageProbabilities(2, 6, [7, 10], 0);
    const sum = result.categories.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 10);
  });
});

describe('computeProbabilities', () => {
  it('dispatches to normal', () => {
    const direct = computeNormalProbabilities(2, 6, [7, 10], 0);
    const dispatched = computeProbabilities(2, 6, [7, 10], 0, 'normal');
    expect(dispatched.categories).toEqual(direct.categories);
  });

  it('dispatches to advantage', () => {
    const direct = computeAdvantageProbabilities(2, 6, [7, 10], 0);
    const dispatched = computeProbabilities(2, 6, [7, 10], 0, 'advantage');
    expect(dispatched.categories).toEqual(direct.categories);
  });

  it('dispatches to disadvantage', () => {
    const direct = computeDisadvantageProbabilities(2, 6, [7, 10], 0);
    const dispatched = computeProbabilities(2, 6, [7, 10], 0, 'disadvantage');
    expect(dispatched.categories).toEqual(direct.categories);
  });
});

describe('computeNormalProbabilities with criticals', () => {
  it('returns ProbabilityResult with zero crit arrays when criticals is none', () => {
    const result = computeNormalProbabilities(2, 6, [7, 10], 0, { type: 'none' });
    expect(result.categories).toHaveLength(3);
    expect(result.categories[0]).toBeCloseTo((15 / 36) * 100, 10);
    expect(result.categories[1]).toBeCloseTo((15 / 36) * 100, 10);
    expect(result.categories[2]).toBeCloseTo((6 / 36) * 100, 10);
    expect(result.critHitPerCategory).toEqual([0, 0, 0]);
    expect(result.critMissPerCategory).toEqual([0, 0, 0]);
  });
});

describe('parseDiceNotation', () => {
  it('parses standard notation', () => {
    expect(parseDiceNotation('2d6')).toEqual({ count: 2, sides: 6 });
    expect(parseDiceNotation('3d8')).toEqual({ count: 3, sides: 8 });
    expect(parseDiceNotation('1d20')).toEqual({ count: 1, sides: 20 });
  });

  it('is case-insensitive', () => {
    expect(parseDiceNotation('4D6')).toEqual({ count: 4, sides: 6 });
  });

  it('trims whitespace', () => {
    expect(parseDiceNotation(' 2d6 ')).toEqual({ count: 2, sides: 6 });
  });

  it('returns null for invalid input', () => {
    expect(parseDiceNotation('foo')).toBeNull();
    expect(parseDiceNotation('')).toBeNull();
    expect(parseDiceNotation('d6')).toBeNull();
    expect(parseDiceNotation('2d')).toBeNull();
  });

  it('returns null for zero or invalid values', () => {
    expect(parseDiceNotation('0d6')).toBeNull();
    expect(parseDiceNotation('2d0')).toBeNull();
    expect(parseDiceNotation('2d1')).toBeNull();
  });
});
