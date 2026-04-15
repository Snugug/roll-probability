import { describe, it, expect } from 'vitest';
import {
  computeNormalProbabilities,
  computeAdvantageProbabilities,
  computeDisadvantageProbabilities,
  computeProbabilities,
  computeOptimalThresholds,
  parseDiceNotation,
} from '../engine';

describe('computeNormalProbabilities', () => {
  it('computes 2d6 with no modifier', () => {
    const result = computeNormalProbabilities(2, 6, 6, 9, 0);
    expect(result.miss).toBeCloseTo((15 / 36) * 100, 10);
    expect(result.weakHit).toBeCloseTo((15 / 36) * 100, 10);
    expect(result.strongHit).toBeCloseTo((6 / 36) * 100, 10);
  });

  it('computes 2d6 with +1 modifier', () => {
    const result = computeNormalProbabilities(2, 6, 6, 9, 1);
    expect(result.miss).toBeCloseTo((10 / 36) * 100, 10);
    expect(result.weakHit).toBeCloseTo((16 / 36) * 100, 10);
    expect(result.strongHit).toBeCloseTo((10 / 36) * 100, 10);
  });

  it('computes 2d8 with no modifier', () => {
    const result = computeNormalProbabilities(2, 8, 8, 12, 0);
    expect(result.miss).toBeCloseTo((28 / 64) * 100, 10);
    expect(result.weakHit).toBeCloseTo((26 / 64) * 100, 10);
    expect(result.strongHit).toBeCloseTo((10 / 64) * 100, 10);
  });

  it('all three outcomes sum to exactly 100', () => {
    const result = computeNormalProbabilities(2, 6, 6, 9, 0);
    expect(result.miss + result.weakHit + result.strongHit).toBeCloseTo(100, 10);
  });

  it('computes 1d6 with known thresholds', () => {
    const result = computeNormalProbabilities(1, 6, 3, 5, 0);
    expect(result.miss).toBeCloseTo((3 / 6) * 100, 10);
    expect(result.weakHit).toBeCloseTo((2 / 6) * 100, 10);
    expect(result.strongHit).toBeCloseTo((1 / 6) * 100, 10);
  });
});

describe('computeAdvantageProbabilities', () => {
  it('computes 3d6 keep highest 2 with no modifier', () => {
    const result = computeAdvantageProbabilities(2, 6, 6, 9, 0);
    expect(result.miss).toBeCloseTo((42 / 216) * 100, 10);
    expect(result.weakHit).toBeCloseTo((97 / 216) * 100, 10);
    expect(result.strongHit).toBeCloseTo((77 / 216) * 100, 10);
  });

  it('sums to 100', () => {
    const result = computeAdvantageProbabilities(2, 6, 6, 9, 0);
    expect(result.miss + result.weakHit + result.strongHit).toBeCloseTo(100, 10);
  });
});

describe('computeDisadvantageProbabilities', () => {
  it('computes 3d6 keep lowest 2 with no modifier', () => {
    const result = computeDisadvantageProbabilities(2, 6, 6, 9, 0);
    expect(result.miss).toBeCloseTo((147 / 216) * 100, 10);
    expect(result.weakHit).toBeCloseTo((58 / 216) * 100, 10);
    expect(result.strongHit).toBeCloseTo((11 / 216) * 100, 10);
  });

  it('sums to 100', () => {
    const result = computeDisadvantageProbabilities(2, 6, 6, 9, 0);
    expect(result.miss + result.weakHit + result.strongHit).toBeCloseTo(100, 10);
  });
});

describe('computeProbabilities', () => {
  it('dispatches to normal', () => {
    const direct = computeNormalProbabilities(2, 6, 6, 9, 0);
    const dispatched = computeProbabilities(2, 6, 6, 9, 0, 'normal');
    expect(dispatched).toEqual(direct);
  });

  it('dispatches to advantage', () => {
    const direct = computeAdvantageProbabilities(2, 6, 6, 9, 0);
    const dispatched = computeProbabilities(2, 6, 6, 9, 0, 'advantage');
    expect(dispatched).toEqual(direct);
  });

  it('dispatches to disadvantage', () => {
    const direct = computeDisadvantageProbabilities(2, 6, 6, 9, 0);
    const dispatched = computeProbabilities(2, 6, 6, 9, 0, 'disadvantage');
    expect(dispatched).toEqual(direct);
  });
});

describe('computeOptimalThresholds', () => {
  const baselineMiss = (15 / 36) * 100;
  const baselineWeak = (15 / 36) * 100;
  const baselineStrong = (6 / 36) * 100;

  it('maps 2d6 back to itself', () => {
    const result = computeOptimalThresholds(2, 6, baselineMiss, baselineWeak, baselineStrong);
    expect(result.missMax).toBe(6);
    expect(result.weakMax).toBe(9);
  });

  it('maps 2d8 to 8/12', () => {
    const result = computeOptimalThresholds(2, 8, baselineMiss, baselineWeak, baselineStrong);
    expect(result.missMax).toBe(8);
    expect(result.weakMax).toBe(12);
  });

  it('maps 2d10 to 10/15', () => {
    const result = computeOptimalThresholds(2, 10, baselineMiss, baselineWeak, baselineStrong);
    expect(result.missMax).toBe(10);
    expect(result.weakMax).toBe(15);
  });

  it('maps 2d12 to 11/17', () => {
    const result = computeOptimalThresholds(2, 12, baselineMiss, baselineWeak, baselineStrong);
    expect(result.missMax).toBe(11);
    expect(result.weakMax).toBe(17);
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
