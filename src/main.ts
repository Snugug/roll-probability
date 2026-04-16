import { parseDiceNotation } from './engine';
import {
  PBTA_PRESET,
  mapThresholds,
  loadSettings,
  saveSettings,
  loadDiceThresholds,
  saveDiceThresholds,
  migrateFromLocalStorage,
  type DiceConfig,
} from './thresholds';
import { renderPage } from './renderer';
import './style.css';

function buildConfig(label: string): DiceConfig {
  const parsed = parseDiceNotation(label)!;
  const thresholds = mapThresholds(PBTA_PRESET, parsed.count, parsed.sides);
  return {
    count: parsed.count,
    sides: parsed.sides,
    label,
    thresholds,
    categories: PBTA_PRESET.categories,
    minMod: -2,
    maxMod: 5,
  };
}

async function buildConfigWithSaved(label: string): Promise<DiceConfig | null> {
  const parsed = parseDiceNotation(label);
  if (!parsed) return null;

  const saved = await loadDiceThresholds(label);
  if (saved) {
    return {
      count: parsed.count,
      sides: parsed.sides,
      label,
      thresholds: saved.thresholds,
      categories: saved.categories,
      presetName: saved.presetName,
      minMod: saved.minMod ?? -2,
      maxMod: saved.maxMod ?? 5,
    };
  }

  return buildConfig(label);
}

export async function init(): Promise<void> {
  await migrateFromLocalStorage();
  const settings = await loadSettings();
  const diceConfigs: DiceConfig[] = [];

  for (const label of settings.diceList) {
    const config = await buildConfigWithSaved(label);
    if (config) diceConfigs.push(config);
  }

  let showAdvantage = settings.showAdvantage;
  let showDisadvantage = settings.showDisadvantage;

  const rowsContainer = document.getElementById('dice-rows')!;
  const advToggle = document.getElementById('adv-toggle') as HTMLButtonElement;
  const disToggle = document.getElementById('dis-toggle') as HTMLButtonElement;
  const diceInput = document.getElementById('dice-input') as HTMLInputElement;
  const diceAddBtn = document.getElementById('dice-add') as HTMLButtonElement;
  const pillsContainer = document.getElementById('dice-pills')!;

  advToggle.classList.toggle('active', showAdvantage);
  disToggle.classList.toggle('active', showDisadvantage);

  function save(): void {
    saveSettings({
      diceList: diceConfigs.map(c => c.label),
      showAdvantage,
      showDisadvantage,
    });
  }

  function renderPills(): void {
    while (pillsContainer.firstChild) {
      pillsContainer.removeChild(pillsContainer.firstChild);
    }
    for (let i = 0; i < diceConfigs.length; i++) {
      const pill = document.createElement('div');
      pill.className = 'dice-pill';

      const text = document.createElement('span');
      text.textContent = diceConfigs[i].label;
      pill.appendChild(text);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '\u00d7';
      const idx = i;
      removeBtn.addEventListener('click', () => {
        diceConfigs.splice(idx, 1);
        update();
      });
      pill.appendChild(removeBtn);

      pillsContainer.appendChild(pill);
    }
  }

  function handleConfigChange(index: number, config: DiceConfig, presetName: string): void {
    diceConfigs[index] = config;
    saveDiceThresholds(config.label, {
      presetName,
      categories: config.categories,
      thresholds: config.thresholds,
      minMod: config.minMod,
      maxMod: config.maxMod,
    }).catch(() => {});
  }

  function handleDialogClose(): void {
    update();
  }

  function update(): void {
    renderPage(rowsContainer, diceConfigs, showAdvantage, showDisadvantage, handleConfigChange, handleDialogClose);
    renderPills();
    save();
  }

  function addDice(): void {
    const raw = diceInput.value.trim().toLowerCase();
    if (!raw) return;

    const parsed = parseDiceNotation(raw);
    if (!parsed) return;

    const label = parsed.count + 'd' + parsed.sides;
    if (diceConfigs.some(c => c.label === label)) return;

    diceConfigs.push(buildConfig(label)!);
    diceInput.value = '';
    update();
  }

  diceAddBtn.addEventListener('click', addDice);
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
