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

export type DiceTermSign = '+' | '-';

export interface DiceTerm {
  sign: DiceTermSign;
  count: number;
  sides: number;
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
  terms: DiceTerm[],
  firstGroupCount: number,
  thresholds: number[],
  modifier: number,
  sumFn: (firstGroupDice: number[]) => number,
  criticals: CriticalConfig = { type: 'none' },
  keptDiceFn: (firstGroupDice: number[]) => number[] = keepAll
): ProbabilityResult {
  const numCategories = thresholds.length + 1;
  const counts = new Array<number>(numCategories).fill(0);
  const critHitCounts = new Array<number>(numCategories).fill(0);
  const critMissCounts = new Array<number>(numCategories).fill(0);
  let total = 0;

  const firstSides = terms[0].sides;
  const firstGroupDice = new Array<number>(firstGroupCount);
  const extraTerms = terms.slice(1);
  const extraDice: number[][] = extraTerms.map(t => new Array<number>(t.count));

  function recurseExtras(termIdx: number, dieIdx: number, extrasSum: number): void {
    if (termIdx >= extraTerms.length) {
      total++;
      const firstGroupSum = sumFn(firstGroupDice);
      const sum = firstGroupSum + extrasSum + modifier;
      const catIndex = classifyValue(sum, thresholds);
      counts[catIndex]++;

      if (criticals.type === 'natural') {
        let rawFirstSum = 0;
        for (let i = 0; i < firstGroupDice.length; i++) rawFirstSum += firstGroupDice[i];
        if (rawFirstSum === criticals.hit) critHitCounts[catIndex]++;
        if (rawFirstSum === criticals.miss) critMissCounts[catIndex]++;
      } else if (criticals.type === 'conditional-doubles') {
        const kept = keptDiceFn(firstGroupDice);
        if (hasDoubles(kept)) {
          if (catIndex === criticals.hit) critHitCounts[catIndex]++;
          if (catIndex === criticals.miss) critMissCounts[catIndex]++;
        }
      } else if (criticals.type === 'doubles') {
        const kept = keptDiceFn(firstGroupDice);
        if (hasDoubles(kept)) {
          critHitCounts[catIndex]++;
        }
      }
      return;
    }
    const term = extraTerms[termIdx];
    if (dieIdx === term.count) {
      let termSum = 0;
      for (let i = 0; i < term.count; i++) termSum += extraDice[termIdx][i];
      const signedTermSum = term.sign === '+' ? termSum : -termSum;
      recurseExtras(termIdx + 1, 0, extrasSum + signedTermSum);
      return;
    }
    for (let v = 1; v <= term.sides; v++) {
      extraDice[termIdx][dieIdx] = v;
      recurseExtras(termIdx, dieIdx + 1, extrasSum);
    }
  }

  function recurseFirst(depth: number): void {
    if (depth === firstGroupCount) {
      recurseExtras(0, 0, 0);
      return;
    }
    for (let v = 1; v <= firstSides; v++) {
      firstGroupDice[depth] = v;
      recurseFirst(depth + 1);
    }
  }

  recurseFirst(0);

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
  terms: DiceTerm[], thresholds: number[], modifier: number,
  criticals: CriticalConfig = { type: 'none' }
): ProbabilityResult {
  return classifyOutcomes(terms, terms[0].count, thresholds, modifier, sumAll, criticals);
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
  terms: DiceTerm[], thresholds: number[], modifier: number,
  criticals: CriticalConfig = { type: 'none' }
): ProbabilityResult {
  if (criticals.type === 'conditional-doubles') {
    const { sumFn, keptFn } = makeForcingAdvFns(thresholds, modifier, criticals.hit);
    return classifyOutcomes(terms, terms[0].count + 1, thresholds, modifier, sumFn, criticals, keptFn);
  }
  return classifyOutcomes(terms, terms[0].count + 1, thresholds, modifier, sumDropLowest, criticals, keepDropLowest);
}

export function computeDisadvantageProbabilities(
  terms: DiceTerm[], thresholds: number[], modifier: number,
  criticals: CriticalConfig = { type: 'none' }
): ProbabilityResult {
  if (criticals.type === 'conditional-doubles') {
    const { sumFn, keptFn } = makeForcingDisFns(thresholds, modifier, criticals.miss);
    return classifyOutcomes(terms, terms[0].count + 1, thresholds, modifier, sumFn, criticals, keptFn);
  }
  return classifyOutcomes(terms, terms[0].count + 1, thresholds, modifier, sumDropHighest, criticals, keepDropHighest);
}

export function computeDoubleDiceProbabilities(
  terms: DiceTerm[], thresholds: number[], modifier: number,
  criticals: CriticalConfig = { type: 'none' }
): ProbabilityResult {
  return classifyOutcomes(terms, terms[0].count * 2, thresholds, modifier, sumAll, criticals);
}

export function computeProbabilities(
  terms: DiceTerm[], thresholds: number[], modifier: number, mode: RollMode,
  criticals: CriticalConfig = { type: 'none' },
  advantageMethod: AdvantageMethod = 'plus-one-drop-low',
  disadvantageMethod: DisadvantageMethod = 'plus-one-drop-high',
): ProbabilityResult {
  switch (mode) {
    case 'normal':
      return computeNormalProbabilities(terms, thresholds, modifier, criticals);
    case 'advantage':
      if (advantageMethod === 'none') return computeNormalProbabilities(terms, thresholds, modifier, criticals);
      if (advantageMethod === 'double-dice') return computeDoubleDiceProbabilities(terms, thresholds, modifier, criticals);
      return computeAdvantageProbabilities(terms, thresholds, modifier, criticals);
    case 'disadvantage':
      if (disadvantageMethod === 'none') return computeNormalProbabilities(terms, thresholds, modifier, criticals);
      return computeDisadvantageProbabilities(terms, thresholds, modifier, criticals);
  }
}

const TERM_PATTERN = /^(\d+)[dD](\d+)$/;

export function parseDiceExpression(input: string): DiceTerm[] | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Split by + and -, keeping the operators. Reject any other characters.
  const tokens: string[] = [];
  let buffer = '';
  let firstSign: '+' | undefined = undefined;

  let i = 0;
  // Optional leading '+' (a leading '-' is rejected)
  if (trimmed[0] === '+') {
    firstSign = '+';
    i = 1;
  } else if (trimmed[0] === '-') {
    return null;
  }

  for (; i < trimmed.length; i++) {
    const c = trimmed[i];
    if (c === '+' || c === '-') {
      tokens.push(buffer);
      buffer = '';
      tokens.push(c);
    } else {
      buffer += c;
    }
  }
  tokens.push(buffer);

  const terms: DiceTerm[] = [];
  // First token is the first term (no preceding operator in tokens array).
  const firstTermStr = tokens[0].trim();
  if (!firstTermStr) return null;
  const firstMatch = firstTermStr.match(TERM_PATTERN);
  if (!firstMatch) return null;
  const firstCount = parseInt(firstMatch[1], 10);
  const firstSides = parseInt(firstMatch[2], 10);
  if (firstCount < 1 || firstSides < 2) return null;
  terms.push({ sign: firstSign ?? '+', count: firstCount, sides: firstSides });

  // Remaining tokens come in (operator, term) pairs.
  for (let j = 1; j < tokens.length; j += 2) {
    const op = tokens[j];
    const termStr = (tokens[j + 1] ?? '').trim();
    if (!termStr) return null;
    if (op !== '+' && op !== '-') return null;
    const m = termStr.match(TERM_PATTERN);
    if (!m) return null;
    const count = parseInt(m[1], 10);
    const sides = parseInt(m[2], 10);
    if (count < 1 || sides < 2) return null;
    terms.push({ sign: op, count, sides });
  }

  return terms;
}

export function formatDiceExpression(terms: DiceTerm[]): string {
  if (terms.length === 0) return '';
  let out = terms[0].count + 'd' + terms[0].sides;
  for (let k = 1; k < terms.length; k++) {
    out += ' ' + terms[k].sign + ' ' + terms[k].count + 'd' + terms[k].sides;
  }
  return out;
}

export function parseDiceNotation(input: string): { count: number; sides: number } | null {
  const terms = parseDiceExpression(input);
  if (!terms || terms.length !== 1 || terms[0].sign !== '+') return null;
  return { count: terms[0].count, sides: terms[0].sides };
}
