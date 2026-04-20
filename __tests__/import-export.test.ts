import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveSettings,
  createDiceThreshold,
  saveCustomPreset,
  loadSettings,
  loadDiceThresholds,
  loadCustomPresets,
  type SavedCustomPreset,
} from '../src/thresholds';

async function clearIndexedDB(): Promise<void> {
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
}

describe('buildExportData', () => {
  beforeEach(async () => {
    vi.resetModules();
    await clearIndexedDB();
  });

  it('assembles all stores into ExportData format', async () => {
    const id1 = await createDiceThreshold({
      name: '2d6',
      count: 2,
      sides: 6,
      presetName: 'PbtA',
      thresholds: [7, 10],
      categories: [
        { label: 'Miss', color: '#f87171' },
        { label: 'Weak Hit', color: '#facc15' },
        { label: 'Strong Hit', color: '#4ade80' },
      ],
      minMod: -2,
      maxMod: 5,
    });
    await saveSettings({ diceList: [id1], showAdvantage: true, showDisadvantage: false });
    await saveCustomPreset({
      name: 'My Preset',
      referenceDie: '2d6',
      thresholds: [6, 9],
      categories: [
        { label: 'A', color: '#aaa' },
        { label: 'B', color: '#bbb' },
        { label: 'C', color: '#ccc' },
      ],
    } as SavedCustomPreset);

    const { buildExportData } = await import('../src/import-export');
    const data = await buildExportData();

    expect(data.version).toBe(4);
    expect(data.settings.diceList).toEqual([id1]);
    expect(data.settings.showAdvantage).toBe(true);
    expect(data.settings.showDisadvantage).toBe(false);
    expect(data.dice).toHaveLength(1);
    expect(data.dice[0].name).toBe('2d6');
    expect(data.customPresets).toHaveLength(1);
    expect(data.customPresets[0].name).toBe('My Preset');
  });

  it('returns empty arrays when no data exists', async () => {
    const { buildExportData } = await import('../src/import-export');
    const data = await buildExportData();

    expect(data.version).toBe(4);
    expect(data.settings.diceList).toEqual([]);
    expect(data.dice).toEqual([]);
    expect(data.customPresets).toEqual([]);
  });
});

describe('importConfig', () => {
  beforeEach(async () => {
    vi.resetModules();
    await clearIndexedDB();
  });

  it('rejects non-JSON content', async () => {
    const { importConfig } = await import('../src/import-export');
    const file = new File(['not json at all'], 'bad.json', { type: 'application/json' });
    const result = await importConfig(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Not a valid dice config file');
  });

  it('rejects JSON missing required top-level fields', async () => {
    const { importConfig } = await import('../src/import-export');
    const file = new File([JSON.stringify({ version: 4 })], 'bad.json', { type: 'application/json' });
    const result = await importConfig(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Not a valid dice config file');
  });

  it('rejects when settings has wrong types', async () => {
    const { importConfig } = await import('../src/import-export');
    const data = {
      version: 4,
      settings: { diceList: 'not-array', showAdvantage: true, showDisadvantage: true },
      dice: [],
      customPresets: [],
    };
    const file = new File([JSON.stringify(data)], 'bad.json', { type: 'application/json' });
    const result = await importConfig(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Not a valid dice config file');
  });

  it('rejects dice entries missing required fields', async () => {
    const { importConfig } = await import('../src/import-export');
    const data = {
      version: 4,
      settings: { diceList: [1], showAdvantage: true, showDisadvantage: true },
      dice: [{ name: '2d6' }],
      customPresets: [],
    };
    const file = new File([JSON.stringify(data)], 'bad.json', { type: 'application/json' });
    const result = await importConfig(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Not a valid dice config file');
  });

  it('rejects customPresets entries missing required fields', async () => {
    const { importConfig } = await import('../src/import-export');
    const data = {
      version: 4,
      settings: { diceList: [], showAdvantage: true, showDisadvantage: true },
      dice: [],
      customPresets: [{ name: 'Partial' }],
    };
    const file = new File([JSON.stringify(data)], 'bad.json', { type: 'application/json' });
    const result = await importConfig(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Not a valid dice config file');
  });

  it('accepts valid v4 export data', async () => {
    const { importConfig } = await import('../src/import-export');
    const data = {
      version: 4,
      settings: { diceList: [1], showAdvantage: true, showDisadvantage: false },
      dice: [{
        id: 1,
        name: '2d6',
        count: 2,
        sides: 6,
        presetName: 'PbtA',
        thresholds: [7, 10],
        categories: [
          { label: 'Miss', color: '#f87171' },
          { label: 'Weak Hit', color: '#facc15' },
          { label: 'Strong Hit', color: '#4ade80' },
        ],
        minMod: -2,
        maxMod: 5,
      }],
      customPresets: [],
    };
    const file = new File([JSON.stringify(data)], 'good.json', { type: 'application/json' });
    const result = await importConfig(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.dice).toHaveLength(1);
      expect(result.data.settings.showDisadvantage).toBe(false);
    }
  });

  it('rejects version < 3 with "Something went wrong"', async () => {
    const { importConfig } = await import('../src/import-export');
    const data = {
      version: 2,
      settings: { diceList: [], showAdvantage: true, showDisadvantage: true },
      dice: [],
      customPresets: [],
    };
    const file = new File([JSON.stringify(data)], 'old.json', { type: 'application/json' });
    const result = await importConfig(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Something went wrong');
  });

  it('migrates version 3 to version 4', async () => {
    const { importConfig } = await import('../src/import-export');
    const data = {
      version: 3,
      settings: { diceList: [1], showAdvantage: true, showDisadvantage: true },
      dice: [{
        id: 1,
        name: '2d6',
        count: 2,
        sides: 6,
        presetName: 'PbtA',
        thresholds: [7, 10],
        categories: [
          { label: 'Miss', color: '#f87171' },
          { label: 'Weak Hit', color: '#facc15' },
          { label: 'Strong Hit', color: '#4ade80' },
        ],
        minMod: -2,
        maxMod: 5,
      }],
      customPresets: [],
    };
    const file = new File([JSON.stringify(data)], 'v3.json', { type: 'application/json' });
    const result = await importConfig(file);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.version).toBe(4);
  });

  it('rejects version > 4 with "Something went wrong"', async () => {
    const { importConfig } = await import('../src/import-export');
    const data = {
      version: 99,
      settings: { diceList: [], showAdvantage: true, showDisadvantage: true },
      dice: [],
      customPresets: [],
    };
    const file = new File([JSON.stringify(data)], 'future.json', { type: 'application/json' });
    const result = await importConfig(file);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Something went wrong');
  });
});
