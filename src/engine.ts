export type RollMode = 'normal' | 'advantage' | 'disadvantage';

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
      let catIndex = 0;
      for (let i = 0; i < thresholds.length; i++) {
        if (sum >= thresholds[i]) {
          catIndex = i + 1;
        }
      }
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

function makeForcingAdvSumFn(
  count: number, thresholds: number[], modifier: number, hitCat: number
): (dice: number[]) => number {
  return (dice: number[]): number => {
    const sorted = [...dice].sort((a, b) => a - b);
    const standardKept = sorted.slice(1);
    const standardSum = standardKept.reduce((a, b) => a + b, 0);

    // Check all possible kept subsets of size `count` for doubles in hit category
    let bestAlt = -1;
    for (let drop = 0; drop < dice.length; drop++) {
      const kept = sorted.filter((_, i) => i !== drop);
      if (!hasDoubles(kept)) continue;
      const altSum = kept.reduce((a, b) => a + b, 0);
      const altVal = altSum + modifier;
      let altCat = 0;
      for (let i = 0; i < thresholds.length; i++) {
        if (altVal >= thresholds[i]) altCat = i + 1;
      }
      if (altCat === hitCat && altSum > bestAlt) {
        bestAlt = altSum;
      }
    }

    return bestAlt >= 0 ? bestAlt : standardSum;
  };
}

function makeForcingAdvKeptFn(
  count: number, thresholds: number[], modifier: number, hitCat: number
): (dice: number[]) => number[] {
  return (dice: number[]): number[] => {
    const sorted = [...dice].sort((a, b) => a - b);
    const standardKept = sorted.slice(1);
    const standardSum = standardKept.reduce((a, b) => a + b, 0);

    let bestAlt = -1;
    let bestKept = standardKept;
    for (let drop = 0; drop < dice.length; drop++) {
      const kept = sorted.filter((_, i) => i !== drop);
      if (!hasDoubles(kept)) continue;
      const altSum = kept.reduce((a, b) => a + b, 0);
      const altVal = altSum + modifier;
      let altCat = 0;
      for (let i = 0; i < thresholds.length; i++) {
        if (altVal >= thresholds[i]) altCat = i + 1;
      }
      if (altCat === hitCat && altSum > bestAlt) {
        bestAlt = altSum;
        bestKept = kept;
      }
    }

    return bestAlt >= 0 ? bestKept : standardKept;
  };
}

function makeForcingDisSumFn(
  count: number, thresholds: number[], modifier: number, missCat: number
): (dice: number[]) => number {
  return (dice: number[]): number => {
    const sorted = [...dice].sort((a, b) => a - b);
    const standardKept = sorted.slice(0, -1);
    const standardSum = standardKept.reduce((a, b) => a + b, 0);

    let bestAlt = Infinity;
    for (let drop = 0; drop < dice.length; drop++) {
      const kept = sorted.filter((_, i) => i !== drop);
      if (!hasDoubles(kept)) continue;
      const altSum = kept.reduce((a, b) => a + b, 0);
      const altVal = altSum + modifier;
      let altCat = 0;
      for (let i = 0; i < thresholds.length; i++) {
        if (altVal >= thresholds[i]) altCat = i + 1;
      }
      if (altCat === missCat && altSum < bestAlt) {
        bestAlt = altSum;
      }
    }

    return bestAlt < Infinity ? bestAlt : standardSum;
  };
}

function makeForcingDisKeptFn(
  count: number, thresholds: number[], modifier: number, missCat: number
): (dice: number[]) => number[] {
  return (dice: number[]): number[] => {
    const sorted = [...dice].sort((a, b) => a - b);
    const standardKept = sorted.slice(0, -1);

    let bestAlt = Infinity;
    let bestKept = standardKept;
    for (let drop = 0; drop < dice.length; drop++) {
      const kept = sorted.filter((_, i) => i !== drop);
      if (!hasDoubles(kept)) continue;
      const altSum = kept.reduce((a, b) => a + b, 0);
      const altVal = altSum + modifier;
      let altCat = 0;
      for (let i = 0; i < thresholds.length; i++) {
        if (altVal >= thresholds[i]) altCat = i + 1;
      }
      if (altCat === missCat && altSum < bestAlt) {
        bestAlt = altSum;
        bestKept = kept;
      }
    }

    return bestAlt < Infinity ? bestKept : standardKept;
  };
}

export function computeAdvantageProbabilities(
  count: number, sides: number, thresholds: number[], modifier: number,
  criticals: CriticalConfig = { type: 'none' }
): ProbabilityResult {
  if (criticals.type === 'conditional-doubles') {
    const sumFn = makeForcingAdvSumFn(count, thresholds, modifier, criticals.hit);
    const keptFn = makeForcingAdvKeptFn(count, thresholds, modifier, criticals.hit);
    return classifyOutcomes(count + 1, sides, thresholds, modifier, sumFn, criticals, keptFn);
  }
  return classifyOutcomes(count + 1, sides, thresholds, modifier, sumDropLowest, criticals, keepDropLowest);
}

export function computeDisadvantageProbabilities(
  count: number, sides: number, thresholds: number[], modifier: number,
  criticals: CriticalConfig = { type: 'none' }
): ProbabilityResult {
  if (criticals.type === 'conditional-doubles') {
    const sumFn = makeForcingDisSumFn(count, thresholds, modifier, criticals.miss);
    const keptFn = makeForcingDisKeptFn(count, thresholds, modifier, criticals.miss);
    return classifyOutcomes(count + 1, sides, thresholds, modifier, sumFn, criticals, keptFn);
  }
  return classifyOutcomes(count + 1, sides, thresholds, modifier, sumDropHighest, criticals, keepDropHighest);
}

export function computeProbabilities(
  count: number, sides: number, thresholds: number[], modifier: number, mode: RollMode,
  criticals: CriticalConfig = { type: 'none' }
): ProbabilityResult {
  switch (mode) {
    case 'normal':
      return computeNormalProbabilities(count, sides, thresholds, modifier, criticals);
    case 'advantage':
      return computeAdvantageProbabilities(count, sides, thresholds, modifier, criticals);
    case 'disadvantage':
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
