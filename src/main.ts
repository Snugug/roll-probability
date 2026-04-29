import { parseDiceExpression, formatDiceExpression } from './engine';
import {
  PBTA_PRESET,
  mapThresholds,
  loadSettings,
  saveSettings,
  loadDiceThresholds,
  saveDiceThresholds,
  createDiceThreshold,
  deleteDiceThreshold,
  loadCustomPresets,
  syncConfigsToPresets,
  type DiceConfig,
  type SavedDiceThreshold,
} from './thresholds';
import { renderPage } from './renderer';
import { computeInsertIndex } from './components/dice-row';
import { createDownloadSvg, createUploadSvg } from './components/icons';
import { exportConfig, importConfig, applyImport } from './import-export';
import { showToast } from './components/toast';
import './style.css';

function buildConfig(label: string): Omit<DiceConfig, 'id'> {
  const terms = parseDiceExpression(label)!;
  const canonical = formatDiceExpression(terms);
  const thresholds = mapThresholds(PBTA_PRESET, terms);
  return {
    terms,
    label: canonical,
    name: canonical,
    thresholds,
    categories: PBTA_PRESET.categories.map(c => ({ ...c })),
    criticals: PBTA_PRESET.criticals,
    minMod: -2,
    maxMod: 5,
    advantageMethod: PBTA_PRESET.advantageMethod,
    disadvantageMethod: PBTA_PRESET.disadvantageMethod,
  };
}

async function buildConfigWithSaved(id: number): Promise<DiceConfig | null> {
  const saved = await loadDiceThresholds(id);
  if (!saved) return null;

  return {
    id: saved.id!,
    name: saved.name,
    terms: saved.terms,
    label: formatDiceExpression(saved.terms),
    thresholds: saved.thresholds,
    categories: saved.categories,
    criticals: saved.criticals ?? { type: 'none' },
    presetName: saved.presetName,
    minMod: saved.minMod ?? -2,
    maxMod: saved.maxMod ?? 5,
    viewMode: saved.viewMode,
    advantageMethod: saved.advantageMethod ?? PBTA_PRESET.advantageMethod,
    disadvantageMethod: saved.disadvantageMethod ?? PBTA_PRESET.disadvantageMethod,
  };
}

async function createAndSaveConfig(label: string): Promise<DiceConfig> {
  const config = buildConfig(label);
  const saved: Omit<SavedDiceThreshold, 'id'> = {
    name: config.name,
    terms: config.terms,
    presetName: PBTA_PRESET.name,
    thresholds: config.thresholds,
    categories: config.categories,
    criticals: config.criticals,
    minMod: config.minMod,
    maxMod: config.maxMod,
    advantageMethod: config.advantageMethod,
    disadvantageMethod: config.disadvantageMethod,
  };
  const id = await createDiceThreshold(saved);
  return { ...config, id };
}

export async function init(): Promise<void> {
  const settings = await loadSettings();
  const diceConfigs: DiceConfig[] = [];

  // Detect stale string-based diceList from a pre-v2 database whose
  // migration didn't fully convert settings to numeric IDs.
  const hasValidDiceList = settings
    && settings.diceList.length > 0
    && settings.diceList.every(id => typeof id === 'number');

  if (hasValidDiceList) {
    const loaded = await Promise.all(settings.diceList.map(id => buildConfigWithSaved(id)));
    for (const config of loaded) {
      if (config) diceConfigs.push(config);
    }
  } else {
    // Fresh install or stale string diceList: create defaults
    for (const label of ['2d6', '2d12', '1d20']) {
      const config = await createAndSaveConfig(label);
      diceConfigs.push(config);
    }
  }

  let showAdvantage = settings?.showAdvantage ?? true;
  let showDisadvantage = settings?.showDisadvantage ?? true;

  const rowsContainer = document.getElementById('dice-rows')!;

  rowsContainer.addEventListener('dice-reorder', (e) => {
    const detail = (e as CustomEvent).detail as {
      fromId: number;
      toId: number;
      position: 'before' | 'after';
    };
    const { fromId, toId, position } = detail;

    const fromIdx = diceConfigs.findIndex(c => c.id === fromId);
    const toIdx = diceConfigs.findIndex(c => c.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;

    const insertIdx = computeInsertIndex(fromIdx, toIdx, position);
    if (insertIdx === fromIdx) return;

    const [moved] = diceConfigs.splice(fromIdx, 1);
    diceConfigs.splice(insertIdx, 0, moved);

    const fromRow = rowsContainer.querySelector(`dice-row[data-id="${fromId}"]`);
    const toRow = rowsContainer.querySelector(`dice-row[data-id="${toId}"]`);
    if (fromRow && toRow) {
      rowsContainer.insertBefore(
        fromRow,
        position === 'before' ? toRow : toRow.nextSibling
      );
    }

    save();
  });

  const advToggle = document.getElementById('adv-toggle') as HTMLButtonElement;
  const disToggle = document.getElementById('dis-toggle') as HTMLButtonElement;
  const diceInput = document.getElementById('dice-input') as HTMLInputElement;
  const diceAddBtn = document.getElementById('dice-add') as HTMLButtonElement;

  const downloadBtn = document.getElementById('download-btn')!;
  const uploadBtn = document.getElementById('upload-btn')!;

  downloadBtn.appendChild(createDownloadSvg());
  uploadBtn.appendChild(createUploadSvg());

  downloadBtn.addEventListener('click', () => { exportConfig(); });

  uploadBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      importConfig(file).then(result => {
        if (!result.ok) {
          showToast(result.error);
          return;
        }
        const dialog = document.createElement('dialog');
        dialog.className = 'confirm-dialog';

        const msg = document.createElement('p');
        msg.textContent = 'This will replace all your current dice and presets. Continue?';
        dialog.appendChild(msg);

        const actions = document.createElement('div');
        actions.className = 'confirm-actions';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'confirm-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => { dialog.close(); dialog.remove(); });

        const replaceBtn = document.createElement('button');
        replaceBtn.className = 'confirm-replace';
        replaceBtn.textContent = 'Replace';
        replaceBtn.addEventListener('click', () => {
          applyImport(result.data).then(() => { location.reload(); });
        });

        actions.appendChild(cancelBtn);
        actions.appendChild(replaceBtn);
        dialog.appendChild(actions);

        document.body.appendChild(dialog);
        dialog.showModal();
      });
    });
    input.click();
  });

  advToggle.classList.toggle('active', showAdvantage);
  disToggle.classList.toggle('active', showDisadvantage);

  function save(): void {
    saveSettings({
      diceList: diceConfigs.map(c => c.id),
      showAdvantage,
      showDisadvantage,
    });
  }

  function handleConfigChange(config: DiceConfig, presetName: string): void {
    // config is the same object reference held in diceConfigs (rows mutate
    // in place), so no array re-assignment is needed — just persist.
    saveDiceThresholds({
      id: config.id,
      name: config.name,
      terms: config.terms,
      presetName,
      categories: config.categories,
      thresholds: config.thresholds,
      criticals: config.criticals,
      minMod: config.minMod,
      maxMod: config.maxMod,
      viewMode: config.viewMode,
      advantageMethod: config.advantageMethod,
      disadvantageMethod: config.disadvantageMethod,
    }).catch(() => {});
  }

  function handleDelete(id: number): void {
    const idx = diceConfigs.findIndex(c => c.id === id);
    if (idx === -1) return;
    deleteDiceThreshold(id).catch(() => {});
    diceConfigs.splice(idx, 1);
    update();
  }

  async function handleDialogClose(): Promise<void> {
    const scrollY = window.scrollY;
    const presets = await loadCustomPresets();
    syncConfigsToPresets(diceConfigs, presets);
    for (const config of diceConfigs) {
      saveDiceThresholds({
        id: config.id,
        name: config.name,
        terms: config.terms,
        presetName: config.presetName ?? PBTA_PRESET.name,
        categories: config.categories,
        thresholds: config.thresholds,
        criticals: config.criticals,
        minMod: config.minMod,
        maxMod: config.maxMod,
        viewMode: config.viewMode,
        advantageMethod: config.advantageMethod,
        disadvantageMethod: config.disadvantageMethod,
      }).catch(() => {});
    }
    update();
    window.scrollTo(0, scrollY);
  }

  function update(): void {
    renderPage(rowsContainer, diceConfigs, showAdvantage, showDisadvantage, handleConfigChange, handleDialogClose, handleDelete);
    save();
  }

  async function addDice(): Promise<void> {
    const raw = diceInput.value.trim().toLowerCase();
    if (!raw) return;

    const parsed = parseDiceExpression(raw);
    if (!parsed) return;

    const label = formatDiceExpression(parsed);
    const config = await createAndSaveConfig(label);
    diceConfigs.push(config);
    diceInput.value = '';
    update();
  }

  diceAddBtn.addEventListener('click', () => { addDice(); });
  diceInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addDice();
  });

  advToggle.addEventListener('click', () => {
    showAdvantage = !showAdvantage;
    advToggle.classList.toggle('active', showAdvantage);
    update();
  });

  disToggle.addEventListener('click', () => {
    showDisadvantage = !showDisadvantage;
    disToggle.classList.toggle('active', showDisadvantage);
    update();
  });

  update();
}

document.addEventListener('DOMContentLoaded', () => { init(); });
