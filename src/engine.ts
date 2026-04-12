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
