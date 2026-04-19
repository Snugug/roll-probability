import { parseDiceNotation, type CriticalConfig } from './engine';
export type { CriticalConfig } from './engine';

export interface SavedSettings {
  diceList: number[];
  showAdvantage: boolean;
  showDisadvantage: boolean;
}

export interface SavedDiceThreshold {
  id?: number;
  name: string;
  count: number;
  sides: number;
  presetName: string;
  categories: ThresholdCategory[];
  thresholds: number[];
  criticals?: CriticalConfig;
  minMod: number;
  maxMod: number;
  viewMode?: 'bar' | 'table';
}

export interface SavedCustomPreset {
  id?: number;
  name: string;
  referenceDie: string;
  thresholds: number[];
  categories: ThresholdCategory[];
  criticals?: CriticalConfig;
}

export interface ThresholdCategory {
  label: string;
  color: string;
}

export interface ThresholdPreset {
  name: string;
  referenceDie: string;
  thresholds: number[];
  categories: ThresholdCategory[];
  criticals: CriticalConfig;
}

export interface DiceConfig {
  id: number;
  name: string;
  count: number;
  sides: number;
  label: string;
  thresholds: number[];
  categories: ThresholdCategory[];
  criticals: CriticalConfig;
  presetName?: string;
  minMod: number;
  maxMod: number;
  viewMode?: 'bar' | 'table';
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
  criticals: { type: 'none' },
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
  criticals: { type: 'natural', hit: 20, miss: 1 },
};

export const BUILTIN_PRESETS: ThresholdPreset[] = [PBTA_PRESET, DND_PRESET];

function diceRange(count: number, sides: number): { min: number; max: number; range: number } {
  const min = count;
  const max = count * sides;
  return { min, max, range: max - min };
}

function scaleValue(value: number, ref: { min: number; range: number }, target: { min: number; range: number }): number {
  return target.min + Math.round(((value - ref.min) / ref.range) * target.range);
}

export function mapThresholds(
  preset: ThresholdPreset,
  targetCount: number,
  targetSides: number
): number[] {
  const parsed = parseDiceNotation(preset.referenceDie);
  if (!parsed) return preset.thresholds;
  const ref = diceRange(parsed.count, parsed.sides);
  const target = diceRange(targetCount, targetSides);
  return preset.thresholds.map(t => scaleValue(t, ref, target));
}

export function mapCriticals(
  preset: ThresholdPreset,
  targetCount: number,
  targetSides: number
): CriticalConfig {
  if (preset.criticals.type !== 'natural') return preset.criticals;
  const parsed = parseDiceNotation(preset.referenceDie);
  if (!parsed) return preset.criticals;
  const ref = diceRange(parsed.count, parsed.sides);
  const target = diceRange(targetCount, targetSides);
  return {
    type: 'natural',
    hit: scaleValue(preset.criticals.hit, ref, target),
    miss: scaleValue(preset.criticals.miss, ref, target),
  };
}

const DB_NAME = 'dice-visualizer';
const DB_VERSION = 2;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const tx = request.transaction!;

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
      if (!db.objectStoreNames.contains('customPresets')) {
        db.createObjectStore('customPresets', { keyPath: 'id', autoIncrement: true });
      }

      if ((event as IDBVersionChangeEvent).oldVersion < 2) {
        let lsDiceList: string[] | null = null;
        const lsRaw = localStorage.getItem('dice-visualizer-settings');
        if (lsRaw) {
          try {
            const parsed = JSON.parse(lsRaw);
            if (parsed && Array.isArray(parsed.diceList)) {
              lsDiceList = parsed.diceList;
              const settingsStore = tx.objectStore('settings');
              settingsStore.put({
                diceList: [],
                showAdvantage: parsed.showAdvantage ?? true,
                showDisadvantage: parsed.showDisadvantage ?? true,
              }, 'global');
            }
          } catch { /* ignore invalid JSON */ }
          localStorage.removeItem('dice-visualizer-settings');
        }

        if (db.objectStoreNames.contains('diceThresholds')) {
          const oldStore = tx.objectStore('diceThresholds');
          const allReq = oldStore.getAll();
          const keysReq = oldStore.getAllKeys();

          let entriesResult: any[] | null = null;
          let keysResult: string[] | null = null;

          const onBothReady = () => {
            if (entriesResult === null || keysResult === null) return;

            const oldDataMap = new Map<string, any>();
            for (let i = 0; i < keysResult.length; i++) {
              oldDataMap.set(keysResult[i], entriesResult[i]);
            }

            const settingsStore = tx.objectStore('settings');
            const settingsReq = settingsStore.get('global');
            settingsReq.onsuccess = () => {
              const settings = settingsReq.result;
              const diceList: string[] = lsDiceList
                ?? (settings?.diceList as string[] | undefined)
                ?? ['2d6', '2d12', '1d20'];

              db.deleteObjectStore('diceThresholds');
              const newStore = db.createObjectStore('diceThresholds', {
                keyPath: 'id',
                autoIncrement: true,
              });

              let remaining = diceList.length;
              const newIds: number[] = [];

              if (remaining === 0) {
                settingsStore.put({
                  diceList: [],
                  showAdvantage: settings?.showAdvantage ?? true,
                  showDisadvantage: settings?.showDisadvantage ?? true,
                }, 'global');
                return;
              }

              for (const label of diceList) {
                const parsed = parseDiceNotation(label);
                if (!parsed) {
                  remaining--;
                  if (remaining === 0) {
                    settingsStore.put({
                      diceList: newIds,
                      showAdvantage: settings?.showAdvantage ?? true,
                      showDisadvantage: settings?.showDisadvantage ?? true,
                    }, 'global');
                  }
                  continue;
                }

                const old = oldDataMap.get(label);
                const newEntry: any = old
                  ? {
                      ...old,
                      name: label,
                      count: parsed.count,
                      sides: parsed.sides,
                    }
                  : {
                      name: label,
                      count: parsed.count,
                      sides: parsed.sides,
                      presetName: 'PbtA',
                      thresholds: mapThresholds(PBTA_PRESET, parsed.count, parsed.sides),
                      categories: PBTA_PRESET.categories.map(c => ({ ...c })),
                      criticals: PBTA_PRESET.criticals,
                      minMod: -2,
                      maxMod: 5,
                    };

                const putReq = newStore.add(newEntry);
                putReq.onsuccess = () => {
                  newIds.push(putReq.result as number);
                  remaining--;
                  if (remaining === 0) {
                    settingsStore.put({
                      diceList: newIds,
                      showAdvantage: settings?.showAdvantage ?? true,
                      showDisadvantage: settings?.showDisadvantage ?? true,
                    }, 'global');
                  }
                };
              }
            };
          };

          allReq.onsuccess = () => {
            entriesResult = allReq.result;
            onBothReady();
          };
          keysReq.onsuccess = () => {
            keysResult = keysReq.result as string[];
            onBothReady();
          };
        } else {
          const newStore = db.createObjectStore('diceThresholds', {
            keyPath: 'id',
            autoIncrement: true,
          });

          if (lsDiceList && lsDiceList.length > 0) {
            const settingsStore = tx.objectStore('settings');
            const settingsReq = settingsStore.get('global');
            settingsReq.onsuccess = () => {
              const settings = settingsReq.result;
              let remaining = lsDiceList.length;
              const newIds: number[] = [];

              for (const label of lsDiceList) {
                const parsed = parseDiceNotation(label);
                if (!parsed) {
                  remaining--;
                  if (remaining === 0) {
                    settingsStore.put({
                      diceList: newIds,
                      showAdvantage: settings?.showAdvantage ?? true,
                      showDisadvantage: settings?.showDisadvantage ?? true,
                    }, 'global');
                  }
                  continue;
                }

                const newEntry: any = {
                  name: label,
                  count: parsed.count,
                  sides: parsed.sides,
                  presetName: 'PbtA',
                  thresholds: mapThresholds(PBTA_PRESET, parsed.count, parsed.sides),
                  categories: PBTA_PRESET.categories.map(c => ({ ...c })),
                  criticals: PBTA_PRESET.criticals,
                  minMod: -2,
                  maxMod: 5,
                };

                const putReq = newStore.add(newEntry);
                putReq.onsuccess = () => {
                  newIds.push(putReq.result as number);
                  remaining--;
                  if (remaining === 0) {
                    settingsStore.put({
                      diceList: newIds,
                      showAdvantage: settings?.showAdvantage ?? true,
                      showDisadvantage: settings?.showDisadvantage ?? true,
                    }, 'global');
                  }
                };
              }
            };
          }
        }
      } else if (!db.objectStoreNames.contains('diceThresholds')) {
        db.createObjectStore('diceThresholds', {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbRequest<T>(db: IDBDatabase, req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function loadSettings(): Promise<SavedSettings | null> {
  const db = await openDB();
  const tx = db.transaction('settings', 'readonly');
  const result = await idbRequest(db, tx.objectStore('settings').get('global'));
  return result ?? null;
}

export async function saveSettings(settings: SavedSettings): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('settings', 'readwrite');
  await idbRequest(db, tx.objectStore('settings').put(settings, 'global'));
}

export async function loadDiceThresholds(id: number): Promise<SavedDiceThreshold | null> {
  const db = await openDB();
  const tx = db.transaction('diceThresholds', 'readonly');
  const result = await idbRequest(db, tx.objectStore('diceThresholds').get(id));
  return result ?? null;
}

export async function saveDiceThresholds(config: SavedDiceThreshold): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('diceThresholds', 'readwrite');
  await idbRequest(db, tx.objectStore('diceThresholds').put(config));
}

export async function createDiceThreshold(config: Omit<SavedDiceThreshold, 'id'>): Promise<number> {
  const db = await openDB();
  const tx = db.transaction('diceThresholds', 'readwrite');
  return idbRequest(db, tx.objectStore('diceThresholds').add(config)) as Promise<number>;
}

export async function deleteDiceThreshold(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('diceThresholds', 'readwrite');
  await idbRequest(db, tx.objectStore('diceThresholds').delete(id));
}

export async function loadCustomPresets(): Promise<SavedCustomPreset[]> {
  const db = await openDB();
  const tx = db.transaction('customPresets', 'readonly');
  return idbRequest(db, tx.objectStore('customPresets').getAll());
}

export async function saveCustomPreset(preset: SavedCustomPreset): Promise<number> {
  const db = await openDB();
  const tx = db.transaction('customPresets', 'readwrite');
  return idbRequest(db, tx.objectStore('customPresets').put(preset)) as Promise<number>;
}

export async function deleteCustomPreset(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('customPresets', 'readwrite');
  await idbRequest(db, tx.objectStore('customPresets').delete(id));
}

