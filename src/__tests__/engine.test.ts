import { describe, it, expect } from 'vitest';
import { computeNormalProbabilities } from '../engine';

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
