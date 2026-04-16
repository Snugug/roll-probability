import { parseDiceNotation } from './engine';

export interface ThresholdCategory {
  label: string;
  color: string;
}

export interface ThresholdPreset {
  name: string;
  referenceDie: string;
  thresholds: number[];
  categories: ThresholdCategory[];
}

export interface DiceConfig {
  count: number;
  sides: number;
  label: string;
  thresholds: number[];
  categories: ThresholdCategory[];
}

export const PBTA_PRESET: ThresholdPreset = {
  name: 'PbtA',
  referenceDie: '2d6',
  thresholds: [7, 10],
  categories: [
    { label: 'Miss', color: '#f87171' },
    { label: 'Weak Hit', color: '#facc15' },
    { label: 'Strong Hit', color: '#4ade80' },
  ],
};

export const DND_PRESET: ThresholdPreset = {
  name: 'D&D',
  referenceDie: '1d20',
  thresholds: [5, 10, 15, 20, 25, 30],
  categories: [
    { label: 'Trivial', color: '#94a3b8' },
    { label: 'Very Easy', color: '#4ade80' },
    { label: 'Easy', color: '#22d3ee' },
    { label: 'Medium', color: '#facc15' },
    { label: 'Hard', color: '#f97316' },
    { label: 'Very Hard', color: '#ef4444' },
    { label: 'Nearly Impossible', color: '#a855f7' },
  ],
};

export const BUILTIN_PRESETS: ThresholdPreset[] = [PBTA_PRESET, DND_PRESET];

export function mapThresholds(
  preset: ThresholdPreset,
  targetCount: number,
  targetSides: number
): number[] {
  const ref = parseDiceNotation(preset.referenceDie);
  if (!ref) return preset.thresholds;

  const refMin = ref.count;
  const refMax = ref.count * ref.sides;
  const refRange = refMax - refMin;

  const targetMin = targetCount;
  const targetMax = targetCount * targetSides;
  const targetRange = targetMax - targetMin;

  if (refRange === 0) return preset.thresholds;

  return preset.thresholds.map(t => {
    return targetMin + Math.round(((t - refMin) / refRange) * targetRange);
  });
}
