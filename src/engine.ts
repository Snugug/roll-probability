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
  sides: number;
  label: string;
  missMax: number;
  weakMax: number;
}

export function computeNormalProbabilities(
  sides: number,
  missMax: number,
  weakMax: number,
  modifier: number
): ProbabilityResult {
  let missCount = 0;
  let weakCount = 0;
  let strongCount = 0;
  const total = sides * sides;

  for (let d1 = 1; d1 <= sides; d1++) {
    for (let d2 = 1; d2 <= sides; d2++) {
      const sum = d1 + d2 + modifier;
      if (sum <= missMax) missCount++;
      else if (sum <= weakMax) weakCount++;
      else strongCount++;
    }
  }

  return {
    miss: (missCount / total) * 100,
    weakHit: (weakCount / total) * 100,
    strongHit: (strongCount / total) * 100,
  };
}

export function computeAdvantageProbabilities(
  sides: number,
  missMax: number,
  weakMax: number,
  modifier: number
): ProbabilityResult {
  let missCount = 0;
  let weakCount = 0;
  let strongCount = 0;
  const total = sides * sides * sides;

  for (let d1 = 1; d1 <= sides; d1++) {
    for (let d2 = 1; d2 <= sides; d2++) {
      for (let d3 = 1; d3 <= sides; d3++) {
        const min = Math.min(d1, d2, d3);
        const sum = d1 + d2 + d3 - min + modifier;
        if (sum <= missMax) missCount++;
        else if (sum <= weakMax) weakCount++;
        else strongCount++;
      }
    }
  }

  return {
    miss: (missCount / total) * 100,
    weakHit: (weakCount / total) * 100,
    strongHit: (strongCount / total) * 100,
  };
}

export function computeDisadvantageProbabilities(
  sides: number,
  missMax: number,
  weakMax: number,
  modifier: number
): ProbabilityResult {
  let missCount = 0;
  let weakCount = 0;
  let strongCount = 0;
  const total = sides * sides * sides;

  for (let d1 = 1; d1 <= sides; d1++) {
    for (let d2 = 1; d2 <= sides; d2++) {
      for (let d3 = 1; d3 <= sides; d3++) {
        const max = Math.max(d1, d2, d3);
        const sum = d1 + d2 + d3 - max + modifier;
        if (sum <= missMax) missCount++;
        else if (sum <= weakMax) weakCount++;
        else strongCount++;
      }
    }
  }

  return {
    miss: (missCount / total) * 100,
    weakHit: (weakCount / total) * 100,
    strongHit: (strongCount / total) * 100,
  };
}

export function computeProbabilities(
  sides: number,
  missMax: number,
  weakMax: number,
  modifier: number,
  mode: RollMode
): ProbabilityResult {
  switch (mode) {
    case 'normal':
      return computeNormalProbabilities(sides, missMax, weakMax, modifier);
    case 'advantage':
      return computeAdvantageProbabilities(sides, missMax, weakMax, modifier);
    case 'disadvantage':
      return computeDisadvantageProbabilities(sides, missMax, weakMax, modifier);
  }
}

export function computeOptimalThresholds(
  sides: number,
  baselineMiss: number,
  baselineWeak: number,
  baselineStrong: number
): DiceThresholds {
  const maxSum = sides * 2;
  let bestDeviation = Infinity;
  let bestMissMax = 0;
  let bestWeakMax = 0;

  for (let missMax = 2; missMax < maxSum; missMax++) {
    for (let weakMax = missMax + 1; weakMax < maxSum; weakMax++) {
      const result = computeNormalProbabilities(sides, missMax, weakMax, 0);
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
