import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveSettings,
  loadSettings,
  loadDiceThresholds,
  createDiceThreshold,
  saveDiceThresholds,
  saveCustomPreset,
  loadCustomPresets,
} from '../src/thresholds';

function setupDOM(): void {
  const app = document.createElement('div');
  app.id = 'app';

  const header = document.createElement('header');
  header.className = 'app-header';

  const titleRow = document.createElement('div');
  titleRow.className = 'title-row';
  const h1 = document.createElement('h1');
  h1.textContent = 'TTRPG Dice Probability';
  titleRow.appendChild(h1);
  const titleActions = document.createElement('div');
  titleActions.className = 'title-actions';
  const downloadBtn = document.createElement('button');
  downloadBtn.id = 'download-btn';
  downloadBtn.className = 'icon-btn';
  downloadBtn.setAttribute('aria-label', 'Download config');
  const uploadBtn = document.createElement('button');
  uploadBtn.id = 'upload-btn';
  uploadBtn.className = 'icon-btn';
  uploadBtn.setAttribute('aria-label', 'Upload config');
  titleActions.appendChild(downloadBtn);
  titleActions.appendChild(uploadBtn);
  titleRow.appendChild(titleActions);
  header.appendChild(titleRow);

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

  const disToggle = document.createElement('button');
  disToggle.id = 'dis-toggle';
  disToggle.className = 'toggle-btn dis active';
  disToggle.textContent = 'Disadvantage';
  controls.appendChild(disToggle);

  const advToggle = document.createElement('button');
  advToggle.id = 'adv-toggle';
  advToggle.className = 'toggle-btn adv active';
  advToggle.textContent = 'Advantage';
  controls.appendChild(advToggle);

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
  const mod = await import('../src/main');
  return mod.init;
}

async function createTestDiceEntry(label: string, overrides?: Record<string, any>): Promise<number> {
  const match = label.match(/^(\d+)d(\d+)$/);
  const count = match ? parseInt(match[1]) : 2;
  const sides = match ? parseInt(match[2]) : 6;
  return createDiceThreshold({
    name: label,
    terms: [{ sign: '+', count, sides }],
    presetName: 'PbtA',
    thresholds: [7, 10],
    categories: [
      { label: 'Miss', color: '#f87171' },
      { label: 'Weak Hit', color: '#facc15' },
      { label: 'Strong Hit', color: '#4ade80' },
    ],
    criticals: { type: 'none' },
    minMod: -2,
    maxMod: 5,
    ...overrides,
  });
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
  });

  it('loads saved settings from IndexedDB', async () => {
    const id = await createTestDiceEntry('2d6');
    await saveSettings({
      diceList: [id],
      showAdvantage: false,
      showDisadvantage: false,
    });
    const init = await loadInit();
    await init();
    expect(document.querySelectorAll('dice-row').length).toBe(1);
    expect(document.getElementById('adv-toggle')!.classList.contains('active')).toBe(false);
    expect(document.getElementById('dis-toggle')!.classList.contains('active')).toBe(false);
  });

  it('skips missing dice IDs in saved diceList', async () => {
    const id1 = await createTestDiceEntry('2d6');
    const id2 = await createTestDiceEntry('2d8');
    await saveSettings({
      diceList: [id1, 9999, id2],
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

  it('defaults minMod/maxMod when saved thresholds lack them', async () => {
    const id = await createTestDiceEntry('2d6');
    await saveSettings({
      diceList: [id],
      showAdvantage: true,
      showDisadvantage: true,
    });
    // Overwrite the saved threshold without minMod/maxMod (simulating legacy data)
    await saveDiceThresholds({
      id,
      name: '2d6',
      terms: [{ sign: '+', count: 2, sides: 6 }],
      presetName: 'PbtA',
      thresholds: [7, 10],
      categories: [
        { label: 'Miss', color: '#f87171' },
        { label: 'Weak Hit', color: '#facc15' },
        { label: 'Strong Hit', color: '#4ade80' },
      ],
    } as any);
    const init = await loadInit();
    await init();
    // Should use defaults -2 and 5
    expect(document.querySelectorAll('dice-row').length).toBe(1);
    const bars = document.querySelector('.bars')!;
    // -2 to 5 = 8 bar columns
    expect(bars.querySelectorAll('bar-column').length).toBe(8);
  });

  it('uses saved thresholds from IndexedDB when available', async () => {
    const id = await createTestDiceEntry('2d6', {
      presetName: 'Custom',
      thresholds: [5, 8],
      categories: [
        { label: 'Fail', color: '#ff0000' },
        { label: 'Partial', color: '#ffff00' },
        { label: 'Success', color: '#00ff00' },
      ],
    });
    await saveSettings({
      diceList: [id],
      showAdvantage: false,
      showDisadvantage: false,
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
    const id = await createTestDiceEntry('2d6');
    await saveSettings({
      diceList: [id],
      showAdvantage: true,
      showDisadvantage: true,
    });
    const init = await loadInit();
    await init();

    const input = document.getElementById('dice-input') as HTMLInputElement;
    const btn = document.getElementById('dice-add') as HTMLButtonElement;
    input.value = '3d8';
    btn.click();
    await new Promise(r => setTimeout(r, 50));

    expect(document.querySelectorAll('dice-row').length).toBe(2);
    expect(input.value).toBe('');
  });

  it('adds a dice type via Enter key', async () => {
    const id = await createTestDiceEntry('2d6');
    await saveSettings({
      diceList: [id],
      showAdvantage: true,
      showDisadvantage: true,
    });
    const init = await loadInit();
    await init();

    const input = document.getElementById('dice-input') as HTMLInputElement;
    input.value = '2d10';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await new Promise(r => setTimeout(r, 50));

    expect(document.querySelectorAll('dice-row').length).toBe(2);
  });

  it('does not add on non-Enter keydown', async () => {
    const id = await createTestDiceEntry('2d6');
    await saveSettings({
      diceList: [id],
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
    const id = await createTestDiceEntry('2d6');
    await saveSettings({
      diceList: [id],
      showAdvantage: true,
      showDisadvantage: true,
    });
    const init = await loadInit();
    await init();

    (document.getElementById('dice-input') as HTMLInputElement).value = '';
    (document.getElementById('dice-add') as HTMLButtonElement).click();
    await new Promise(r => setTimeout(r, 50));

    expect(document.querySelectorAll('dice-row').length).toBe(1);
  });

  it('ignores invalid notation', async () => {
    const id = await createTestDiceEntry('2d6');
    await saveSettings({
      diceList: [id],
      showAdvantage: true,
      showDisadvantage: true,
    });
    const init = await loadInit();
    await init();

    (document.getElementById('dice-input') as HTMLInputElement).value = 'foo';
    (document.getElementById('dice-add') as HTMLButtonElement).click();
    await new Promise(r => setTimeout(r, 50));

    expect(document.querySelectorAll('dice-row').length).toBe(1);
  });

  it('allows adding duplicate notation', async () => {
    const init = await loadInit();
    await init();
    const input = document.getElementById('dice-input') as HTMLInputElement;
    const btn = document.getElementById('dice-add') as HTMLButtonElement;
    input.value = '2d6';
    btn.click();
    await new Promise(r => setTimeout(r, 50));
    expect(document.querySelectorAll('dice-row').length).toBe(4);
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
    await new Promise(r => setTimeout(r, 0));
    const saved = await loadSettings();
    expect(saved).not.toBeNull();
    expect(saved!.diceList).toHaveLength(3);
    expect(typeof saved!.diceList[0]).toBe('number');
  });

  it('persists after adding dice', async () => {
    const id = await createTestDiceEntry('2d6');
    await saveSettings({
      diceList: [id],
      showAdvantage: true,
      showDisadvantage: true,
    });
    const init = await loadInit();
    await init();

    (document.getElementById('dice-input') as HTMLInputElement).value = '2d8';
    (document.getElementById('dice-add') as HTMLButtonElement).click();
    await new Promise(r => setTimeout(r, 50));

    const saved = await loadSettings();
    expect(saved).not.toBeNull();
    expect(saved!.diceList).toHaveLength(2);
    expect(typeof saved!.diceList[0]).toBe('number');
    expect(typeof saved!.diceList[1]).toBe('number');
  });

  it('re-renders page when dialog closes', async () => {
    const init = await loadInit();
    await init();

    const row = document.querySelector('dice-row') as any;
    expect(row.onDialogClose).toBeTruthy();
    // Modify config directly, then trigger dialog close to re-render
    row.config.thresholds = [8, 11];
    row.onDialogClose();
    await new Promise(r => setTimeout(r, 50));
    // Page should have re-rendered with updated thresholds
    const rangeItems = document.querySelector('dice-row')!.querySelectorAll('.dice-range-item');
    expect(rangeItems[0].textContent).toContain('\u22647');
  });

  it('syncs preset-level fields to all dice using the same custom preset on dialog close', async () => {
    await saveCustomPreset({
      name: 'Shared',
      referenceDie: '2d6',
      thresholds: [7, 10],
      categories: [
        { label: 'Miss', color: '#f87171' },
        { label: 'Weak Hit', color: '#facc15' },
        { label: 'Strong Hit', color: '#4ade80' },
      ],
      criticals: { type: 'none' },
      advantageMethod: 'plus-one-drop-low',
      disadvantageMethod: 'plus-one-drop-high',
      minMod: -2,
      maxMod: 5,
    });

    const id1 = await createTestDiceEntry('2d6', { presetName: 'Shared' });
    const id2 = await createTestDiceEntry('2d6', { presetName: 'Shared' });
    await saveSettings({ diceList: [id1, id2], showAdvantage: true, showDisadvantage: true });

    const init = await loadInit();
    await init();
    await new Promise(r => setTimeout(r, 50));

    const rows = document.querySelectorAll('dice-row');
    const row1 = rows[0] as any;

    // Edit the preset through row1's dialog: change advantage method
    row1._state.customPresets = await loadCustomPresets();
    row1._state.switchToCustomPreset(row1._state.customPresets.find((p: any) => p.name === 'Shared'));
    row1._state.setAdvantageMethod('double-dice');
    row1._state.updateMinMod(-5);

    // Close dialog — triggers sync
    await row1.onDialogClose();
    await new Promise(r => setTimeout(r, 50));

    // Row2 should now have the updated preset values
    const row2 = document.querySelectorAll('dice-row')[1] as any;
    expect(row2.config.advantageMethod).toBe('double-dice');
    expect(row2.config.minMod).toBe(-5);
  });

  it('saves dice thresholds to IndexedDB when config changes via dialog', async () => {
    const init = await loadInit();
    await init();

    // Get the dice-row element and trigger its onConfigChange callback
    const row = document.querySelector('dice-row') as any;
    if (row && row.onConfigChange) {
      const firstConfig = row.config;
      const newConfig = {
        id: firstConfig.id,
        terms: [{ sign: '+' as const, count: 2, sides: 6 }], label: '2d6',
        name: '2d6',
        thresholds: [6, 11],
        categories: [
          { label: 'Bad', color: '#ff0000' },
          { label: 'OK', color: '#ffff00' },
          { label: 'Good', color: '#00ff00' },
        ],
        criticals: { type: 'none' as const },
        minMod: -1,
        maxMod: 3,
        advantageMethod: 'plus-one-drop-low' as const,
        disadvantageMethod: 'plus-one-drop-high' as const,
      };
      row.onConfigChange(newConfig, 'Custom');
      await new Promise(r => setTimeout(r, 50));
      const saved = await loadDiceThresholds(firstConfig.id);
      expect(saved).not.toBeNull();
      expect(saved!.presetName).toBe('Custom');
      expect(saved!.thresholds).toEqual([6, 11]);
      expect(saved!.name).toBe('2d6');
      expect(saved!.terms).toEqual([{ sign: '+', count: 2, sides: 6 }]);
      expect(saved!.minMod).toBe(-1);
      expect(saved!.maxMod).toBe(3);
    }
  });

  it('preserves viewMode through save and load cycle', async () => {
    const id = await createTestDiceEntry('2d6', { viewMode: 'table' });
    const loaded = await loadDiceThresholds(id);
    expect(loaded!.viewMode).toBe('table');
  });

  it('defaults viewMode to undefined when not present', async () => {
    const id = await createTestDiceEntry('2d6');
    const loaded = await loadDiceThresholds(id);
    expect(loaded!.viewMode).toBeUndefined();
  });

  it('deletes dice row via dialog delete button', async () => {
    const init = await loadInit();
    await init();

    expect(document.querySelectorAll('dice-row').length).toBe(3);
    const row = document.querySelector('dice-row') as any;
    const firstId = row.config.id;

    // Click the delete button in the dialog
    const deleteBtn = row._dialog.querySelector('.dialog-delete') as HTMLButtonElement;
    deleteBtn.click();
    await new Promise(r => setTimeout(r, 50));

    // Row removed from DOM
    expect(document.querySelectorAll('dice-row').length).toBe(2);

    // Settings updated
    const saved = await loadSettings();
    expect(saved).not.toBeNull();
    expect(saved!.diceList).toHaveLength(2);
    expect(saved!.diceList).not.toContain(firstId);

    // Threshold record removed from IDB
    const loaded = await loadDiceThresholds(firstId);
    expect(loaded).toBeNull();
  });
});

describe('main — import/export buttons', () => {
  beforeEach(async () => {
    vi.resetModules();
    await clearIndexedDB();
    localStorage.clear();
    document.body.replaceChildren();
    setupDOM();
  });

  it('renders download and upload buttons in the title row', async () => {
    const init = await loadInit();
    await init();
    const downloadBtn = document.getElementById('download-btn');
    const uploadBtn = document.getElementById('upload-btn');
    expect(downloadBtn).not.toBeNull();
    expect(uploadBtn).not.toBeNull();
    expect(downloadBtn!.querySelector('svg')).not.toBeNull();
    expect(uploadBtn!.querySelector('svg')).not.toBeNull();
  });

  it('download button is inside the title row', async () => {
    const init = await loadInit();
    await init();
    const titleRow = document.querySelector('.title-row');
    expect(titleRow).not.toBeNull();
    expect(titleRow!.querySelector('#download-btn')).not.toBeNull();
    expect(titleRow!.querySelector('#upload-btn')).not.toBeNull();
  });

  it('shows toast on invalid file upload', async () => {
    const init = await loadInit();
    await init();

    const file = new File(['not json'], 'bad.json', { type: 'application/json' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const originalCreateElement = document.createElement.bind(document);
    let fileInput: HTMLInputElement | null = null;
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'input') {
        fileInput = el as HTMLInputElement;
        Object.defineProperty(fileInput, 'files', { value: dataTransfer.files });
      }
      return el;
    });

    document.getElementById('upload-btn')!.click();
    fileInput!.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 50));

    const toast = document.querySelector('.toast');
    expect(toast).not.toBeNull();
    expect(toast!.textContent).toBe('Not a valid dice config file');

    vi.restoreAllMocks();
  });

  it('shows confirmation dialog on valid file upload', async () => {
    const init = await loadInit();
    await init();

    const validData = {
      version: 4,
      settings: { diceList: [1], showAdvantage: true, showDisadvantage: true },
      dice: [{
        id: 1,
        name: '2d6',
        count: 2,
        sides: 6,
        presetName: 'PbtA',
        thresholds: [7, 10],
        categories: [
          { label: 'Miss', color: '#f87171' },
          { label: 'Weak Hit', color: '#facc15' },
          { label: 'Strong Hit', color: '#4ade80' },
        ],
        minMod: -2,
        maxMod: 5,
      }],
      customPresets: [],
    };

    const file = new File([JSON.stringify(validData)], 'good.json', { type: 'application/json' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const originalCreateElement = document.createElement.bind(document);
    let fileInput: HTMLInputElement | null = null;
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'input') {
        fileInput = el as HTMLInputElement;
        Object.defineProperty(fileInput, 'files', { value: dataTransfer.files });
      }
      return el;
    });

    document.getElementById('upload-btn')!.click();
    fileInput!.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 50));

    const dialog = document.querySelector('.confirm-dialog') as HTMLDialogElement;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('replace all your current dice and presets');

    vi.restoreAllMocks();
  });

  it('applies import and reloads when Replace is clicked', async () => {
    const init = await loadInit();
    await init();

    const validData = {
      version: 4,
      settings: { diceList: [1], showAdvantage: false, showDisadvantage: false },
      dice: [{
        id: 1,
        name: '3d8',
        count: 3,
        sides: 8,
        presetName: 'PbtA',
        thresholds: [7, 10],
        categories: [
          { label: 'Miss', color: '#f87171' },
          { label: 'Weak Hit', color: '#facc15' },
          { label: 'Strong Hit', color: '#4ade80' },
        ],
        minMod: -2,
        maxMod: 5,
      }],
      customPresets: [],
    };

    const file = new File([JSON.stringify(validData)], 'good.json', { type: 'application/json' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const originalCreateElement = document.createElement.bind(document);
    let fileInput: HTMLInputElement | null = null;
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'input') {
        fileInput = el as HTMLInputElement;
        Object.defineProperty(fileInput, 'files', { value: dataTransfer.files });
      }
      return el;
    });

    // Mock location.reload
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });

    document.getElementById('upload-btn')!.click();
    fileInput!.dispatchEvent(new Event('change'));
    await new Promise(r => setTimeout(r, 50));

    // Click Replace
    const replaceBtn = document.querySelector('.confirm-replace') as HTMLButtonElement;
    expect(replaceBtn).not.toBeNull();
    replaceBtn.click();
    await new Promise(r => setTimeout(r, 50));

    // Verify data was written
    const settings = await loadSettings();
    expect(settings!.showAdvantage).toBe(false);
    expect(settings!.showDisadvantage).toBe(false);
    expect(reloadMock).toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});

describe('main — dice reorder', () => {
  beforeEach(async () => {
    vi.resetModules();
    await clearIndexedDB();
    localStorage.clear();
    document.body.replaceChildren();
    setupDOM();
  });

  it('reorders dice rows and persists new order on dice-reorder event', async () => {
    const id1 = await createTestDiceEntry('2d6');
    const id2 = await createTestDiceEntry('2d8');
    const id3 = await createTestDiceEntry('2d10');
    await saveSettings({
      diceList: [id1, id2, id3],
      showAdvantage: true,
      showDisadvantage: true,
    });

    const init = await loadInit();
    await init();

    const rowsContainer = document.getElementById('dice-rows')!;
    const rows = rowsContainer.querySelectorAll('dice-row');
    expect(rows.length).toBe(3);

    rows[0].dispatchEvent(new CustomEvent('dice-reorder', {
      detail: { fromId: id1, toId: id3, position: 'after' },
      bubbles: true,
    }));

    await new Promise(resolve => setTimeout(resolve, 0));

    const reordered = rowsContainer.querySelectorAll('dice-row');
    expect(reordered[0].getAttribute('data-id')).toBe(String(id2));
    expect(reordered[1].getAttribute('data-id')).toBe(String(id3));
    expect(reordered[2].getAttribute('data-id')).toBe(String(id1));

    const settings = await loadSettings();
    expect(settings!.diceList).toEqual([id2, id3, id1]);
  });

  it('deletes the right row after reorder (id-based lookup)', async () => {
    const id1 = await createTestDiceEntry('2d6');
    const id2 = await createTestDiceEntry('2d8');
    const id3 = await createTestDiceEntry('2d10');
    await saveSettings({
      diceList: [id1, id2, id3],
      showAdvantage: true,
      showDisadvantage: true,
    });

    const init = await loadInit();
    await init();

    const rowsContainer = document.getElementById('dice-rows')!;

    rowsContainer.querySelector(`dice-row[data-id="${id1}"]`)!
      .dispatchEvent(new CustomEvent('dice-reorder', {
        detail: { fromId: id1, toId: id3, position: 'after' },
        bubbles: true,
      }));
    await new Promise(resolve => setTimeout(resolve, 0));

    const targetRow = rowsContainer.querySelector(`dice-row[data-id="${id1}"]`) as any;
    targetRow.onDelete?.();
    await new Promise(resolve => setTimeout(resolve, 0));

    const remaining = rowsContainer.querySelectorAll('dice-row');
    expect(remaining.length).toBe(2);
    const remainingIds = Array.from(remaining).map(r => r.getAttribute('data-id'));
    expect(remainingIds).toEqual([String(id2), String(id3)]);
  });
});
