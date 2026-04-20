import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PBTA_PRESET,
  DND_PRESET,
  mapThresholds,
  mapCriticals,
  type ThresholdPreset,
  openDB,
  loadSettings,
  saveSettings,
  loadDiceThresholds,
  saveDiceThresholds,
  createDiceThreshold,
  deleteDiceThreshold,
  loadCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  type SavedSettings,
  type SavedDiceThreshold,
  type SavedCustomPreset,
} from '../src/thresholds';

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

  it('PbtA preset has advantage/disadvantage methods', () => {
    expect(PBTA_PRESET.advantageMethod).toBe('plus-one-drop-low');
    expect(PBTA_PRESET.disadvantageMethod).toBe('plus-one-drop-high');
  });

  it('D&D preset has advantage/disadvantage methods', () => {
    expect(DND_PRESET.advantageMethod).toBe('plus-one-drop-low');
    expect(DND_PRESET.disadvantageMethod).toBe('plus-one-drop-high');
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
    const result = mapThresholds(DND_PRESET, 2, 6);
    expect(result).toEqual([4, 7, 9, 12, 15, 17]);
  });

  it('maps PbtA to 1d20', () => {
    const result = mapThresholds(PBTA_PRESET, 1, 20);
    expect(result).toEqual([11, 16]);
  });

  it('maps PbtA to 2d12', () => {
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
  it('maps D&D natural crits from 1d20 to 2d10 (hit=20->20, miss=1->2)', () => {
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

  it('loadSettings returns null when no settings saved', async () => {
    const settings = await loadSettings();
    expect(settings).toBeNull();
  });

  it('saveSettings and loadSettings round-trip', async () => {
    const id1 = await createDiceThreshold({
      name: '1d6', count: 1, sides: 6,
      presetName: 'PbtA', categories: [], thresholds: [],
      minMod: 0, maxMod: 0,
    });
    const id2 = await createDiceThreshold({
      name: '1d8', count: 1, sides: 8,
      presetName: 'PbtA', categories: [], thresholds: [],
      minMod: 0, maxMod: 0,
    });
    const toSave: SavedSettings = {
      diceList: [id1, id2],
      showAdvantage: false,
      showDisadvantage: true,
    };
    await saveSettings(toSave);
    const loaded = await loadSettings();
    expect(loaded).toEqual(toSave);
  });

  it('createDiceThreshold and loadDiceThresholds round-trip', async () => {
    const config = {
      name: '2d6',
      count: 2,
      sides: 6,
      presetName: 'PbtA',
      categories: [
        { label: 'Miss', color: '#f87171' },
        { label: 'Hit', color: '#4ade80' },
      ],
      thresholds: [7, 10],
      minMod: -2,
      maxMod: 5,
    };
    const id = await createDiceThreshold(config);
    expect(typeof id).toBe('number');
    const loaded = await loadDiceThresholds(id);
    expect(loaded).not.toBeNull();
    expect(loaded!.name).toBe('2d6');
    expect(loaded!.count).toBe(2);
    expect(loaded!.sides).toBe(6);
    expect(loaded!.thresholds).toEqual([7, 10]);
  });

  it('saveDiceThresholds updates existing entry by id', async () => {
    const id = await createDiceThreshold({
      name: '2d6', count: 2, sides: 6,
      presetName: 'PbtA',
      categories: [{ label: 'Miss', color: '#f87171' }],
      thresholds: [7],
      minMod: -2, maxMod: 5,
    });
    await saveDiceThresholds({
      id, name: 'Attack', count: 2, sides: 6,
      presetName: 'Custom',
      categories: [{ label: 'Miss', color: '#ff0000' }],
      thresholds: [8],
      minMod: -1, maxMod: 3,
    });
    const loaded = await loadDiceThresholds(id);
    expect(loaded!.name).toBe('Attack');
    expect(loaded!.presetName).toBe('Custom');
  });

  it('deleteDiceThreshold removes the entry', async () => {
    const id = await createDiceThreshold({
      name: '2d6', count: 2, sides: 6,
      presetName: 'PbtA', categories: [], thresholds: [],
      minMod: 0, maxMod: 0,
    });
    await deleteDiceThreshold(id);
    const loaded = await loadDiceThresholds(id);
    expect(loaded).toBeNull();
  });

  it('createDiceThreshold auto-increments ids', async () => {
    const config = {
      name: '2d6', count: 2, sides: 6,
      presetName: 'PbtA', categories: [], thresholds: [],
      minMod: 0, maxMod: 0,
    };
    const id1 = await createDiceThreshold(config);
    const id2 = await createDiceThreshold({ ...config, name: '1d20' });
    expect(typeof id1).toBe('number');
    expect(typeof id2).toBe('number');
    expect(id2).toBeGreaterThan(id1);
  });

  it('createDiceThreshold round-trips with criticals field', async () => {
    const config = {
      name: '1d20', count: 1, sides: 20,
      presetName: 'D&D',
      categories: [
        { label: 'Fail', color: '#ff0000' },
        { label: 'Pass', color: '#00ff00' },
      ],
      thresholds: [10],
      criticals: { type: 'natural' as const, hit: 20, miss: 1 },
      minMod: -2, maxMod: 5,
    };
    const id = await createDiceThreshold(config);
    const loaded = await loadDiceThresholds(id);
    expect(loaded).not.toBeNull();
    expect(loaded!.criticals).toEqual({ type: 'natural', hit: 20, miss: 1 });
  });

  it('loadDiceThresholds returns null for unknown id', async () => {
    const result = await loadDiceThresholds(999);
    expect(result).toBeNull();
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

describe('v1 to v2 migration', () => {
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

  it('v1 to v2 upgrade replaces string-keyed store with auto-increment store', async () => {
    // Seed a v1 database manually
    const v1req = indexedDB.open('dice-visualizer', 1);
    await new Promise<void>((resolve) => {
      v1req.onupgradeneeded = () => {
        const db = v1req.result;
        db.createObjectStore('settings');
        db.createObjectStore('diceThresholds');
        db.createObjectStore('customPresets', { keyPath: 'id', autoIncrement: true });
      };
      v1req.onsuccess = () => {
        const db = v1req.result;
        const tx = db.transaction(['settings', 'diceThresholds'], 'readwrite');
        tx.objectStore('settings').put({
          diceList: ['2d6'],
          showAdvantage: true,
          showDisadvantage: true,
        }, 'global');
        tx.objectStore('diceThresholds').put({
          presetName: 'PbtA',
          thresholds: [7, 10],
          categories: [
            { label: 'Miss', color: '#f87171' },
            { label: 'Weak Hit', color: '#facc15' },
            { label: 'Strong Hit', color: '#4ade80' },
          ],
          minMod: -2,
          maxMod: 5,
        }, '2d6');
        tx.oncomplete = () => { db.close(); resolve(); };
      };
    });

    // Open with v2 — migration replaces the old store with auto-increment.
    // Old threshold data is not preserved; settings retain the old string
    // diceList which init() treats as a fresh install.
    const settings = await loadSettings();
    expect(settings).not.toBeNull();
    expect(settings!.diceList).toEqual(['2d6']);

    // The new auto-increment store exists and accepts entries
    const id = await createDiceThreshold({
      name: '2d6', count: 2, sides: 6,
      presetName: 'PbtA', categories: [], thresholds: [7, 10],
      minMod: -2, maxMod: 5,
    });
    expect(typeof id).toBe('number');
    const loaded = await loadDiceThresholds(id);
    expect(loaded).not.toBeNull();
  });

  it('migrates localStorage settings during v1 to v2 upgrade', async () => {
    const legacy = {
      diceList: ['1d4', '1d8'],
      showAdvantage: false,
      showDisadvantage: false,
    };
    localStorage.setItem('dice-visualizer-settings', JSON.stringify(legacy));

    // Trigger migration by opening DB (fresh install, oldVersion=0 which is < 2)
    const settings = await loadSettings();
    expect(settings).not.toBeNull();
    // localStorage diceList is preserved as-is (strings); init() will detect
    // these are not numeric IDs and create fresh defaults.
    expect(settings!.diceList).toEqual(['1d4', '1d8']);
    expect(settings!.showAdvantage).toBe(false);
    expect(settings!.showDisadvantage).toBe(false);

    // localStorage should be cleared
    expect(localStorage.getItem('dice-visualizer-settings')).toBeNull();
  });

  it('removes localStorage key even with invalid JSON', async () => {
    localStorage.setItem('dice-visualizer-settings', 'not valid json!!!');

    // Trigger migration
    const db = await openDB();
    db.close();

    expect(localStorage.getItem('dice-visualizer-settings')).toBeNull();
  });

  it('creates default dice when no v1 data exists', async () => {
    // Fresh install — no v1 DB, no localStorage
    // Settings should be null since no migration populated them
    const settings = await loadSettings();
    expect(settings).toBeNull();
  });
});

describe('IndexedDB error paths', () => {
  it('openDB rejects when indexedDB.open fires onerror', async () => {
    const spy = vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const fakeRequest: any = {};
      let onerrorHandler: any;
      let onsuccessHandler: any;
      Object.defineProperty(fakeRequest, 'onerror', {
        set(fn: any) { onerrorHandler = fn; },
        get() { return onerrorHandler; },
      });
      Object.defineProperty(fakeRequest, 'onsuccess', {
        set(fn: any) { onsuccessHandler = fn; },
        get() { return onsuccessHandler; },
      });
      Object.defineProperty(fakeRequest, 'onupgradeneeded', {
        set() {},
        get() { return null; },
      });
      fakeRequest.error = new DOMException('Test open error');
      // Fire onerror async
      setTimeout(() => {
        if (onerrorHandler) onerrorHandler(new Event('error'));
      }, 0);
      return fakeRequest;
    });

    await expect(openDB()).rejects.toBeTruthy();
    spy.mockRestore();
  });

  it('loadSettings rejects when idbRequest onerror fires', async () => {
    const spy = vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const fakeRequest: any = {};
      let onsuccessHandler: any;
      Object.defineProperty(fakeRequest, 'onerror', { set() {}, get() { return null; } });
      Object.defineProperty(fakeRequest, 'onsuccess', {
        set(fn: any) { onsuccessHandler = fn; },
        get() { return onsuccessHandler; },
      });
      Object.defineProperty(fakeRequest, 'onupgradeneeded', { set() {}, get() { return null; } });

      const fakeDb: any = {
        close: vi.fn(),
        transaction: () => ({
          objectStore: () => ({
            get: () => {
              const req: any = {};
              let onerror: any;
              Object.defineProperty(req, 'onsuccess', { set() {}, get() { return null; } });
              Object.defineProperty(req, 'onerror', {
                set(fn: any) { onerror = fn; },
                get() { return onerror; },
              });
              req.error = new DOMException('Test request error');
              setTimeout(() => {
                if (onerror) onerror(new Event('error'));
              }, 0);
              return req;
            },
          }),
        }),
      };
      fakeRequest.result = fakeDb;
      setTimeout(() => {
        if (onsuccessHandler) onsuccessHandler(new Event('success'));
      }, 0);
      return fakeRequest;
    });

    await expect(loadSettings()).rejects.toBeTruthy();
    spy.mockRestore();
  });
});
