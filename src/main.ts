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

function buildConfig(label: string): DiceConfig | null {
  const parsed = parseDiceNotation(label);
  if (!parsed) return null;
  const thresholds = mapThresholds(PBTA_PRESET, parsed.count, parsed.sides);
  return {
    count: parsed.count,
    sides: parsed.sides,
    label,
    thresholds,
    categories: PBTA_PRESET.categories,
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

  let minMod = settings.minMod;
  let maxMod = settings.maxMod;
  let showAdvantage = settings.showAdvantage;
  let showDisadvantage = settings.showDisadvantage;

  const rowsContainer = document.getElementById('dice-rows')!;
  const minInput = document.getElementById('min-mod') as HTMLInputElement;
  const maxInput = document.getElementById('max-mod') as HTMLInputElement;
  const advToggle = document.getElementById('adv-toggle') as HTMLButtonElement;
  const disToggle = document.getElementById('dis-toggle') as HTMLButtonElement;
  const diceInput = document.getElementById('dice-input') as HTMLInputElement;
  const diceAddBtn = document.getElementById('dice-add') as HTMLButtonElement;
  const pillsContainer = document.getElementById('dice-pills')!;

  minInput.value = String(minMod);
  maxInput.value = String(maxMod);
  advToggle.classList.toggle('active', showAdvantage);
  disToggle.classList.toggle('active', showDisadvantage);

  function save(): void {
    saveSettings({
      diceList: diceConfigs.map(c => c.label),
      minMod,
      maxMod,
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
    }).catch(() => {});
    update();
  }

  function update(): void {
    renderPage(rowsContainer, diceConfigs, minMod, maxMod, showAdvantage, showDisadvantage, handleConfigChange);
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

  minInput.addEventListener('change', () => {
    const val = parseInt(minInput.value, 10);
    if (!isNaN(val)) {
      minMod = val;
      if (minMod > maxMod) {
        maxMod = minMod;
        maxInput.value = String(maxMod);
      }
      update();
    }
  });

  maxInput.addEventListener('change', () => {
    const val = parseInt(maxInput.value, 10);
    if (!isNaN(val)) {
      maxMod = val;
      if (maxMod < minMod) {
        minMod = maxMod;
        minInput.value = String(minMod);
      }
      update();
    }
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
