import { computeOptimalThresholds, parseDiceNotation, type DiceConfig } from './engine';
import { renderPage } from './renderer';
import './style.css';

const BASELINE_MISS = (15 / 36) * 100;
const BASELINE_WEAK = (15 / 36) * 100;
const BASELINE_STRONG = (6 / 36) * 100;

const STORAGE_KEY = 'dice-visualizer-settings';

interface SavedSettings {
  diceList: string[];
  minMod: number;
  maxMod: number;
  showAdvantage: boolean;
  showDisadvantage: boolean;
}

const DEFAULTS: SavedSettings = {
  diceList: ['2d6', '2d8', '2d10', '2d12'],
  minMod: -2,
  maxMod: 5,
  showAdvantage: true,
  showDisadvantage: true,
};

function loadSettings(): SavedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.diceList)) return { ...DEFAULTS };
    return {
      diceList: parsed.diceList.filter((s: unknown) => typeof s === 'string'),
      minMod: typeof parsed.minMod === 'number' ? parsed.minMod : DEFAULTS.minMod,
      maxMod: typeof parsed.maxMod === 'number' ? parsed.maxMod : DEFAULTS.maxMod,
      showAdvantage: typeof parsed.showAdvantage === 'boolean' ? parsed.showAdvantage : DEFAULTS.showAdvantage,
      showDisadvantage: typeof parsed.showDisadvantage === 'boolean' ? parsed.showDisadvantage : DEFAULTS.showDisadvantage,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(settings: SavedSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function buildConfig(label: string): DiceConfig | null {
  const parsed = parseDiceNotation(label);
  if (!parsed) return null;
  const t = computeOptimalThresholds(parsed.count, parsed.sides, BASELINE_MISS, BASELINE_WEAK, BASELINE_STRONG);
  return {
    count: parsed.count,
    sides: parsed.sides,
    label,
    missMax: t.missMax,
    weakMax: t.weakMax,
  };
}

export function init(): void {
  const settings = loadSettings();
  const diceConfigs: DiceConfig[] = [];

  for (const label of settings.diceList) {
    const config = buildConfig(label);
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

  function update(): void {
    renderPage(rowsContainer, diceConfigs, minMod, maxMod, showAdvantage, showDisadvantage);
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

document.addEventListener('DOMContentLoaded', init);
