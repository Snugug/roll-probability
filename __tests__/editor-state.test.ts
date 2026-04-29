import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { ThresholdEditorState } from '../src/editor-state';
import { PBTA_PRESET, DND_PRESET, type DiceConfig } from '../src/thresholds';
import { formatDiceExpression } from '../src/engine';

function makeConfig(overrides: Partial<DiceConfig> = {}): DiceConfig {
  return {
    id: 1,
    name: '2d6',
    terms: [{ sign: '+', count: 2, sides: 6 }],
    label: '2d6',
    thresholds: [7, 10],
    categories: PBTA_PRESET.categories.map(c => ({ ...c })),
    criticals: { type: 'none' },
    presetName: 'PbtA',
    minMod: -2,
    maxMod: 5,
    advantageMethod: PBTA_PRESET.advantageMethod,
    disadvantageMethod: PBTA_PRESET.disadvantageMethod,
    ...overrides,
  };
}

describe('ThresholdEditorState', () => {
  it('setTerms updates terms and label', () => {
    const config = makeConfig();
    const state = new ThresholdEditorState(config, () => {});
    state.setTerms([
      { sign: '+', count: 2, sides: 10 },
      { sign: '-', count: 1, sides: 4 },
    ]);
    expect(config.terms).toEqual([
      { sign: '+', count: 2, sides: 10 },
      { sign: '-', count: 1, sides: 4 },
    ]);
    expect(config.label).toBe('2d10 - 1d4');
  });

  it('setTerms re-maps thresholds when first group changes under a builtin preset', () => {
    const config = makeConfig({ presetName: 'PbtA' });
    const state = new ThresholdEditorState(config, () => {});
    // PBTA reference is 2d6 → thresholds [7,10] in 2..12 range.
    // Switching to 2d10 should rescale to first-group range 2..20.
    state.setTerms([{ sign: '+', count: 2, sides: 10 }]);
    // 7 maps to 2 + (7-2)/(12-2) * (20-2) = 2 + 5/10 * 18 = 11
    // 10 maps to 2 + (10-2)/(12-2) * (20-2) = 2 + 8/10 * 18 = 16.4 → round → 16
    expect(config.thresholds).toEqual([11, 16]);
  });

  it('setTerms does not change thresholds when first group is unchanged', () => {
    const config = makeConfig({ presetName: 'PbtA', thresholds: [7, 10] });
    const state = new ThresholdEditorState(config, () => {});
    state.setTerms([
      { sign: '+', count: 2, sides: 6 },
      { sign: '-', count: 1, sides: 4 },
    ]);
    expect(config.thresholds).toEqual([7, 10]);
  });

  it('setTerms does not rescale thresholds under a custom preset', () => {
    const config = makeConfig({ presetName: 'My Custom', thresholds: [7, 10] });
    const state = new ThresholdEditorState(config, () => {});
    state.setTerms([{ sign: '+', count: 2, sides: 10 }]);
    expect(config.thresholds).toEqual([7, 10]);
  });

  it('setTerms triggers a structure change', () => {
    const config = makeConfig();
    let kind: string | null = null;
    const state = new ThresholdEditorState(config, (k) => { kind = k; });
    state.setTerms([{ sign: '+', count: 2, sides: 10 }]);
    expect(kind).toBe('structure');
  });
});
