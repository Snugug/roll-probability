import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveSettings,
  saveDiceThresholds,
  loadSettings,
  type SavedSettings,
} from '../thresholds';

const STORAGE_KEY = 'dice-visualizer-settings';

function setupDOM(): void {
  // Safe DOM construction for test harness — all content is static test fixtures
  const app = document.createElement('div');
  app.id = 'app';

  const header = document.createElement('header');
  header.className = 'app-header';

  const headerTop = document.createElement('div');
  headerTop.className = 'header-top';
  const h1 = document.createElement('h1');
  h1.textContent = 'TTRPG Dice Probability';
  headerTop.appendChild(h1);

  const toggles = document.createElement('div');
  toggles.className = 'header-toggles';
  const disToggle = document.createElement('button');
  disToggle.id = 'dis-toggle';
  disToggle.className = 'toggle-btn dis active';
  disToggle.textContent = 'Disadvantage';
  const advToggle = document.createElement('button');
  advToggle.id = 'adv-toggle';
  advToggle.className = 'toggle-btn adv active';
  advToggle.textContent = 'Advantage';
  toggles.appendChild(disToggle);
  toggles.appendChild(advToggle);
  headerTop.appendChild(toggles);
  header.appendChild(headerTop);

  const controls = document.createElement('div');
  controls.className = 'header-controls';

  const inputGroup = document.createElement('div');
  inputGroup.className = 'dice-input-group';
  const diceInput = document.createElement('input');
  diceInput.type = 'text';
  diceInput.id = 'dice-input';
  diceInput.placeholder = '3d8';
  const addBtn = document.createElement('button');
  addBtn.id = 'dice-add';
  addBtn.className = 'dice-add-btn';
  addBtn.setAttribute('aria-label', 'Add dice');
  addBtn.textContent = '+';
  inputGroup.appendChild(diceInput);
  inputGroup.appendChild(addBtn);
  controls.appendChild(inputGroup);

  const pills = document.createElement('div');
  pills.id = 'dice-pills';
  pills.className = 'dice-pills';
  controls.appendChild(pills);

  const modInputs = document.createElement('div');
  modInputs.className = 'mod-inputs';
  const minLabel = document.createElement('label');
  minLabel.textContent = 'Min: ';
  const minInput = document.createElement('input');
  minInput.type = 'number';
  minInput.id = 'min-mod';
  minInput.value = '-2';
  minLabel.appendChild(minInput);
  const maxLabel = document.createElement('label');
  maxLabel.textContent = 'Max: ';
  const maxInput = document.createElement('input');
  maxInput.type = 'number';
  maxInput.id = 'max-mod';
  maxInput.value = '5';
  maxLabel.appendChild(maxInput);
  modInputs.appendChild(minLabel);
  modInputs.appendChild(maxLabel);
  controls.appendChild(modInputs);

  header.appendChild(controls);
  app.appendChild(header);

  const rows = document.createElement('div');
  rows.id = 'dice-rows';
  app.appendChild(rows);

  document.body.appendChild(app);
}

async function clearIndexedDB(): Promise<void> {
  const dbs = await indexedDB.databases();
  await Promise.all(
    dbs
      .filter(db => db.name)
      .map(
        db =>
          new Promise<void>((resolve, reject) => {
            const req = indexedDB.deleteDatabase(db.name!);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
            req.onblocked = () => resolve();
          })
      )
  );
}

async function loadInit() {
  const mod = await import('../main');
  return mod.init;
}

describe('main — loadSettings', () => {
  beforeEach(async () => {
    vi.resetModules();
    await clearIndexedDB();
    localStorage.clear();
    document.body.replaceChildren();
    setupDOM();
  });

  it('uses defaults when no saved data', async () => {
    const init = await loadInit();
    await init();
    expect(document.querySelectorAll('dice-row').length).toBe(3);
    expect(document.querySelectorAll('.dice-pill').length).toBe(3);
  });

  it('loads saved settings from IndexedDB', async () => {
    await saveSettings({
      diceList: ['2d6'],
      minMod: 0,
      maxMod: 3,
      showAdvantage: false,
      showDisadvantage: false,
    });
    const init = await loadInit();
    await init();
    expect(document.querySelectorAll('dice-row').length).toBe(1);
    expect((document.getElementById('min-mod') as HTMLInputElement).value).toBe('0');
    expect((document.getElementById('max-mod') as HTMLInputElement).value).toBe('3');
    expect(document.getElementById('adv-toggle')!.classList.contains('active')).toBe(false);
    expect(document.getElementById('dis-toggle')!.classList.contains('active')).toBe(false);
  });

  it('skips invalid dice notation in saved diceList', async () => {
    await saveSettings({
      diceList: ['2d6', 'bad', '2d8'],
      minMod: -2,
      maxMod: 5,
      showAdvantage: true,
      showDisadvantage: true,
    });
    const init = await loadInit();
    await init();
    expect(document.querySelectorAll('dice-row').length).toBe(2);
  });

  it('shows PbtA categories by default (Miss, Weak Hit, Strong Hit)', async () => {
    const init = await loadInit();
    await init();
    const rangeItems = document.querySelectorAll('.dice-range-item');
    // 3 default dice x 3 categories each = 9 range items
    expect(rangeItems.length).toBe(9);
    // First row should have Miss, Weak Hit, Strong Hit
    const firstRowItems = document.querySelector('dice-row')!.querySelectorAll('.dice-range-item');
    expect(firstRowItems[0].textContent).toContain('Miss');
    expect(firstRowItems[1].textContent).toContain('Weak Hit');
    expect(firstRowItems[2].textContent).toContain('Strong Hit');
  });

  it('uses saved thresholds from IndexedDB when available', async () => {
    await saveSettings({
      diceList: ['2d6'],
      minMod: 0,
      maxMod: 0,
      showAdvantage: false,
      showDisadvantage: false,
    });
    await saveDiceThresholds('2d6', {
      presetName: 'Custom',
      thresholds: [5, 8],
      categories: [
        { label: 'Fail', color: '#ff0000' },
        { label: 'Partial', color: '#ffff00' },
        { label: 'Success', color: '#00ff00' },
      ],
    });
    const init = await loadInit();
    await init();
    const rangeItems = document.querySelector('dice-row')!.querySelectorAll('.dice-range-item');
    expect(rangeItems[0].textContent).toContain('Fail');
    expect(rangeItems[1].textContent).toContain('Partial');
    expect(rangeItems[2].textContent).toContain('Success');
  });
});

describe('main — addDice', () => {
  beforeEach(async () => {
    vi.resetModules();
    await clearIndexedDB();
    localStorage.clear();
    document.body.replaceChildren();
    setupDOM();
  });

  it('adds a dice type via the add button', async () => {
    await saveSettings({
      diceList: ['2d6'],
      minMod: -2,
      maxMod: 5,
      showAdvantage: true,
      showDisadvantage: true,
    });
    const init = await loadInit();
    await init();

    const input = document.getElementById('dice-input') as HTMLInputElement;
    const btn = document.getElementById('dice-add') as HTMLButtonElement;
    input.value = '3d8';
    btn.click();

    expect(document.querySelectorAll('dice-row').length).toBe(2);
    expect(document.querySelectorAll('.dice-pill').length).toBe(2);
    expect(input.value).toBe('');
  });

  it('adds a dice type via Enter key', async () => {
    await saveSettings({
      diceList: ['2d6'],
      minMod: -2,
      maxMod: 5,
      showAdvantage: true,
      showDisadvantage: true,
    });
    const init = await loadInit();
    await init();

    const input = document.getElementById('dice-input') as HTMLInputElement;
    input.value = '2d10';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(document.querySelectorAll('dice-row').length).toBe(2);
  });

  it('does not add on non-Enter keydown', async () => {
    await saveSettings({
      diceList: ['2d6'],
      minMod: -2,
      maxMod: 5,
      showAdvantage: true,
      showDisadvantage: true,
    });
    const init = await loadInit();
    await init();

    const input = document.getElementById('dice-input') as HTMLInputElement;
    input.value = '2d10';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));

    expect(document.querySelectorAll('dice-row').length).toBe(1);
  });

  it('ignores empty input', async () => {
    await saveSettings({
      diceList: ['2d6'],
      minMod: -2,
      maxMod: 5,
      showAdvantage: true,
      showDisadvantage: true,
    });
    const init = await loadInit();
    await init();

    (document.getElementById('dice-input') as HTMLInputElement).value = '';
    (document.getElementById('dice-add') as HTMLButtonElement).click();

    expect(document.querySelectorAll('dice-row').length).toBe(1);
  });

  it('ignores invalid notation', async () => {
    await saveSettings({
      diceList: ['2d6'],
      minMod: -2,
      maxMod: 5,
      showAdvantage: true,
      showDisadvantage: true,
    });
    const init = await loadInit();
    await init();

    (document.getElementById('dice-input') as HTMLInputElement).value = 'foo';
    (document.getElementById('dice-add') as HTMLButtonElement).click();

    expect(document.querySelectorAll('dice-row').length).toBe(1);
  });

  it('ignores duplicates', async () => {
    await saveSettings({
      diceList: ['2d6'],
      minMod: -2,
      maxMod: 5,
      showAdvantage: true,
      showDisadvantage: true,
    });
    const init = await loadInit();
    await init();

    (document.getElementById('dice-input') as HTMLInputElement).value = '2d6';
    (document.getElementById('dice-add') as HTMLButtonElement).click();

    expect(document.querySelectorAll('dice-row').length).toBe(1);
  });
});

describe('main — removeDice', () => {
  beforeEach(async () => {
    vi.resetModules();
    await clearIndexedDB();
    localStorage.clear();
    document.body.replaceChildren();
    setupDOM();
  });

  it('removes a dice type when pill x is clicked', async () => {
    const init = await loadInit();
    await init();

    expect(document.querySelectorAll('dice-row').length).toBe(3);
    const removeBtn = document.querySelector('.dice-pill button') as HTMLButtonElement;
    removeBtn.click();
    expect(document.querySelectorAll('dice-row').length).toBe(2);
  });
});

describe('main — toggles', () => {
  beforeEach(async () => {
    vi.resetModules();
    await clearIndexedDB();
    localStorage.clear();
    document.body.replaceChildren();
    setupDOM();
  });

  it('toggles advantage off and on', async () => {
    const init = await loadInit();
    await init();

    const btn = document.getElementById('adv-toggle')!;
    expect(btn.classList.contains('active')).toBe(true);
    btn.click();
    expect(btn.classList.contains('active')).toBe(false);
    btn.click();
    expect(btn.classList.contains('active')).toBe(true);
  });

  it('toggles disadvantage off and on', async () => {
    const init = await loadInit();
    await init();

    const btn = document.getElementById('dis-toggle')!;
    expect(btn.classList.contains('active')).toBe(true);
    btn.click();
    expect(btn.classList.contains('active')).toBe(false);
  });
});

describe('main — modifier inputs', () => {
  beforeEach(async () => {
    vi.resetModules();
    await clearIndexedDB();
    localStorage.clear();
    document.body.replaceChildren();
    setupDOM();
  });

  it('updates min modifier on change', async () => {
    const init = await loadInit();
    await init();

    const minInput = document.getElementById('min-mod') as HTMLInputElement;
    minInput.value = '0';
    minInput.dispatchEvent(new Event('change'));

    // Let the fire-and-forget save complete
    await new Promise(r => setTimeout(r, 0));
    const saved = await loadSettings();
    expect(saved.minMod).toBe(0);
  });

  it('clamps max up when min exceeds max', async () => {
    const init = await loadInit();
    await init();

    const minInput = document.getElementById('min-mod') as HTMLInputElement;
    const maxInput = document.getElementById('max-mod') as HTMLInputElement;
    minInput.value = '10';
    minInput.dispatchEvent(new Event('change'));

    expect(maxInput.value).toBe('10');
  });

  it('clamps min down when max goes below min', async () => {
    const init = await loadInit();
    await init();

    const minInput = document.getElementById('min-mod') as HTMLInputElement;
    const maxInput = document.getElementById('max-mod') as HTMLInputElement;
    maxInput.value = '-5';
    maxInput.dispatchEvent(new Event('change'));

    expect(minInput.value).toBe('-5');
  });

  it('ignores NaN min value', async () => {
    const init = await loadInit();
    await init();

    const minInput = document.getElementById('min-mod') as HTMLInputElement;
    minInput.value = '';
    minInput.dispatchEvent(new Event('change'));

    // Let the fire-and-forget save complete
    await new Promise(r => setTimeout(r, 0));
    const saved = await loadSettings();
    expect(saved.minMod).toBe(-2);
  });

  it('ignores NaN max value', async () => {
    const init = await loadInit();
    await init();

    const maxInput = document.getElementById('max-mod') as HTMLInputElement;
    maxInput.value = '';
    maxInput.dispatchEvent(new Event('change'));

    // Let the fire-and-forget save complete
    await new Promise(r => setTimeout(r, 0));
    const saved = await loadSettings();
    expect(saved.maxMod).toBe(5);
  });
});

describe('main — persistence', () => {
  beforeEach(async () => {
    vi.resetModules();
    await clearIndexedDB();
    localStorage.clear();
    document.body.replaceChildren();
    setupDOM();
  });

  it('saves settings to IndexedDB on init', async () => {
    const init = await loadInit();
    await init();

    // Let the fire-and-forget save complete
    await new Promise(r => setTimeout(r, 0));
    const saved = await loadSettings();
    expect(saved.diceList).toEqual(['2d6', '2d12', '1d20']);
    expect(saved.minMod).toBe(-2);
    expect(saved.maxMod).toBe(5);
    expect(saved.showAdvantage).toBe(true);
    expect(saved.showDisadvantage).toBe(true);
  });

  it('persists after adding dice', async () => {
    await saveSettings({
      diceList: ['2d6'],
      minMod: -2,
      maxMod: 5,
      showAdvantage: true,
      showDisadvantage: true,
    });
    const init = await loadInit();
    await init();

    (document.getElementById('dice-input') as HTMLInputElement).value = '2d8';
    (document.getElementById('dice-add') as HTMLButtonElement).click();

    // Let the fire-and-forget save complete
    await new Promise(r => setTimeout(r, 0));
    const saved = await loadSettings();
    expect(saved.diceList).toEqual(['2d6', '2d8']);
  });
});

describe('main — migration', () => {
  beforeEach(async () => {
    vi.resetModules();
    await clearIndexedDB();
    localStorage.clear();
    document.body.replaceChildren();
    setupDOM();
  });

  it('migrates settings from localStorage to IndexedDB', async () => {
    const legacy: SavedSettings = {
      diceList: ['1d4', '1d8'],
      minMod: 0,
      maxMod: 4,
      showAdvantage: false,
      showDisadvantage: false,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const init = await loadInit();
    await init();

    // Migration should have moved data to IndexedDB
    const saved = await loadSettings();
    expect(saved.diceList).toEqual(['1d4', '1d8']);
    expect(saved.minMod).toBe(0);
    expect(saved.maxMod).toBe(4);
    expect(saved.showAdvantage).toBe(false);
    expect(saved.showDisadvantage).toBe(false);
  });

  it('removes localStorage key after migration', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      diceList: ['2d6'],
      minMod: -1,
      maxMod: 2,
      showAdvantage: true,
      showDisadvantage: false,
    }));

    const init = await loadInit();
    await init();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
