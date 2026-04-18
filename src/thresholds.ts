import { parseDiceNotation, type CriticalConfig } from './engine';
export type { CriticalConfig } from './engine';

export interface SavedSettings {
  diceList: string[];
  showAdvantage: boolean;
  showDisadvantage: boolean;
}

export interface SavedDiceThreshold {
  presetName: string;
  categories: ThresholdCategory[];
  thresholds: number[];
  criticals?: CriticalConfig;
  minMod: number;
  maxMod: number;
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
  count: number;
  sides: number;
  label: string;
  thresholds: number[];
  categories: ThresholdCategory[];
  criticals: CriticalConfig;
  presetName?: string;
  minMod: number;
  maxMod: number;
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

const DEFAULT_SETTINGS: SavedSettings = {
  diceList: ['2d6', '2d12', '1d20'],
  showAdvantage: true,
  showDisadvantage: true,
};

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
const DB_VERSION = 1;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
      if (!db.objectStoreNames.contains('diceThresholds')) {
        db.createObjectStore('diceThresholds');
      }
      if (!db.objectStoreNames.contains('customPresets')) {
        db.createObjectStore('customPresets', { keyPath: 'id', autoIncrement: true });
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

export async function loadSettings(): Promise<SavedSettings> {
  const db = await openDB();
  const tx = db.transaction('settings', 'readonly');
  const result = await idbRequest(db, tx.objectStore('settings').get('global'));
  return result ?? { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: SavedSettings): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('settings', 'readwrite');
  await idbRequest(db, tx.objectStore('settings').put(settings, 'global'));
}

export async function loadDiceThresholds(label: string): Promise<SavedDiceThreshold | null> {
  const db = await openDB();
  const tx = db.transaction('diceThresholds', 'readonly');
  const result = await idbRequest(db, tx.objectStore('diceThresholds').get(label));
  return result ?? null;
}

export async function saveDiceThresholds(label: string, config: SavedDiceThreshold): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('diceThresholds', 'readwrite');
  await idbRequest(db, tx.objectStore('diceThresholds').put(config, label));
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

export async function migrateFromLocalStorage(): Promise<void> {
  const raw = localStorage.getItem('dice-visualizer-settings');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as SavedSettings;
    await saveSettings(parsed);
    localStorage.removeItem('dice-visualizer-settings');
  } catch {
    // ignore invalid data
  }
}
