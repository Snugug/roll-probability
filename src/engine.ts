export type RollMode = 'normal' | 'advantage' | 'disadvantage';

function classifyOutcomes(
  numDice: number,
  sides: number,
  thresholds: number[],
  modifier: number,
  sumFn: (dice: number[]) => number
): number[] {
  const numCategories = thresholds.length + 1;
  const counts = new Array<number>(numCategories).fill(0);
  let total = 0;
  const dice = new Array<number>(numDice);

  function recurse(depth: number): void {
    if (depth === numDice) {
      total++;
      const sum = sumFn(dice) + modifier;
      let catIndex = 0;
      for (let i = 0; i < thresholds.length; i++) {
        if (sum >= thresholds[i]) {
          catIndex = i + 1;
        }
      }
      counts[catIndex]++;
      return;
    }
    for (let v = 1; v <= sides; v++) {
      dice[depth] = v;
      recurse(depth + 1);
    }
  }

  recurse(0);

  return counts.map(c => (c / total) * 100);
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
  count: number, sides: number, thresholds: number[], modifier: number
): number[] {
  return classifyOutcomes(count, sides, thresholds, modifier, sumAll);
}

export function computeAdvantageProbabilities(
  count: number, sides: number, thresholds: number[], modifier: number
): number[] {
  return classifyOutcomes(count + 1, sides, thresholds, modifier, sumDropLowest);
}

export function computeDisadvantageProbabilities(
  count: number, sides: number, thresholds: number[], modifier: number
): number[] {
  return classifyOutcomes(count + 1, sides, thresholds, modifier, sumDropHighest);
}

export function computeProbabilities(
  count: number, sides: number, thresholds: number[], modifier: number, mode: RollMode
): number[] {
  switch (mode) {
    case 'normal':
      return computeNormalProbabilities(count, sides, thresholds, modifier);
    case 'advantage':
      return computeAdvantageProbabilities(count, sides, thresholds, modifier);
    case 'disadvantage':
      return computeDisadvantageProbabilities(count, sides, thresholds, modifier);
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
