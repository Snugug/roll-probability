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
