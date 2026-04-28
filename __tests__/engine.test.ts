import { describe, it, expect } from 'vitest';
import {
  computeNormalProbabilities,
  computeAdvantageProbabilities,
  computeDisadvantageProbabilities,
  computeDoubleDiceProbabilities,
  computeProbabilities,
  parseDiceNotation,
  parseDiceExpression,
  formatDiceExpression,
} from '../src/engine';

describe('computeNormalProbabilities', () => {
  it('computes 2d6 with PbtA thresholds [7, 10] and no modifier', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    expect(result.categories).toHaveLength(3);
    expect(result.categories[0]).toBeCloseTo((15 / 36) * 100, 10);
    expect(result.categories[1]).toBeCloseTo((15 / 36) * 100, 10);
    expect(result.categories[2]).toBeCloseTo((6 / 36) * 100, 10);
  });

  it('computes 2d6 with PbtA thresholds and +1 modifier', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 1);
    expect(result.categories).toHaveLength(3);
    expect(result.categories[0]).toBeCloseTo((10 / 36) * 100, 10);
    expect(result.categories[1]).toBeCloseTo((16 / 36) * 100, 10);
    expect(result.categories[2]).toBeCloseTo((10 / 36) * 100, 10);
  });

  it('computes 1d20 with D&D thresholds and no modifier', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 1, sides: 20 }], [5, 10, 15, 20, 25, 30], 0);
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
    const result = computeNormalProbabilities([{ sign: '+', count: 1, sides: 20 }], [5, 10, 15, 20, 25, 30], 5);
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
    const result = computeNormalProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    const sum = result.categories.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 10);
  });

  it('all categories sum to 100 for D&D thresholds', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 1, sides: 20 }], [5, 10, 15, 20, 25, 30], 0);
    const sum = result.categories.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 10);
  });

  it('handles single threshold (2 categories)', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 1, sides: 6 }], [4], 0);
    expect(result.categories).toHaveLength(2);
    expect(result.categories[0]).toBeCloseTo(50, 10);
    expect(result.categories[1]).toBeCloseTo(50, 10);
  });
});

describe('computeAdvantageProbabilities', () => {
  it('computes 3d6 keep highest 2 with PbtA thresholds', () => {
    const result = computeAdvantageProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    expect(result.categories).toHaveLength(3);
    expect(result.categories[0]).toBeCloseTo((42 / 216) * 100, 10);
    expect(result.categories[1]).toBeCloseTo((97 / 216) * 100, 10);
    expect(result.categories[2]).toBeCloseTo((77 / 216) * 100, 10);
  });

  it('sums to 100', () => {
    const result = computeAdvantageProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    const sum = result.categories.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 10);
  });
});

describe('computeDisadvantageProbabilities', () => {
  it('computes 3d6 keep lowest 2 with PbtA thresholds', () => {
    const result = computeDisadvantageProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    expect(result.categories).toHaveLength(3);
    expect(result.categories[0]).toBeCloseTo((147 / 216) * 100, 10);
    expect(result.categories[1]).toBeCloseTo((58 / 216) * 100, 10);
    expect(result.categories[2]).toBeCloseTo((11 / 216) * 100, 10);
  });

  it('sums to 100', () => {
    const result = computeDisadvantageProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    const sum = result.categories.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 10);
  });
});

describe('computeDoubleDiceProbabilities', () => {
  it('1d6 doubled matches normal 2d6', () => {
    const doubled = computeDoubleDiceProbabilities([{ sign: '+', count: 1, sides: 6 }], [7, 10], 0);
    const normal = computeNormalProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    expect(doubled.categories).toEqual(normal.categories);
  });

  it('1d6 doubled with modifier matches normal 2d6 with same modifier', () => {
    const doubled = computeDoubleDiceProbabilities([{ sign: '+', count: 1, sides: 6 }], [7, 10], 2);
    const normal = computeNormalProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 2);
    expect(doubled.categories).toEqual(normal.categories);
  });

  it('sums to 100', () => {
    const result = computeDoubleDiceProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    const sum = result.categories.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100, 10);
  });

  it('2d6 doubled produces 4d6 distribution', () => {
    const doubled = computeDoubleDiceProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    const normal = computeNormalProbabilities([{ sign: '+', count: 4, sides: 6 }], [7, 10], 0);
    expect(doubled.categories).toEqual(normal.categories);
  });

  it('critical detection works with doubled dice pool', () => {
    const result = computeDoubleDiceProbabilities([{ sign: '+', count: 1, sides: 6 }], [7, 10], 0, { type: 'doubles', color: '#f00', label: 'Crit' });
    const totalDoubles = result.critHitPerCategory.reduce((a, b) => a + b, 0);
    expect(totalDoubles).toBeGreaterThan(0);
    expect(result.categories.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });
});

describe('computeProbabilities', () => {
  it('dispatches to normal', () => {
    const direct = computeNormalProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    const dispatched = computeProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0, 'normal');
    expect(dispatched.categories).toEqual(direct.categories);
  });

  it('dispatches to advantage', () => {
    const direct = computeAdvantageProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    const dispatched = computeProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0, 'advantage');
    expect(dispatched.categories).toEqual(direct.categories);
  });

  it('dispatches to disadvantage', () => {
    const direct = computeDisadvantageProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    const dispatched = computeProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0, 'disadvantage');
    expect(dispatched.categories).toEqual(direct.categories);
  });
});

describe('computeProbabilities with method gating', () => {
  it('returns normal results when advantage method is none', () => {
    const normal = computeNormalProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    const result = computeProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0, 'advantage', { type: 'none' }, 'none');
    expect(result.categories).toEqual(normal.categories);
  });

  it('returns normal results when disadvantage method is none', () => {
    const normal = computeNormalProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    const result = computeProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0, 'disadvantage', { type: 'none' }, 'plus-one-drop-low', 'none');
    expect(result.categories).toEqual(normal.categories);
  });

  it('returns advantage results when advantage method is plus-one-drop-low', () => {
    const direct = computeAdvantageProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    const result = computeProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0, 'advantage', { type: 'none' }, 'plus-one-drop-low');
    expect(result.categories).toEqual(direct.categories);
  });

  it('returns disadvantage results when disadvantage method is plus-one-drop-high', () => {
    const direct = computeDisadvantageProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    const result = computeProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0, 'disadvantage', { type: 'none' }, 'plus-one-drop-low', 'plus-one-drop-high');
    expect(result.categories).toEqual(direct.categories);
  });

  it('dispatches to double-dice when advantage method is double-dice', () => {
    const direct = computeDoubleDiceProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    const result = computeProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0, 'advantage', { type: 'none' }, 'double-dice');
    expect(result.categories).toEqual(direct.categories);
  });
});

describe('computeNormalProbabilities with criticals', () => {
  it('returns ProbabilityResult with zero crit arrays when criticals is none', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0, { type: 'none' });
    expect(result.categories).toHaveLength(3);
    expect(result.categories[0]).toBeCloseTo((15 / 36) * 100, 10);
    expect(result.categories[1]).toBeCloseTo((15 / 36) * 100, 10);
    expect(result.categories[2]).toBeCloseTo((6 / 36) * 100, 10);
    expect(result.critHitPerCategory).toEqual([0, 0, 0]);
    expect(result.critMissPerCategory).toEqual([0, 0, 0]);
  });
});

describe('natural roll criticals', () => {
  it('1d20 nat 20 hit / nat 1 miss at mod 0', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 1, sides: 20 }], [5, 10, 15, 20, 25, 30], 0, { type: 'natural', hit: 20, miss: 1 });
    expect(result.critHitPerCategory[4]).toBeCloseTo(5, 10); // nat 20 → Hard
    expect(result.critMissPerCategory[0]).toBeCloseTo(5, 10); // nat 1 → Trivial
    expect(result.critHitPerCategory[0]).toBe(0);
    expect(result.critMissPerCategory[4]).toBe(0);
  });

  it('1d20 nat crits migrate with modifier', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 1, sides: 20 }], [5, 10, 15, 20, 25, 30], 5, { type: 'natural', hit: 20, miss: 1 });
    expect(result.critHitPerCategory[5]).toBeCloseTo(5, 10); // nat 20 → value 25 → Very Hard
    expect(result.critMissPerCategory[1]).toBeCloseTo(5, 10); // nat 1 → value 6 → Very Easy
  });

  it('2d10 nat 20 only triggers on [10,10], nat 2 on [1,1]', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 2, sides: 10 }], [11, 16], 0, { type: 'natural', hit: 20, miss: 2 });
    expect(result.critHitPerCategory[2]).toBeCloseTo(1, 10); // 1/100
    expect(result.critMissPerCategory[0]).toBeCloseTo(1, 10); // 1/100
  });

  it('impossible miss value yields 0 crit miss', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0, { type: 'natural', hit: 12, miss: 1 });
    expect(result.critMissPerCategory.every(v => v === 0)).toBe(true);
    expect(result.critHitPerCategory[2]).toBeCloseTo((1 / 36) * 100, 10);
  });

  it('categories still sum to 100', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 1, sides: 20 }], [5, 10, 15, 20, 25, 30], 0, { type: 'natural', hit: 20, miss: 1 });
    expect(result.categories.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });
});

describe('conditional-doubles criticals', () => {
  it('2d6 doubles in Miss (cat 0) and Strong Hit (cat 2)', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0, { type: 'conditional-doubles', hit: 2, miss: 0 });
    expect(result.critMissPerCategory[0]).toBeCloseTo((3 / 36) * 100, 10); // (1,1),(2,2),(3,3)
    expect(result.critHitPerCategory[2]).toBeCloseTo((2 / 36) * 100, 10); // (5,5),(6,6)
    expect(result.critHitPerCategory[1]).toBe(0);
    expect(result.critMissPerCategory[1]).toBe(0);
  });

  it('2d6 with modifier shifts which doubles land in crit zones', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 3, { type: 'conditional-doubles', hit: 2, miss: 0 });
    expect(result.critMissPerCategory[0]).toBeCloseTo((1 / 36) * 100, 10); // only (1,1)=5 ≤6
    expect(result.critHitPerCategory[2]).toBeCloseTo((3 / 36) * 100, 10); // (4,4)=11,(5,5)=13,(6,6)=15
  });

  it('3d6 detects any-pair among all dice', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 3, sides: 6 }], [7, 10], 0, { type: 'conditional-doubles', hit: 2, miss: 0 });
    expect(result.critHitPerCategory[2]).toBeGreaterThan(0);
    expect(result.critMissPerCategory[0]).toBeGreaterThan(0);
    expect(result.categories.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });

  it('categories still sum to 100', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0, { type: 'conditional-doubles', hit: 2, miss: 0 });
    expect(result.categories.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });
});

describe('unconditional doubles criticals', () => {
  it('2d6 counts all doubles across categories', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0, { type: 'doubles', color: '#ff0000', label: 'Crit' });
    expect(result.critHitPerCategory[0]).toBeCloseTo((3 / 36) * 100, 10); // (1,1),(2,2),(3,3) in Miss
    expect(result.critHitPerCategory[1]).toBeCloseTo((1 / 36) * 100, 10); // (4,4) in Weak Hit
    expect(result.critHitPerCategory[2]).toBeCloseTo((2 / 36) * 100, 10); // (5,5),(6,6) in Strong Hit
    expect(result.critMissPerCategory).toEqual([0, 0, 0]);
  });

  it('total doubles percentage is correct', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0, { type: 'doubles', color: '#ff0000', label: 'Crit' });
    const total = result.critHitPerCategory.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo((6 / 36) * 100, 10);
  });

  it('categories still sum to 100', () => {
    const result = computeNormalProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0, { type: 'doubles', color: '#ff0000', label: 'Crit' });
    expect(result.categories.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });
});

describe('conditional-doubles forcing with advantage', () => {
  it('advantage forces doubles when they land in hit category', () => {
    // Use hit: 1 (middle category) so forcing can pull outcomes down from higher categories
    const withCrit = computeAdvantageProbabilities([{ sign: '+', count: 2, sides: 6 }], [3, 7], 0, { type: 'conditional-doubles', hit: 1, miss: 0 });
    const noCrit = computeAdvantageProbabilities([{ sign: '+', count: 2, sides: 6 }], [3, 7], 0);
    expect(withCrit.critHitPerCategory[1]).toBeGreaterThan(0);
    // Category distributions should differ due to forcing
    expect(withCrit.categories).not.toEqual(noCrit.categories);
    expect(withCrit.categories.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });

  it('disadvantage forces doubles when they land in miss category', () => {
    // Use miss: 1 (middle category) so forcing can push outcomes up from lower categories
    const withCrit = computeDisadvantageProbabilities([{ sign: '+', count: 2, sides: 6 }], [3, 7], 0, { type: 'conditional-doubles', hit: 2, miss: 1 });
    expect(withCrit.critMissPerCategory[1]).toBeGreaterThan(0);
    expect(withCrit.categories.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });

  it('unconditional doubles does NOT use forcing', () => {
    const withDoubles = computeAdvantageProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0, { type: 'doubles', color: '#f00', label: 'Crit' });
    const noCrit = computeAdvantageProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0);
    for (let i = 0; i < noCrit.categories.length; i++) {
      expect(withDoubles.categories[i]).toBeCloseTo(noCrit.categories[i], 10);
    }
  });

  it('disadvantage with unconditional doubles uses keepDropHighest', () => {
    const result = computeDisadvantageProbabilities([{ sign: '+', count: 2, sides: 6 }], [7, 10], 0, { type: 'doubles', color: '#f00', label: 'Crit' });
    // 3d6 keep lowest 2: doubles detected in the kept pair
    const totalDoubles = result.critHitPerCategory.reduce((a, b) => a + b, 0);
    expect(totalDoubles).toBeGreaterThan(0);
    expect(result.categories.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
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

describe('parseDiceExpression', () => {
  it('parses a single positive term', () => {
    expect(parseDiceExpression('2d6')).toEqual([{ sign: '+', count: 2, sides: 6 }]);
  });

  it('parses a single term with explicit leading +', () => {
    expect(parseDiceExpression('+2d6')).toEqual([{ sign: '+', count: 2, sides: 6 }]);
  });

  it('parses two terms with subtraction', () => {
    expect(parseDiceExpression('2d10 - 1d4')).toEqual([
      { sign: '+', count: 2, sides: 10 },
      { sign: '-', count: 1, sides: 4 },
    ]);
  });

  it('parses two terms with addition', () => {
    expect(parseDiceExpression('2d10 + 1d6')).toEqual([
      { sign: '+', count: 2, sides: 10 },
      { sign: '+', count: 1, sides: 6 },
    ]);
  });

  it('parses three terms with mixed signs', () => {
    expect(parseDiceExpression('2d10 + 1d6 - 1d4')).toEqual([
      { sign: '+', count: 2, sides: 10 },
      { sign: '+', count: 1, sides: 6 },
      { sign: '-', count: 1, sides: 4 },
    ]);
  });

  it('tolerates extra whitespace around operators and ends', () => {
    expect(parseDiceExpression('   2d10  -  1d4  ')).toEqual([
      { sign: '+', count: 2, sides: 10 },
      { sign: '-', count: 1, sides: 4 },
    ]);
  });

  it('accepts uppercase D', () => {
    expect(parseDiceExpression('2D6')).toEqual([{ sign: '+', count: 2, sides: 6 }]);
  });

  it('rejects a leading minus', () => {
    expect(parseDiceExpression('-2d6')).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(parseDiceExpression('')).toBeNull();
    expect(parseDiceExpression('foo')).toBeNull();
    expect(parseDiceExpression('2d')).toBeNull();
    expect(parseDiceExpression('d6')).toBeNull();
    expect(parseDiceExpression('2d6 +')).toBeNull();
    expect(parseDiceExpression('2d6 1d4')).toBeNull();
    expect(parseDiceExpression('2d6 * 1d4')).toBeNull();
  });

  it('rejects sides < 2 and count < 1', () => {
    expect(parseDiceExpression('0d6')).toBeNull();
    expect(parseDiceExpression('2d1')).toBeNull();
  });
});

describe('formatDiceExpression', () => {
  it('formats a single term without leading sign', () => {
    expect(formatDiceExpression([{ sign: '+', count: 2, sides: 6 }])).toBe('2d6');
  });

  it('formats two terms with single spaces around operator', () => {
    expect(formatDiceExpression([
      { sign: '+', count: 2, sides: 10 },
      { sign: '-', count: 1, sides: 4 },
    ])).toBe('2d10 - 1d4');
  });

  it('formats three terms with mixed signs', () => {
    expect(formatDiceExpression([
      { sign: '+', count: 2, sides: 10 },
      { sign: '+', count: 1, sides: 6 },
      { sign: '-', count: 1, sides: 4 },
    ])).toBe('2d10 + 1d6 - 1d4');
  });

  it('round-trips through parseDiceExpression', () => {
    const inputs = ['2d6', '2d10 - 1d4', '2d10 + 1d6 - 1d4', '1d20'];
    for (const input of inputs) {
      const parsed = parseDiceExpression(input);
      expect(parsed).not.toBeNull();
      expect(formatDiceExpression(parsed!)).toBe(input);
    }
  });
});

describe('multi-term computation', () => {
  it('2d10 - 1d4 sums correctly across terms', () => {
    // For thresholds [10, 16] and modifier 0:
    // total = sum(2d10) - 1d4. Range is 1..19.
    const result = computeNormalProbabilities(
      [{ sign: '+', count: 2, sides: 10 }, { sign: '-', count: 1, sides: 4 }],
      [10, 16], 0,
    );
    // Total outcomes: 10*10*4 = 400
    let belowOrEqual9 = 0;
    let between10And15 = 0;
    let atLeast16 = 0;
    for (let a = 1; a <= 10; a++) {
      for (let b = 1; b <= 10; b++) {
        for (let c = 1; c <= 4; c++) {
          const total = a + b - c;
          if (total < 10) belowOrEqual9++;
          else if (total < 16) between10And15++;
          else atLeast16++;
        }
      }
    }
    expect(result.categories[0]).toBeCloseTo(belowOrEqual9 / 400 * 100, 10);
    expect(result.categories[1]).toBeCloseTo(between10And15 / 400 * 100, 10);
    expect(result.categories[2]).toBeCloseTo(atLeast16 / 400 * 100, 10);
  });

  it('advantage applies only to the first term', () => {
    // Advantage: extra die in first group, drop lowest first-group die.
    // Second term unaffected.
    const result = computeAdvantageProbabilities(
      [{ sign: '+', count: 2, sides: 6 }, { sign: '-', count: 1, sides: 4 }],
      [7, 10], 0,
    );
    // Hand-compute: enumerate 6^3 * 4 = 864 outcomes.
    // First group: drop lowest of 3d6, take sum of top 2.
    // Subtract the 1d4 roll.
    let buckets = [0, 0, 0];
    for (let a = 1; a <= 6; a++) {
      for (let b = 1; b <= 6; b++) {
        for (let c = 1; c <= 6; c++) {
          for (let d = 1; d <= 4; d++) {
            const sorted = [a, b, c].sort((x, y) => x - y);
            const fg = sorted[1] + sorted[2];
            const total = fg - d;
            if (total < 7) buckets[0]++;
            else if (total < 10) buckets[1]++;
            else buckets[2]++;
          }
        }
      }
    }
    expect(result.categories[0]).toBeCloseTo(buckets[0] / 864 * 100, 10);
    expect(result.categories[1]).toBeCloseTo(buckets[1] / 864 * 100, 10);
    expect(result.categories[2]).toBeCloseTo(buckets[2] / 864 * 100, 10);
  });

  it('natural crit reads first-group raw sum only', () => {
    // 2d6 - 1d4 with natural crit at hit=12 (max of 2d6).
    // Crit hit fires when first group sums to 12 — independent of d4 roll.
    const result = computeNormalProbabilities(
      [{ sign: '+', count: 2, sides: 6 }, { sign: '-', count: 1, sides: 4 }],
      [7, 10], 0,
      { type: 'natural', hit: 12, miss: 2 },
    );
    // Probability of 2d6 = 12 is 1/36. Times 4 (any d4) = 4/144 = 1/36.
    const totalCritHit = result.critHitPerCategory.reduce((a, b) => a + b, 0);
    expect(totalCritHit).toBeCloseTo(1 / 36 * 100, 10);
  });

  it('conditional-doubles requires first-group doubles AND target category', () => {
    // 2d6 - 1d4 with hit category at index 2 (>=10), conditional doubles.
    // Must have doubles AND total >= 10.
    const result = computeNormalProbabilities(
      [{ sign: '+', count: 2, sides: 6 }, { sign: '-', count: 1, sides: 4 }],
      [7, 10], 0,
      { type: 'conditional-doubles', hit: 2, miss: 0 },
    );
    // Hand count: pairs (a,a) with a∈{1..6}, d∈{1..4}, total = 2a - d >= 10
    let critHit = 0;
    for (let a = 1; a <= 6; a++) {
      for (let d = 1; d <= 4; d++) {
        if (2 * a - d >= 10) critHit++;
      }
    }
    const totalCritHit = result.critHitPerCategory.reduce((a, b) => a + b, 0);
    expect(totalCritHit).toBeCloseTo(critHit / (36 * 4) * 100, 10);
  });
});
