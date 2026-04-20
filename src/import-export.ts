import {
  loadSettings,
  loadCustomPresets,
  openDB,
  saveSettings,
  saveCustomPreset,
  createDiceThreshold,
  type SavedDiceThreshold,
  type SavedCustomPreset,
} from './thresholds';

export interface ExportData {
  version: number;
  settings: {
    diceList: number[];
    showAdvantage: boolean;
    showDisadvantage: boolean;
  };
  dice: SavedDiceThreshold[];
  customPresets: SavedCustomPreset[];
}

const CURRENT_VERSION = 4;

async function loadAllDice(): Promise<SavedDiceThreshold[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('diceThresholds', 'readonly');
    const req = tx.objectStore('diceThresholds').getAll();
    req.onsuccess = () => { db.close(); resolve(req.result); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function buildExportData(): Promise<ExportData> {
  const settings = await loadSettings();
  const dice = await loadAllDice();
  const customPresets = await loadCustomPresets();

  return {
    version: CURRENT_VERSION,
    settings: {
      diceList: settings?.diceList ?? [],
      showAdvantage: settings?.showAdvantage ?? true,
      showDisadvantage: settings?.showDisadvantage ?? true,
    },
    dice,
    customPresets,
  };
}

export function exportConfig(): void {
  buildExportData().then(data => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dice-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

export type ImportResult =
  | { ok: true; data: ExportData }
  | { ok: false; error: string };

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function validateExportData(data: unknown): data is ExportData {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  if (typeof obj.version !== 'number') return false;
  if (typeof obj.settings !== 'object' || obj.settings === null) return false;
  if (!Array.isArray(obj.dice)) return false;
  if (!Array.isArray(obj.customPresets)) return false;

  const settings = obj.settings as Record<string, unknown>;
  if (!Array.isArray(settings.diceList)) return false;
  if (typeof settings.showAdvantage !== 'boolean') return false;
  if (typeof settings.showDisadvantage !== 'boolean') return false;

  for (const die of obj.dice as unknown[]) {
    if (typeof die !== 'object' || die === null) return false;
    const d = die as Record<string, unknown>;
    if (typeof d.name !== 'string') return false;
    if (typeof d.count !== 'number') return false;
    if (typeof d.sides !== 'number') return false;
    if (!Array.isArray(d.thresholds)) return false;
    if (!Array.isArray(d.categories)) return false;
    if (typeof d.minMod !== 'number') return false;
    if (typeof d.maxMod !== 'number') return false;
  }

  for (const preset of obj.customPresets as unknown[]) {
    if (typeof preset !== 'object' || preset === null) return false;
    const p = preset as Record<string, unknown>;
    if (typeof p.name !== 'string') return false;
    if (typeof p.referenceDie !== 'string') return false;
    if (!Array.isArray(p.thresholds)) return false;
    if (!Array.isArray(p.categories)) return false;
  }

  return true;
}

export async function importConfig(file: File): Promise<ImportResult> {
  let text: string;
  try {
    text = await readFile(file);
  } catch {
    return { ok: false, error: 'Not a valid dice config file' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Not a valid dice config file' };
  }

  if (!validateExportData(parsed)) {
    return { ok: false, error: 'Not a valid dice config file' };
  }

  if (parsed.version < 3) {
    return { ok: false, error: 'Something went wrong' };
  }

  // Version 3 -> 4 migration is a no-op (same data shape)
  if (parsed.version === 3) {
    parsed.version = 4;
  }

  if (parsed.version !== CURRENT_VERSION) {
    return { ok: false, error: 'Something went wrong' };
  }

  return { ok: true, data: parsed };
}

async function clearAllStores(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(['settings', 'diceThresholds', 'customPresets'], 'readwrite');
  tx.objectStore('settings').clear();
  tx.objectStore('diceThresholds').clear();
  tx.objectStore('customPresets').clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function applyImport(data: ExportData): Promise<void> {
  await clearAllStores();

  // Write custom presets (new auto-increment IDs)
  for (const preset of data.customPresets) {
    const { id, ...rest } = preset;
    await saveCustomPreset(rest as SavedCustomPreset);
  }

  // Write dice configs and build old-to-new ID mapping
  const idMap = new Map<number, number>();
  for (const die of data.dice) {
    const { id: oldId, ...rest } = die;
    const newId = await createDiceThreshold(rest);
    if (oldId !== undefined) {
      idMap.set(oldId, newId);
    }
  }

  // Reconstruct diceList with new IDs, preserving order
  const newDiceList = data.settings.diceList
    .map(oldId => idMap.get(oldId))
    .filter((id): id is number => id !== undefined);

  await saveSettings({
    diceList: newDiceList,
    showAdvantage: data.settings.showAdvantage,
    showDisadvantage: data.settings.showDisadvantage,
  });
}
