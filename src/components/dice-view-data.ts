import { computeProbabilities, type RollMode } from '../engine';
import type { DiceConfig } from '../thresholds';
import type { SegmentData } from './stacked-bar';

export interface ModeResult {
  segments: SegmentData[];
  critHitPerCategory: number[];
  critMissPerCategory: number[];
}

export interface ModifierData {
  modifier: number;
  results: Partial<Record<RollMode, ModeResult>>;
}

export interface DiceView extends HTMLElement {
  update(
    data: ModifierData[],
    config: DiceConfig,
    showAdvantage: boolean,
    showDisadvantage: boolean,
  ): void;
}

export function computeViewData(
  config: DiceConfig,
  showAdvantage: boolean,
  showDisadvantage: boolean,
): ModifierData[] {
  const modes: Array<{ mode: RollMode; show: boolean }> = [
    { mode: 'disadvantage', show: showDisadvantage },
    { mode: 'normal', show: true },
    { mode: 'advantage', show: showAdvantage },
  ];

  const viewData: ModifierData[] = [];

  for (let mod = config.minMod; mod <= config.maxMod; mod++) {
    const results: Partial<Record<RollMode, ModeResult>> = {};

    for (const { mode, show } of modes) {
      if (!show) continue;
      const result = computeProbabilities(
        config.count, config.sides, config.thresholds,
        mod, mode, config.criticals,
      );
      results[mode] = {
        segments: result.categories.map((percent, i) => ({
          label: config.categories[i].label,
          color: config.categories[i].color,
          percent,
        })),
        critHitPerCategory: result.critHitPerCategory,
        critMissPerCategory: result.critMissPerCategory,
      };
    }

    viewData.push({ modifier: mod, results });
  }

  return viewData;
}
