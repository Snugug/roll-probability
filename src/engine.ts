export interface ProbabilityResult {
  miss: number;
  weakHit: number;
  strongHit: number;
}

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface DiceThresholds {
  missMax: number;
  weakMax: number;
}

export interface DiceConfig {
  count: number;
  sides: number;
  label: string;
  missMax: number;
  weakMax: number;
}

function classifyOutcomes(
  numDice: number,
  sides: number,
  missMax: number,
  weakMax: number,
  modifier: number,
  sumFn: (dice: number[]) => number
): ProbabilityResult {
  let missCount = 0;
  let weakCount = 0;
  let strongCount = 0;
  let total = 0;
  const dice = new Array<number>(numDice);

  function recurse(depth: number): void {
    if (depth === numDice) {
      total++;
      const sum = sumFn(dice) + modifier;
      if (sum <= missMax) missCount++;
      else if (sum <= weakMax) weakCount++;
      else strongCount++;
      return;
    }
    for (let v = 1; v <= sides; v++) {
      dice[depth] = v;
      recurse(depth + 1);
    }
  }

  recurse(0);

  return {
    miss: (missCount / total) * 100,
    weakHit: (weakCount / total) * 100,
    strongHit: (strongCount / total) * 100,
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
  count: number,
  sides: number,
  missMax: number,
  weakMax: number,
  modifier: number
): ProbabilityResult {
  return classifyOutcomes(count, sides, missMax, weakMax, modifier, sumAll);
}

export function computeAdvantageProbabilities(
  count: number,
  sides: number,
  missMax: number,
  weakMax: number,
  modifier: number
): ProbabilityResult {
  return classifyOutcomes(count + 1, sides, missMax, weakMax, modifier, sumDropLowest);
}

export function computeDisadvantageProbabilities(
  count: number,
  sides: number,
  missMax: number,
  weakMax: number,
  modifier: number
): ProbabilityResult {
  return classifyOutcomes(count + 1, sides, missMax, weakMax, modifier, sumDropHighest);
}

export function computeProbabilities(
  count: number,
  sides: number,
  missMax: number,
  weakMax: number,
  modifier: number,
  mode: RollMode
): ProbabilityResult {
  switch (mode) {
    case 'normal':
      return computeNormalProbabilities(count, sides, missMax, weakMax, modifier);
    case 'advantage':
      return computeAdvantageProbabilities(count, sides, missMax, weakMax, modifier);
    case 'disadvantage':
      return computeDisadvantageProbabilities(count, sides, missMax, weakMax, modifier);
  }
}

export function computeOptimalThresholds(
  count: number,
  sides: number,
  baselineMiss: number,
  baselineWeak: number,
  baselineStrong: number
): DiceThresholds {
  const minSum = count;
  const maxSum = count * sides;
  let bestDeviation = Infinity;
  let bestMissMax = 0;
  let bestWeakMax = 0;

  for (let missMax = minSum; missMax < maxSum; missMax++) {
    for (let weakMax = missMax + 1; weakMax < maxSum; weakMax++) {
      const result = computeNormalProbabilities(count, sides, missMax, weakMax, 0);
      const deviation =
        Math.abs(result.miss - baselineMiss) +
        Math.abs(result.weakHit - baselineWeak) +
        Math.abs(result.strongHit - baselineStrong);

      if (deviation < bestDeviation) {
        bestDeviation = deviation;
        bestMissMax = missMax;
        bestWeakMax = weakMax;
      }
    }
  }

  return { missMax: bestMissMax, weakMax: bestWeakMax };
}

export function parseDiceNotation(input: string): { count: number; sides: number } | null {
  const match = input.trim().match(/^(\d+)[dD](\d+)$/);
  if (!match) return null;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  if (count < 1 || sides < 2) return null;
  return { count, sides };
}
