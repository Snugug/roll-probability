import { parseDiceNotation } from './engine';

export interface SavedSettings {
  diceList: string[];
  minMod: number;
  maxMod: number;
  showAdvantage: boolean;
  showDisadvantage: boolean;
}

export interface SavedDiceThreshold {
  presetName: string;
  categories: ThresholdCategory[];
  thresholds: number[];
}

export interface SavedCustomPreset {
  id?: number;
  name: string;
  referenceDie: string;
  thresholds: number[];
  categories: ThresholdCategory[];
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
}

export interface DiceConfig {
  count: number;
  sides: number;
  label: string;
  thresholds: number[];
  categories: ThresholdCategory[];
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
};

export const BUILTIN_PRESETS: ThresholdPreset[] = [PBTA_PRESET, DND_PRESET];

const DEFAULT_SETTINGS: SavedSettings = {
  diceList: ['2d6', '2d12', '1d20'],
  minMod: -2,
  maxMod: 5,
  showAdvantage: true,
  showDisadvantage: true,
};

export function mapThresholds(
  preset: ThresholdPreset,
  targetCount: number,
  targetSides: number
): number[] {
  const ref = parseDiceNotation(preset.referenceDie);
  if (!ref) return preset.thresholds;

  const refMin = ref.count;
  const refMax = ref.count * ref.sides;
  const refRange = refMax - refMin;

  const targetMin = targetCount;
  const targetMax = targetCount * targetSides;
  const targetRange = targetMax - targetMin;

  if (refRange === 0) return preset.thresholds;

  return preset.thresholds.map(t => {
    return targetMin + Math.round(((t - refMin) / refRange) * targetRange);
  });
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

export async function loadSettings(): Promise<SavedSettings> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get('global');
    req.onsuccess = () => {
      db.close();
      resolve(req.result ?? { ...DEFAULT_SETTINGS });
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function saveSettings(settings: SavedSettings): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.put(settings, 'global');
    req.onsuccess = () => {
      db.close();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function loadDiceThresholds(label: string): Promise<SavedDiceThreshold | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('diceThresholds', 'readonly');
    const store = tx.objectStore('diceThresholds');
    const req = store.get(label);
    req.onsuccess = () => {
      db.close();
      resolve(req.result ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function saveDiceThresholds(label: string, config: SavedDiceThreshold): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('diceThresholds', 'readwrite');
    const store = tx.objectStore('diceThresholds');
    const req = store.put(config, label);
    req.onsuccess = () => {
      db.close();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function loadCustomPresets(): Promise<SavedCustomPreset[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('customPresets', 'readonly');
    const store = tx.objectStore('customPresets');
    const req = store.getAll();
    req.onsuccess = () => {
      db.close();
      resolve(req.result);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function saveCustomPreset(preset: SavedCustomPreset): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('customPresets', 'readwrite');
    const store = tx.objectStore('customPresets');
    const req = store.put(preset);
    req.onsuccess = () => {
      db.close();
      resolve(req.result as number);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function deleteCustomPreset(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('customPresets', 'readwrite');
    const store = tx.objectStore('customPresets');
    const req = store.delete(id);
    req.onsuccess = () => {
      db.close();
      resolve();
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
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
