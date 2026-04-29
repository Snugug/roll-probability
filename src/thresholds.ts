import { parseDiceNotation, type CriticalConfig, type AdvantageMethod, type DisadvantageMethod, type DiceTerm } from './engine';
export type { CriticalConfig, AdvantageMethod, DisadvantageMethod, DiceTerm } from './engine';

export interface SavedSettings {
  diceList: number[];
  showAdvantage: boolean;
  showDisadvantage: boolean;
}

export interface SavedDiceThreshold {
  id?: number;
  name: string;
  terms: DiceTerm[];
  presetName: string;
  categories: ThresholdCategory[];
  thresholds: number[];
  criticals?: CriticalConfig;
  minMod: number;
  maxMod: number;
  viewMode?: 'bar' | 'table';
  advantageMethod?: AdvantageMethod;
  disadvantageMethod?: DisadvantageMethod;
}

export interface SavedCustomPreset {
  id?: number;
  name: string;
  referenceDie: string;
  thresholds: number[];
  categories: ThresholdCategory[];
  criticals?: CriticalConfig;
  advantageMethod?: AdvantageMethod;
  disadvantageMethod?: DisadvantageMethod;
  minMod?: number;
  maxMod?: number;
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
  advantageMethod: AdvantageMethod;
  disadvantageMethod: DisadvantageMethod;
}

export interface DiceConfig {
  id: number;
  name: string;
  terms: DiceTerm[];
  label: string;
  thresholds: number[];
  categories: ThresholdCategory[];
  criticals: CriticalConfig;
  presetName?: string;
  minMod: number;
  maxMod: number;
  viewMode?: 'bar' | 'table';
  advantageMethod: AdvantageMethod;
  disadvantageMethod: DisadvantageMethod;
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
  advantageMethod: 'plus-one-drop-low',
  disadvantageMethod: 'plus-one-drop-high',
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
  advantageMethod: 'plus-one-drop-low',
  disadvantageMethod: 'plus-one-drop-high',
};

export const BUILTIN_PRESETS: ThresholdPreset[] = [PBTA_PRESET, DND_PRESET];

export function syncConfigsToPresets(
  configs: DiceConfig[],
  customPresets: SavedCustomPreset[],
): void {
  for (const config of configs) {
    const presetName = config.presetName;
    if (!presetName) continue;

    const builtin = BUILTIN_PRESETS.find(p => p.name === presetName);
    if (builtin) {
      config.thresholds = mapThresholds(builtin, config.terms);
      config.categories = builtin.categories.map(c => ({ ...c }));
      config.criticals = mapCriticals(builtin, config.terms);
      config.advantageMethod = builtin.advantageMethod;
      config.disadvantageMethod = builtin.disadvantageMethod;
      continue;
    }

    const custom = customPresets.find(p => p.name === presetName);
    if (custom) {
      config.thresholds = [...custom.thresholds];
      config.categories = custom.categories.map(c => ({ ...c }));
      config.criticals = custom.criticals ?? { type: 'none' };
      config.advantageMethod = custom.advantageMethod ?? BUILTIN_PRESETS[0].advantageMethod;
      config.disadvantageMethod = custom.disadvantageMethod ?? BUILTIN_PRESETS[0].disadvantageMethod;
      config.minMod = custom.minMod ?? -2;
      config.maxMod = custom.maxMod ?? 5;
    }
  }
}

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
  terms: DiceTerm[],
): number[] {
  const parsed = parseDiceNotation(preset.referenceDie);
  if (!parsed) return preset.thresholds;
  const ref = diceRange(parsed.count, parsed.sides);
  const target = diceRange(terms[0].count, terms[0].sides);
  return preset.thresholds.map(t => scaleValue(t, ref, target));
}

export function mapCriticals(
  preset: ThresholdPreset,
  terms: DiceTerm[],
): CriticalConfig {
  if (preset.criticals.type !== 'natural') return preset.criticals;
  const parsed = parseDiceNotation(preset.referenceDie);
  if (!parsed) return preset.criticals;
  const ref = diceRange(parsed.count, parsed.sides);
  const target = diceRange(terms[0].count, terms[0].sides);
  return {
    type: 'natural',
    hit: scaleValue(preset.criticals.hit, ref, target),
    miss: scaleValue(preset.criticals.miss, ref, target),
  };
}

const DB_NAME = 'dice-visualizer';
const DB_VERSION = 5;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = (event as IDBVersionChangeEvent).oldVersion;

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
      if (!db.objectStoreNames.contains('customPresets')) {
        db.createObjectStore('customPresets', { keyPath: 'id', autoIncrement: true });
      }

      if (oldVersion < 2) {
        // Migrate localStorage to settings store if present
        const lsRaw = localStorage.getItem('dice-visualizer-settings');
        if (lsRaw) {
          try {
            const parsed = JSON.parse(lsRaw);
            if (parsed && Array.isArray(parsed.diceList)) {
              const tx = request.transaction!;
              tx.objectStore('settings').put({
                diceList: parsed.diceList,
                showAdvantage: parsed.showAdvantage ?? true,
                showDisadvantage: parsed.showDisadvantage ?? true,
              }, 'global');
            }
          } catch { /* ignore invalid JSON */ }
          localStorage.removeItem('dice-visualizer-settings');
        }
      }

      if (oldVersion < 3) {
        if (db.objectStoreNames.contains('diceThresholds')) {
          db.deleteObjectStore('diceThresholds');
        }
        db.createObjectStore('diceThresholds', {
          keyPath: 'id',
          autoIncrement: true,
        });
      }

      if (oldVersion < 5) {
        if (db.objectStoreNames.contains('diceThresholds')) {
          const store = request.transaction!.objectStore('diceThresholds');
          const cursorReq = store.openCursor();
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (!cursor) return;
            const rec = cursor.value;
            if (rec && rec.terms === undefined && typeof rec.count === 'number' && typeof rec.sides === 'number') {
              rec.terms = [{ sign: '+', count: rec.count, sides: rec.sides }];
              delete rec.count;
              delete rec.sides;
              cursor.update(rec);
            }
            cursor.continue();
          };
        }
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

