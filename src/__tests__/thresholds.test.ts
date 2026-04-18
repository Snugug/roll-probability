import { describe, it, expect, beforeEach } from 'vitest';
import {
  PBTA_PRESET,
  DND_PRESET,
  mapThresholds,
  mapCriticals,
  type ThresholdPreset,
  loadSettings,
  saveSettings,
  loadDiceThresholds,
  saveDiceThresholds,
  loadCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  migrateFromLocalStorage,
  type SavedSettings,
  type SavedDiceThreshold,
  type SavedCustomPreset,
} from '../thresholds';

describe('built-in presets', () => {
  it('PbtA preset has correct structure', () => {
    expect(PBTA_PRESET.name).toBe('PbtA');
    expect(PBTA_PRESET.referenceDie).toBe('2d6');
    expect(PBTA_PRESET.thresholds).toEqual([7, 10]);
    expect(PBTA_PRESET.categories).toHaveLength(3);
    expect(PBTA_PRESET.categories[0]).toEqual({ label: 'Miss', color: '#f87171' });
    expect(PBTA_PRESET.categories[1]).toEqual({ label: 'Weak Hit', color: '#facc15' });
    expect(PBTA_PRESET.categories[2]).toEqual({ label: 'Strong Hit', color: '#4ade80' });
  });

  it('PbtA has one more category than thresholds', () => {
    expect(PBTA_PRESET.categories.length).toBe(PBTA_PRESET.thresholds.length + 1);
  });

  it('D&D preset has correct structure', () => {
    expect(DND_PRESET.name).toBe('D&D');
    expect(DND_PRESET.referenceDie).toBe('1d20');
    expect(DND_PRESET.thresholds).toEqual([5, 10, 15, 20, 25, 30]);
    expect(DND_PRESET.categories).toHaveLength(7);
    expect(DND_PRESET.categories[0]).toEqual({ label: 'Trivial', color: '#94a3b8' });
    expect(DND_PRESET.categories[6]).toEqual({ label: 'Nearly Impossible', color: '#a855f7' });
  });

  it('D&D has one more category than thresholds', () => {
    expect(DND_PRESET.categories.length).toBe(DND_PRESET.thresholds.length + 1);
  });

  it('D&D thresholds are ascending', () => {
    for (let i = 1; i < DND_PRESET.thresholds.length; i++) {
      expect(DND_PRESET.thresholds[i]).toBeGreaterThan(DND_PRESET.thresholds[i - 1]);
    }
  });
});

describe('mapThresholds', () => {
  it('maps PbtA (2d6) to itself (identity)', () => {
    const result = mapThresholds(PBTA_PRESET, 2, 6);
    expect(result).toEqual([7, 10]);
  });

  it('maps D&D (1d20) to itself (identity)', () => {
    const result = mapThresholds(DND_PRESET, 1, 20);
    expect(result).toEqual([5, 10, 15, 20, 25, 30]);
  });

  it('returns thresholds unchanged when referenceDie is invalid', () => {
    const preset: ThresholdPreset = { name: 'Bad', referenceDie: 'invalid', thresholds: [5, 10], categories: [], criticals: { type: 'none' } };
    const result = mapThresholds(preset, 2, 6);
    expect(result).toEqual([5, 10]);
  });

  it('maps D&D to 2d6 using linear proportional formula', () => {
    // ref 1d20: min=1, max=20, range=19
    // target 2d6: min=2, max=12, range=10
    // threshold 5:  2 + round(4/19 * 10)  = 2 + round(2.105) = 2+2 = 4
    // threshold 10: 2 + round(9/19 * 10)  = 2 + round(4.737) = 2+5 = 7
    // threshold 15: 2 + round(14/19 * 10) = 2 + round(7.368) = 2+7 = 9
    // threshold 20: 2 + round(19/19 * 10) = 2 + round(10)    = 2+10 = 12
    // threshold 25: 2 + round(24/19 * 10) = 2 + round(12.63) = 2+13 = 15
    // threshold 30: 2 + round(29/19 * 10) = 2 + round(15.26) = 2+15 = 17
    const result = mapThresholds(DND_PRESET, 2, 6);
    expect(result).toEqual([4, 7, 9, 12, 15, 17]);
  });

  it('maps PbtA to 1d20', () => {
    // ref 2d6: min=2, max=12, range=10
    // target 1d20: min=1, max=20, range=19
    // threshold 7:  1 + round(5/10 * 19)  = 1 + round(9.5) = 1+10 = 11
    // threshold 10: 1 + round(8/10 * 19)  = 1 + round(15.2) = 1+15 = 16
    const result = mapThresholds(PBTA_PRESET, 1, 20);
    expect(result).toEqual([11, 16]);
  });

  it('maps PbtA to 2d12', () => {
    // ref 2d6: min=2, max=12, range=10
    // target 2d12: min=2, max=24, range=22
    // threshold 7:  2 + round(5/10 * 22) = 2 + round(11) = 13
    // threshold 10: 2 + round(8/10 * 22) = 2 + round(17.6) = 2+18 = 20
    const result = mapThresholds(PBTA_PRESET, 2, 12);
    expect(result).toEqual([13, 20]);
  });

  it('preserves ascending order', () => {
    const result = mapThresholds(DND_PRESET, 2, 6);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]);
    }
  });
});

describe('built-in preset criticals', () => {
  it('PbtA preset has criticals type none', () => {
    expect(PBTA_PRESET.criticals).toEqual({ type: 'none' });
  });

  it('D&D preset has natural criticals with hit=20 miss=1', () => {
    expect(DND_PRESET.criticals).toEqual({ type: 'natural', hit: 20, miss: 1 });
  });
});

describe('mapCriticals', () => {
  it('maps D&D natural crits from 1d20 to 2d10 (hit=20→20, miss=1→2)', () => {
    // ref 1d20: min=1, max=20, range=19
    // target 2d10: min=2, max=20, range=18
    // hit: 2 + round((20-1)/19 * 18) = 2 + round(18) = 20
    // miss: 2 + round((1-1)/19 * 18) = 2 + round(0) = 2
    const result = mapCriticals(DND_PRESET, 2, 10);
    expect(result).toEqual({ type: 'natural', hit: 20, miss: 2 });
  });

  it('maps D&D natural crits to itself (identity)', () => {
    const result = mapCriticals(DND_PRESET, 1, 20);
    expect(result).toEqual({ type: 'natural', hit: 20, miss: 1 });
  });

  it('returns non-natural configs unchanged', () => {
    const preset: ThresholdPreset = {
      name: 'Test',
      referenceDie: '2d6',
      thresholds: [7, 10],
      categories: [],
      criticals: { type: 'none' },
    };
    const result = mapCriticals(preset, 1, 20);
    expect(result).toEqual({ type: 'none' });
  });

  it('returns criticals unchanged when referenceDie is invalid', () => {
    const preset: ThresholdPreset = {
      name: 'Bad',
      referenceDie: 'invalid',
      thresholds: [5],
      categories: [],
      criticals: { type: 'natural', hit: 20, miss: 1 },
    };
    const result = mapCriticals(preset, 2, 6);
    expect(result).toEqual({ type: 'natural', hit: 20, miss: 1 });
  });
});

describe('IndexedDB persistence', () => {
  beforeEach(async () => {
    const dbs = await indexedDB.databases();
    await Promise.all(
      dbs
        .filter(db => db.name)
        .map(
          db =>
            new Promise<void>((resolve, reject) => {
              const req = indexedDB.deleteDatabase(db.name!);
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
              req.onblocked = () => resolve();
            })
        )
    );
  });

  it('loadSettings returns defaults when no settings saved', async () => {
    const settings = await loadSettings();
    expect(settings.diceList).toEqual(['2d6', '2d12', '1d20']);
    expect(settings.showAdvantage).toBe(true);
    expect(settings.showDisadvantage).toBe(true);
  });

  it('saveSettings and loadSettings round-trip', async () => {
    const toSave: SavedSettings = {
      diceList: ['1d6', '1d8'],
      showAdvantage: false,
      showDisadvantage: true,
    };
    await saveSettings(toSave);
    const loaded = await loadSettings();
    expect(loaded).toEqual(toSave);
  });

  it('saveDiceThresholds and loadDiceThresholds round-trip', async () => {
    const config: SavedDiceThreshold = {
      presetName: 'PbtA',
      categories: [
        { label: 'Miss', color: '#f87171' },
        { label: 'Hit', color: '#4ade80' },
      ],
      thresholds: [7, 10],
      minMod: -2,
      maxMod: 5,
    };
    await saveDiceThresholds('2d6', config);
    const loaded = await loadDiceThresholds('2d6');
    expect(loaded).toEqual(config);
  });

  it('saveDiceThresholds round-trips with criticals field', async () => {
    const config: SavedDiceThreshold = {
      presetName: 'D&D',
      categories: [
        { label: 'Fail', color: '#ff0000' },
        { label: 'Pass', color: '#00ff00' },
      ],
      thresholds: [10],
      criticals: { type: 'natural', hit: 20, miss: 1 },
      minMod: -2,
      maxMod: 5,
    };
    await saveDiceThresholds('1d20', config);
    const loaded = await loadDiceThresholds('1d20');
    expect(loaded).toEqual(config);
    expect(loaded!.criticals).toEqual({ type: 'natural', hit: 20, miss: 1 });
  });

  it('saveCustomPreset round-trips with criticals field', async () => {
    const preset: SavedCustomPreset = {
      name: 'Crit Preset',
      referenceDie: '1d20',
      thresholds: [10],
      categories: [
        { label: 'Fail', color: '#ff0000' },
        { label: 'Pass', color: '#00ff00' },
      ],
      criticals: { type: 'natural', hit: 20, miss: 1 },
    };
    await saveCustomPreset(preset);
    const all = await loadCustomPresets();
    expect(all).toHaveLength(1);
    expect(all[0].criticals).toEqual({ type: 'natural', hit: 20, miss: 1 });
  });

  it('loadDiceThresholds returns null for unknown label', async () => {
    const result = await loadDiceThresholds('3d8');
    expect(result).toBeNull();
  });

  it('saveCustomPreset auto-increments id', async () => {
    const preset: SavedCustomPreset = {
      name: 'My Preset',
      referenceDie: '2d6',
      thresholds: [7, 10],
      categories: [
        { label: 'Miss', color: '#f87171' },
        { label: 'Hit', color: '#4ade80' },
      ],
    };
    const id1 = await saveCustomPreset(preset);
    const id2 = await saveCustomPreset({ ...preset, name: 'Another Preset' });
    expect(typeof id1).toBe('number');
    expect(typeof id2).toBe('number');
    expect(id2).toBeGreaterThan(id1);
  });

  it('loadCustomPresets returns all saved presets', async () => {
    const preset: SavedCustomPreset = {
      name: 'Preset A',
      referenceDie: '1d20',
      thresholds: [10],
      categories: [
        { label: 'Fail', color: '#f87171' },
        { label: 'Pass', color: '#4ade80' },
      ],
    };
    await saveCustomPreset(preset);
    await saveCustomPreset({ ...preset, name: 'Preset B' });
    const all = await loadCustomPresets();
    expect(all).toHaveLength(2);
    expect(all[0].name).toBe('Preset A');
    expect(all[1].name).toBe('Preset B');
  });

  it('deleteCustomPreset removes the preset', async () => {
    const preset: SavedCustomPreset = {
      name: 'To Delete',
      referenceDie: '2d6',
      thresholds: [7],
      categories: [
        { label: 'Miss', color: '#f87171' },
        { label: 'Hit', color: '#4ade80' },
      ],
    };
    const id = await saveCustomPreset(preset);
    await deleteCustomPreset(id);
    const all = await loadCustomPresets();
    expect(all).toHaveLength(0);
  });
});

describe('migrateFromLocalStorage', () => {
  beforeEach(async () => {
    const dbs = await indexedDB.databases();
    await Promise.all(
      dbs
        .filter(db => db.name)
        .map(
          db =>
            new Promise<void>((resolve, reject) => {
              const req = indexedDB.deleteDatabase(db.name!);
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
              req.onblocked = () => resolve();
            })
        )
    );
    localStorage.clear();
  });

  it('migrates settings from localStorage to IndexedDB', async () => {
    const legacy = {
      diceList: ['1d4', '1d8'],
      showAdvantage: false,
      showDisadvantage: false,
    };
    localStorage.setItem('dice-visualizer-settings', JSON.stringify(legacy));
    await migrateFromLocalStorage();
    const loaded = await loadSettings();
    expect(loaded).toEqual(legacy);
  });

  it('removes the localStorage key after migration', async () => {
    const legacy = {
      diceList: ['1d10'],
      showAdvantage: true,
      showDisadvantage: false,
    };
    localStorage.setItem('dice-visualizer-settings', JSON.stringify(legacy));
    await migrateFromLocalStorage();
    expect(localStorage.getItem('dice-visualizer-settings')).toBeNull();
  });

  it('is a no-op when no localStorage key exists', async () => {
    await migrateFromLocalStorage();
    const settings = await loadSettings();
    expect(settings).toEqual({
      diceList: ['2d6', '2d12', '1d20'],
      showAdvantage: true,
      showDisadvantage: true,
    });
  });

  it('handles invalid JSON in localStorage gracefully', async () => {
    localStorage.setItem('dice-visualizer-settings', 'not valid json!!!');
    await migrateFromLocalStorage();
    // catch block does not call removeItem, so key should still be present
    expect(localStorage.getItem('dice-visualizer-settings')).toBe('not valid json!!!');
    // Settings should be defaults since migration failed
    const settings = await loadSettings();
    expect(settings.diceList).toEqual(['2d6', '2d12', '1d20']);
  });
});
