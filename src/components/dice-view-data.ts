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

export type ColumnKind = 'category' | 'crit-miss' | 'crit-hit' | 'doubles';

export interface ColumnDescriptor {
  label: string;
  color: string;
  swatchClass: string;
  kind: ColumnKind;
  catIndex: number;
}

export function buildColumnDescriptors(config: DiceConfig): ColumnDescriptor[] {
  const { categories, thresholds, criticals } = config;
  const columns: ColumnDescriptor[] = [];

  const hasCritSwatches = criticals.type === 'natural' || criticals.type === 'conditional-doubles';
  const missBeforeCat = criticals.type === 'conditional-doubles' ? criticals.miss : -1;
  const hitAfterCat = criticals.type === 'conditional-doubles' ? criticals.hit : -1;
  const missCatColor = criticals.type === 'conditional-doubles' ? categories[criticals.miss]?.color ?? '#888' : '#888';
  const hitCatColor = criticals.type === 'conditional-doubles' ? categories[criticals.hit]?.color ?? '#888' : '#888';

  if (hasCritSwatches && criticals.type === 'natural') {
    columns.push({ label: 'Crit Miss', color: missCatColor, swatchClass: 'range-swatch-crit-miss', kind: 'crit-miss', catIndex: -1 });
  }

  for (let i = 0; i < categories.length; i++) {
    if (hasCritSwatches && i === missBeforeCat) {
      columns.push({ label: 'Crit Miss', color: missCatColor, swatchClass: 'range-swatch-crit-miss', kind: 'crit-miss', catIndex: -1 });
    }

    const cat = categories[i];
    let rangeText: string;
    if (i === 0) {
      rangeText = '\u2264' + (thresholds[0] - 1);
    } else if (i === categories.length - 1) {
      rangeText = thresholds[i - 1] + '+';
    } else {
      rangeText = thresholds[i - 1] + '\u2013' + (thresholds[i] - 1);
    }

    columns.push({ label: cat.label + ' ' + rangeText, color: cat.color, swatchClass: '', kind: 'category', catIndex: i });

    if (hasCritSwatches && i === hitAfterCat) {
      columns.push({ label: 'Crit Hit', color: hitCatColor, swatchClass: 'range-swatch-crit-hit', kind: 'crit-hit', catIndex: -1 });
    }
  }

  if (hasCritSwatches && criticals.type === 'natural') {
    columns.push({ label: 'Crit Hit', color: hitCatColor, swatchClass: 'range-swatch-crit-hit', kind: 'crit-hit', catIndex: -1 });
  } else if (hasCritSwatches && criticals.type === 'conditional-doubles') {
    if (missBeforeCat < 0 || missBeforeCat >= categories.length) {
      columns.unshift({ label: 'Crit Miss', color: missCatColor, swatchClass: 'range-swatch-crit-miss', kind: 'crit-miss', catIndex: -1 });
    }
    if (hitAfterCat < 0 || hitAfterCat >= categories.length) {
      columns.push({ label: 'Crit Hit', color: hitCatColor, swatchClass: 'range-swatch-crit-hit', kind: 'crit-hit', catIndex: -1 });
    }
  }

  if (criticals.type === 'doubles') {
    columns.push({ label: criticals.label, color: criticals.color, swatchClass: '', kind: 'doubles', catIndex: -1 });
  }

  return columns;
}

export function computeViewData(
  config: DiceConfig,
  showAdvantage: boolean,
  showDisadvantage: boolean,
): ModifierData[] {
  const modes: Array<{ mode: RollMode; show: boolean }> = [
    { mode: 'disadvantage', show: showDisadvantage && config.disadvantageMethod !== 'none' },
    { mode: 'normal', show: true },
    { mode: 'advantage', show: showAdvantage && config.advantageMethod !== 'none' },
  ];

  const viewData: ModifierData[] = [];

  for (let mod = config.minMod; mod <= config.maxMod; mod++) {
    const results: Partial<Record<RollMode, ModeResult>> = {};

    for (const { mode, show } of modes) {
      if (!show) continue;
      const result = computeProbabilities(
        config.terms,
        config.thresholds,
        mod, mode, config.criticals,
        config.advantageMethod, config.disadvantageMethod,
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
