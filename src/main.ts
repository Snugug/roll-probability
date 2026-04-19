import { parseDiceNotation } from './engine';
import {
  PBTA_PRESET,
  mapThresholds,
  loadSettings,
  saveSettings,
  loadDiceThresholds,
  saveDiceThresholds,
  createDiceThreshold,
  deleteDiceThreshold,
  type DiceConfig,
  type SavedDiceThreshold,
} from './thresholds';
import { renderPage } from './renderer';
import './style.css';

function buildConfig(label: string): Omit<DiceConfig, 'id'> {
  const parsed = parseDiceNotation(label)!;
  const thresholds = mapThresholds(PBTA_PRESET, parsed.count, parsed.sides);
  return {
    count: parsed.count,
    sides: parsed.sides,
    label,
    name: label,
    thresholds,
    categories: PBTA_PRESET.categories.map(c => ({ ...c })),
    criticals: PBTA_PRESET.criticals,
    minMod: -2,
    maxMod: 5,
  };
}

async function buildConfigWithSaved(id: number): Promise<DiceConfig | null> {
  const saved = await loadDiceThresholds(id);
  if (!saved) return null;

  return {
    id: saved.id!,
    name: saved.name,
    count: saved.count,
    sides: saved.sides,
    label: saved.count + 'd' + saved.sides,
    thresholds: saved.thresholds,
    categories: saved.categories,
    criticals: saved.criticals ?? { type: 'none' },
    presetName: saved.presetName,
    minMod: saved.minMod ?? -2,
    maxMod: saved.maxMod ?? 5,
    viewMode: saved.viewMode,
  };
}

async function createAndSaveConfig(label: string): Promise<DiceConfig> {
  const config = buildConfig(label);
  const saved: Omit<SavedDiceThreshold, 'id'> = {
    name: config.name,
    count: config.count,
    sides: config.sides,
    presetName: 'PbtA',
    thresholds: config.thresholds,
    categories: config.categories,
    criticals: config.criticals,
    minMod: config.minMod,
    maxMod: config.maxMod,
  };
  const id = await createDiceThreshold(saved);
  return { ...config, id };
}

export async function init(): Promise<void> {
  const settings = await loadSettings();
  const diceConfigs: DiceConfig[] = [];

  if (settings) {
    for (const id of settings.diceList) {
      const config = await buildConfigWithSaved(id);
      if (config) diceConfigs.push(config);
    }
  } else {
    for (const label of ['2d6', '2d12', '1d20']) {
      const config = await createAndSaveConfig(label);
      diceConfigs.push(config);
    }
  }

  let showAdvantage = settings?.showAdvantage ?? true;
  let showDisadvantage = settings?.showDisadvantage ?? true;

  const rowsContainer = document.getElementById('dice-rows')!;
  const advToggle = document.getElementById('adv-toggle') as HTMLButtonElement;
  const disToggle = document.getElementById('dis-toggle') as HTMLButtonElement;
  const diceInput = document.getElementById('dice-input') as HTMLInputElement;
  const diceAddBtn = document.getElementById('dice-add') as HTMLButtonElement;

  advToggle.classList.toggle('active', showAdvantage);
  disToggle.classList.toggle('active', showDisadvantage);

  function save(): void {
    saveSettings({
      diceList: diceConfigs.map(c => c.id),
      showAdvantage,
      showDisadvantage,
    });
  }

  function handleConfigChange(index: number, config: DiceConfig, presetName: string): void {
    diceConfigs[index] = config;
    saveDiceThresholds({
      id: config.id,
      name: config.name,
      count: config.count,
      sides: config.sides,
      presetName,
      categories: config.categories,
      thresholds: config.thresholds,
      criticals: config.criticals,
      minMod: config.minMod,
      maxMod: config.maxMod,
      viewMode: config.viewMode,
    }).catch(() => {});
  }

  function handleDelete(index: number): void {
    const config = diceConfigs[index];
    deleteDiceThreshold(config.id).catch(() => {});
    diceConfigs.splice(index, 1);
    update();
  }

  function handleDialogClose(): void {
    update();
  }

  function update(): void {
    renderPage(rowsContainer, diceConfigs, showAdvantage, showDisadvantage, handleConfigChange, handleDialogClose, handleDelete);
    save();
  }

  async function addDice(): Promise<void> {
    const raw = diceInput.value.trim().toLowerCase();
    if (!raw) return;

    const parsed = parseDiceNotation(raw);
    if (!parsed) return;

    const label = parsed.count + 'd' + parsed.sides;
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
