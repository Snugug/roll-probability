import {
  loadSettings,
  loadCustomPresets,
  openDB,
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
