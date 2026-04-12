import { describe, it, expect } from 'vitest';
import {
  computeNormalProbabilities,
  computeAdvantageProbabilities,
  computeDisadvantageProbabilities,
  computeProbabilities,
} from '../engine';

describe('computeNormalProbabilities', () => {
  it('computes 2d6 with no modifier', () => {
    const result = computeNormalProbabilities(6, 6, 9, 0);
    expect(result.miss).toBeCloseTo((15 / 36) * 100, 10);
    expect(result.weakHit).toBeCloseTo((15 / 36) * 100, 10);
    expect(result.strongHit).toBeCloseTo((6 / 36) * 100, 10);
  });

  it('computes 2d6 with +1 modifier', () => {
    const result = computeNormalProbabilities(6, 6, 9, 1);
    expect(result.miss).toBeCloseTo((10 / 36) * 100, 10);
    expect(result.weakHit).toBeCloseTo((16 / 36) * 100, 10);
    expect(result.strongHit).toBeCloseTo((10 / 36) * 100, 10);
  });

  it('computes 2d8 with no modifier', () => {
    const result = computeNormalProbabilities(8, 8, 12, 0);
    expect(result.miss).toBeCloseTo((28 / 64) * 100, 10);
    expect(result.weakHit).toBeCloseTo((26 / 64) * 100, 10);
    expect(result.strongHit).toBeCloseTo((10 / 64) * 100, 10);
  });

  it('all three outcomes sum to exactly 100', () => {
    const result = computeNormalProbabilities(6, 6, 9, 0);
    expect(result.miss + result.weakHit + result.strongHit).toBeCloseTo(100, 10);
  });
});

describe('computeAdvantageProbabilities', () => {
  it('computes 3d6 keep highest 2 with no modifier', () => {
    const result = computeAdvantageProbabilities(6, 6, 9, 0);
    // 216 total outcomes (6^3)
    // Miss (highest-2 sum ≤ 6): 42 outcomes
    // Weak (7-9): 97 outcomes
    // Strong (≥10): 77 outcomes
    expect(result.miss).toBeCloseTo((42 / 216) * 100, 10);
    expect(result.weakHit).toBeCloseTo((97 / 216) * 100, 10);
    expect(result.strongHit).toBeCloseTo((77 / 216) * 100, 10);
  });

  it('sums to 100', () => {
    const result = computeAdvantageProbabilities(6, 6, 9, 0);
    expect(result.miss + result.weakHit + result.strongHit).toBeCloseTo(100, 10);
  });
});

describe('computeDisadvantageProbabilities', () => {
  it('computes 3d6 keep lowest 2 with no modifier', () => {
    const result = computeDisadvantageProbabilities(6, 6, 9, 0);
    // 216 total outcomes
    // Miss (lowest-2 sum ≤ 6): 147 outcomes
    // Weak (7-9): 58 outcomes
    // Strong (≥10): 11 outcomes
    expect(result.miss).toBeCloseTo((147 / 216) * 100, 10);
    expect(result.weakHit).toBeCloseTo((58 / 216) * 100, 10);
    expect(result.strongHit).toBeCloseTo((11 / 216) * 100, 10);
  });

  it('sums to 100', () => {
    const result = computeDisadvantageProbabilities(6, 6, 9, 0);
    expect(result.miss + result.weakHit + result.strongHit).toBeCloseTo(100, 10);
  });
});

describe('computeProbabilities', () => {
  it('dispatches to normal', () => {
    const direct = computeNormalProbabilities(6, 6, 9, 0);
    const dispatched = computeProbabilities(6, 6, 9, 0, 'normal');
    expect(dispatched).toEqual(direct);
  });

  it('dispatches to advantage', () => {
    const direct = computeAdvantageProbabilities(6, 6, 9, 0);
    const dispatched = computeProbabilities(6, 6, 9, 0, 'advantage');
    expect(dispatched).toEqual(direct);
  });

  it('dispatches to disadvantage', () => {
    const direct = computeDisadvantageProbabilities(6, 6, 9, 0);
    const dispatched = computeProbabilities(6, 6, 9, 0, 'disadvantage');
    expect(dispatched).toEqual(direct);
  });
});
