import { describe, it, expect } from 'vitest';
import { computeInsertIndex } from '../src/components/dice-row';

describe('computeInsertIndex', () => {
  it('drag down: from=0 to=3 after → 3', () => {
    expect(computeInsertIndex(0, 3, 'after')).toBe(3);
  });

  it('drag down: from=0 to=3 before → 2', () => {
    expect(computeInsertIndex(0, 3, 'before')).toBe(2);
  });

  it('drag up: from=3 to=0 before → 0', () => {
    expect(computeInsertIndex(3, 0, 'before')).toBe(0);
  });

  it('drag up: from=3 to=0 after → 1', () => {
    expect(computeInsertIndex(3, 0, 'after')).toBe(1);
  });

  it('drop on self: from=2 to=2 → returns fromIdx (no-op)', () => {
    expect(computeInsertIndex(2, 2, 'before')).toBe(2);
    expect(computeInsertIndex(2, 2, 'after')).toBe(2);
  });

  it('no-op same slot: from=2 to=1 after → returns fromIdx', () => {
    expect(computeInsertIndex(2, 1, 'after')).toBe(2);
  });

  it('no-op same slot: from=2 to=3 before → returns fromIdx', () => {
    expect(computeInsertIndex(2, 3, 'before')).toBe(2);
  });

  it('drop at start: from=4 to=0 before → 0', () => {
    expect(computeInsertIndex(4, 0, 'before')).toBe(0);
  });

  it('drop at end: from=0 to=4 after → 4', () => {
    expect(computeInsertIndex(0, 4, 'after')).toBe(4);
  });
});
