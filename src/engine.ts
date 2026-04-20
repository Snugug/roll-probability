export type RollMode = 'normal' | 'advantage' | 'disadvantage';
export type AdvantageMethod = 'none' | 'plus-one-drop-low' | 'double-dice';
export type DisadvantageMethod = 'none' | 'plus-one-drop-high';

export type CriticalConfig =
  | { type: 'none' }
  | { type: 'natural'; hit: number; miss: number }
  | { type: 'conditional-doubles'; hit: number; miss: number }
  | { type: 'doubles'; color: string; label: string };

export interface ProbabilityResult {
  categories: number[];
  critHitPerCategory: number[];
  critMissPerCategory: number[];
}

function hasDoubles(kept: number[]): boolean {
  for (let i = 0; i < kept.length; i++) {
    for (let j = i + 1; j < kept.length; j++) {
      if (kept[i] === kept[j]) return true;
    }
  }
  return false;
}

function keepAll(dice: number[]): number[] {
  return [...dice];
}

function keepDropLowest(dice: number[]): number[] {
  const sorted = [...dice].sort((a, b) => a - b);
  return sorted.slice(1);
}

function keepDropHighest(dice: number[]): number[] {
  const sorted = [...dice].sort((a, b) => a - b);
  return sorted.slice(0, -1);
}

function classifyValue(val: number, thresholds: number[]): number {
  let cat = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (val >= thresholds[i]) cat = i + 1;
  }
  return cat;
}

function classifyOutcomes(
  numDice: number,
  sides: number,
  thresholds: number[],
  modifier: number,
  sumFn: (dice: number[]) => number,
  criticals: CriticalConfig = { type: 'none' },
  keptDiceFn: (dice: number[]) => number[] = keepAll
): ProbabilityResult {
  const numCategories = thresholds.length + 1;
  const counts = new Array<number>(numCategories).fill(0);
  const critHitCounts = new Array<number>(numCategories).fill(0);
  const critMissCounts = new Array<number>(numCategories).fill(0);
  let total = 0;
  const dice = new Array<number>(numDice);

  function recurse(depth: number): void {
    if (depth === numDice) {
      total++;
      const rawSum = sumFn(dice);
      const sum = rawSum + modifier;
      const catIndex = classifyValue(sum, thresholds);
      counts[catIndex]++;

      if (criticals.type === 'natural') {
        if (rawSum === criticals.hit) critHitCounts[catIndex]++;
        if (rawSum === criticals.miss) critMissCounts[catIndex]++;
      } else if (criticals.type === 'conditional-doubles') {
        const kept = keptDiceFn(dice);
        if (hasDoubles(kept)) {
          if (catIndex === criticals.hit) critHitCounts[catIndex]++;
          if (catIndex === criticals.miss) critMissCounts[catIndex]++;
        }
      } else if (criticals.type === 'doubles') {
        const kept = keptDiceFn(dice);
        if (hasDoubles(kept)) {
          critHitCounts[catIndex]++;
        }
      }

      return;
    }
    for (let v = 1; v <= sides; v++) {
      dice[depth] = v;
      recurse(depth + 1);
    }
  }

  recurse(0);

  return {
    categories: counts.map(c => (c / total) * 100),
    critHitPerCategory: critHitCounts.map(c => (c / total) * 100),
    critMissPerCategory: critMissCounts.map(c => (c / total) * 100),
  };
}

function sumAll(dice: number[]): number {
  let s = 0;
  for (let i = 0; i < dice.length; i++) s += dice[i];
  return s;
}

function sumDropLowest(dice: number[]): number {
  let s = 0;
  let min = dice[0];
  for (let i = 0; i < dice.length; i++) {
    s += dice[i];
    if (dice[i] < min) min = dice[i];
  }
  return s - min;
}

function sumDropHighest(dice: number[]): number {
  let s = 0;
  let max = dice[0];
  for (let i = 0; i < dice.length; i++) {
    s += dice[i];
    if (dice[i] > max) max = dice[i];
  }
  return s - max;
}

export function computeNormalProbabilities(
  count: number, sides: number, thresholds: number[], modifier: number,
  criticals: CriticalConfig = { type: 'none' }
): ProbabilityResult {
  return classifyOutcomes(count, sides, thresholds, modifier, sumAll, criticals);
}

function makeForcingFns(
  thresholds: number[],
  modifier: number,
  targetCat: number,
  standardSlice: (sorted: number[]) => number[],
  sentinel: number,
  isBetter: (altSum: number, best: number) => boolean,
  hasFallback: (best: number) => boolean
): { sumFn: (dice: number[]) => number; keptFn: (dice: number[]) => number[] } {
  function evaluate(dice: number[]): { sum: number; kept: number[] } {
    const sorted = [...dice].sort((a, b) => a - b);
    const standardKept = standardSlice(sorted);
    const standardSum = standardKept.reduce((a, b) => a + b, 0);

    let bestAlt = sentinel;
    let bestKept = standardKept;
    for (let drop = 0; drop < dice.length; drop++) {
      const kept = sorted.filter((_, i) => i !== drop);
      if (!hasDoubles(kept)) continue;
      const altSum = kept.reduce((a, b) => a + b, 0);
      const altCat = classifyValue(altSum + modifier, thresholds);
      if (altCat === targetCat && isBetter(altSum, bestAlt)) {
        bestAlt = altSum;
        bestKept = kept;
      }
    }

    return hasFallback(bestAlt)
      ? { sum: bestAlt, kept: bestKept }
      : { sum: standardSum, kept: standardKept };
  }

  return {
    sumFn: (dice: number[]) => evaluate(dice).sum,
    keptFn: (dice: number[]) => evaluate(dice).kept,
  };
}

function makeForcingAdvFns(
  thresholds: number[], modifier: number, hitCat: number
): { sumFn: (dice: number[]) => number; keptFn: (dice: number[]) => number[] } {
  return makeForcingFns(
    thresholds, modifier, hitCat,
    sorted => sorted.slice(1),
    -1,
    (alt, best) => alt > best,
    best => best >= 0
  );
}

function makeForcingDisFns(
  thresholds: number[], modifier: number, missCat: number
): { sumFn: (dice: number[]) => number; keptFn: (dice: number[]) => number[] } {
  return makeForcingFns(
    thresholds, modifier, missCat,
    sorted => sorted.slice(0, -1),
    Infinity,
    (alt, best) => alt < best,
    best => best < Infinity
  );
}

export function computeAdvantageProbabilities(
  count: number, sides: number, thresholds: number[], modifier: number,
  criticals: CriticalConfig = { type: 'none' }
): ProbabilityResult {
  if (criticals.type === 'conditional-doubles') {
    const { sumFn, keptFn } = makeForcingAdvFns(thresholds, modifier, criticals.hit);
    return classifyOutcomes(count + 1, sides, thresholds, modifier, sumFn, criticals, keptFn);
  }
  return classifyOutcomes(count + 1, sides, thresholds, modifier, sumDropLowest, criticals, keepDropLowest);
}

export function computeDisadvantageProbabilities(
  count: number, sides: number, thresholds: number[], modifier: number,
  criticals: CriticalConfig = { type: 'none' }
): ProbabilityResult {
  if (criticals.type === 'conditional-doubles') {
    const { sumFn, keptFn } = makeForcingDisFns(thresholds, modifier, criticals.miss);
    return classifyOutcomes(count + 1, sides, thresholds, modifier, sumFn, criticals, keptFn);
  }
  return classifyOutcomes(count + 1, sides, thresholds, modifier, sumDropHighest, criticals, keepDropHighest);
}

export function computeDoubleDiceProbabilities(
  count: number, sides: number, thresholds: number[], modifier: number,
  criticals: CriticalConfig = { type: 'none' }
): ProbabilityResult {
  return classifyOutcomes(count * 2, sides, thresholds, modifier, sumAll, criticals);
}

export function computeProbabilities(
  count: number, sides: number, thresholds: number[], modifier: number, mode: RollMode,
  criticals: CriticalConfig = { type: 'none' },
  advantageMethod: AdvantageMethod = 'plus-one-drop-low',
  disadvantageMethod: DisadvantageMethod = 'plus-one-drop-high',
): ProbabilityResult {
  switch (mode) {
    case 'normal':
      return computeNormalProbabilities(count, sides, thresholds, modifier, criticals);
    case 'advantage':
      if (advantageMethod === 'none') return computeNormalProbabilities(count, sides, thresholds, modifier, criticals);
      if (advantageMethod === 'double-dice') return computeDoubleDiceProbabilities(count, sides, thresholds, modifier, criticals);
      return computeAdvantageProbabilities(count, sides, thresholds, modifier, criticals);
    case 'disadvantage':
      if (disadvantageMethod === 'none') return computeNormalProbabilities(count, sides, thresholds, modifier, criticals);
      return computeDisadvantageProbabilities(count, sides, thresholds, modifier, criticals);
  }
}

export function parseDiceNotation(input: string): { count: number; sides: number } | null {
  const match = input.trim().match(/^(\d+)[dD](\d+)$/);
  if (!match) return null;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  if (count < 1 || sides < 2) return null;
  return { count, sides };
}
