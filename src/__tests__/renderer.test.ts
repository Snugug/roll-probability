import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DiceConfig } from '../thresholds';
import * as thresholds from '../thresholds';
import { renderPage } from '../renderer';

const config2d6: DiceConfig = {
  count: 2, sides: 6, label: '2d6',
  thresholds: [7, 10],
  categories: [
    { label: 'Miss', color: '#f87171' },
    { label: 'Weak Hit', color: '#facc15' },
    { label: 'Strong Hit', color: '#4ade80' },
  ],
  minMod: -2,
  maxMod: 5,
};

const config1d20: DiceConfig = {
  count: 1, sides: 20, label: '1d20',
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
  minMod: -2,
  maxMod: 5,
};

let container: HTMLElement;

function deepConfig(cfg: typeof config2d6, overrides: Partial<typeof config2d6> = {}): typeof config2d6 {
  return {
    ...cfg,
    thresholds: [...cfg.thresholds],
    categories: cfg.categories.map(c => ({ ...c })),
    ...overrides,
  };
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

describe('renderPage', () => {
  it('creates a dice-row for each config', () => {
    renderPage(container, [config2d6, config1d20], false, false);
    expect(container.querySelectorAll('dice-row').length).toBe(2);
  });

  it('clears previous content before rendering', () => {
    renderPage(container, [config2d6, config1d20], false, false);
    renderPage(container, [config2d6], false, false);
    expect(container.querySelectorAll('dice-row').length).toBe(1);
  });

  it('renders nothing for empty configs', () => {
    renderPage(container, [], false, false);
    expect(container.children.length).toBe(0);
  });
});

describe('dice-row', () => {
  it('renders header with label and N colored range items', () => {
    renderPage(container, [config2d6], false, false);
    const row = container.querySelector('dice-row')!;
    expect(row.querySelector('.dice-label')!.textContent).toBe('2d6');
    const items = row.querySelectorAll('.dice-range-item');
    expect(items.length).toBe(3);
    expect(items[0].textContent).toBe('Miss <7');
    expect(items[1].textContent).toBe('Weak Hit 7\u20139');
    expect(items[2].textContent).toBe('Strong Hit 10+');
  });

  it('renders inline swatch colors', () => {
    renderPage(container, [config2d6], false, false);
    const swatches = container.querySelectorAll('.range-swatch');
    expect((swatches[0] as HTMLElement).style.backgroundColor).toBeTruthy();
    expect((swatches[1] as HTMLElement).style.backgroundColor).toBeTruthy();
    expect((swatches[2] as HTMLElement).style.backgroundColor).toBeTruthy();
  });

  it('renders 7 range items for D&D config', () => {
    renderPage(container, [config1d20], false, false);
    const items = container.querySelectorAll('.dice-range-item');
    expect(items.length).toBe(7);
    expect(items[0].textContent).toBe('Trivial <5');
    expect(items[6].textContent).toBe('Nearly Impossible 30+');
  });

  it('creates bar-columns for each modifier in range', () => {
    renderPage(container, [{ ...config2d6, minMod: -1, maxMod: 1 }], false, false);
    const bars = container.querySelector('.bars')!;
    expect(bars.querySelectorAll('bar-column').length).toBe(3);
  });

  it('renders a gear icon button', () => {
    renderPage(container, [config2d6], false, false);
    const gearBtn = container.querySelector('.gear-btn');
    expect(gearBtn).toBeTruthy();
    expect(gearBtn!.getAttribute('commandfor')).toBe('dialog-2d6');
    expect(gearBtn!.getAttribute('command')).toBe('show-modal');
  });

  it('renders a dialog element', () => {
    renderPage(container, [config2d6], false, false);
    const dialog = container.querySelector('dialog#dialog-2d6');
    expect(dialog).toBeTruthy();
  });
});

describe('bar-column', () => {
  it('shows all three sub-bars when both toggles on', () => {
    renderPage(container, [{ ...config2d6, minMod: 0, maxMod: 0 }], true, true);
    const bars = container.querySelector('.bars')!;
    expect(bars.querySelectorAll('stacked-bar').length).toBe(3);
  });

  it('shows only normal bar when both toggles off', () => {
    renderPage(container, [{ ...config2d6, minMod: 0, maxMod: 0 }], false, false);
    const bars = container.querySelector('.bars')!;
    expect(bars.querySelectorAll('stacked-bar').length).toBe(1);
  });

  it('renders positive modifier label', () => {
    renderPage(container, [{ ...config2d6, minMod: 2, maxMod: 2 }], false, false);
    expect(container.querySelector('.mod-label')!.textContent).toBe('+2');
  });

  it('renders negative modifier label', () => {
    renderPage(container, [{ ...config2d6, minMod: -1, maxMod: -1 }], false, false);
    expect(container.querySelector('.mod-label')!.textContent).toBe('-1');
  });
});

describe('dialog', () => {
  it('contains .dialog-header h3 with "{label} Thresholds"', () => {
    renderPage(container, [config2d6], false, false);
    const dialog = container.querySelector('dialog')!;
    const h3 = dialog.querySelector('.dialog-header h3')!;
    expect(h3.textContent).toBe('2d6 Thresholds');
  });

  it('contains .dialog-preview section', () => {
    renderPage(container, [config2d6], false, false);
    const dialog = container.querySelector('dialog')!;
    expect(dialog.querySelector('.dialog-preview')).toBeTruthy();
  });

  it('contains preset-chip buttons (at least PbtA, D&D, +)', () => {
    renderPage(container, [config2d6], false, false);
    const dialog = container.querySelector('dialog')!;
    const chips = dialog.querySelectorAll('.preset-chip');
    expect(chips.length).toBeGreaterThanOrEqual(3);
    const texts = Array.from(chips).map(c => c.textContent);
    expect(texts).toContain('PbtA');
    expect(texts).toContain('D&D');
    expect(texts).toContain('+');
  });

  it('contains threshold-row elements matching category count', () => {
    renderPage(container, [config2d6], false, false);
    const dialog = container.querySelector('dialog')!;
    const rows = dialog.querySelectorAll('.threshold-row');
    expect(rows.length).toBe(config2d6.categories.length);
  });

  it('floor row has no input[type="number"] and no .threshold-remove', () => {
    renderPage(container, [config2d6], false, false);
    const dialog = container.querySelector('dialog')!;
    const rows = dialog.querySelectorAll('.threshold-row');
    const floorRow = rows[0];
    expect(floorRow.querySelector('input[type="number"]')).toBeNull();
    expect(floorRow.querySelector('.threshold-remove')).toBeNull();
  });

  it('non-floor rows have input[type="number"] and .threshold-remove', () => {
    renderPage(container, [config2d6], false, false);
    const dialog = container.querySelector('dialog')!;
    const rows = dialog.querySelectorAll('.threshold-row');
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].querySelector('input[type="number"]')).toBeTruthy();
      expect(rows[i].querySelector('.threshold-remove')).toBeTruthy();
    }
  });

  it('has .threshold-add button', () => {
    renderPage(container, [config2d6], false, false);
    const dialog = container.querySelector('dialog')!;
    expect(dialog.querySelector('.threshold-add')).toBeTruthy();
  });

  it('built-in preset has disabled threshold-row inputs', () => {
    renderPage(container, [config2d6], false, false);
    const dialog = container.querySelector('dialog')!;
    const inputs = dialog.querySelectorAll('.threshold-row input');
    for (const input of inputs) {
      expect((input as HTMLInputElement).disabled).toBe(true);
    }
  });

  it('.preset-name-input is hidden when built-in preset active', () => {
    renderPage(container, [config2d6], false, false);
    const dialog = container.querySelector('dialog')!;
    const nameInput = dialog.querySelector('.preset-name-input') as HTMLElement;
    expect(nameInput.style.display).toBe('none');
  });
});

describe('dialog interactivity', () => {
  beforeEach(async () => {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name) {
        await new Promise<void>((resolve) => {
          const req = indexedDB.deleteDatabase(db.name!);
          req.onsuccess = () => resolve();
          req.onblocked = () => resolve();
        });
      }
    }
  });

  it('switching to D&D preset updates categories to 7', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: 0, maxMod: 0 })], false, false);
    const row = container.querySelector('dice-row') as any;
    // Wait for custom presets to load
    await new Promise(r => setTimeout(r, 50));
    // Click D&D chip
    const chips = row._dialog.querySelectorAll('.preset-chip');
    const dndChip = Array.from(chips).find((c: any) => c.textContent === 'D&D') as HTMLButtonElement;
    dndChip.click();
    const rows = row._dialog.querySelectorAll('.threshold-row');
    expect(rows.length).toBe(7);
  });

  it('switching to PbtA preset updates categories to 3', async () => {
    renderPage(container, [deepConfig(config1d20, { minMod: 0, maxMod: 0 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    const chips = row._dialog.querySelectorAll('.preset-chip');
    const pbtaChip = Array.from(chips).find((c: any) => c.textContent === 'PbtA') as HTMLButtonElement;
    pbtaChip.click();
    const rows = row._dialog.querySelectorAll('.threshold-row');
    expect(rows.length).toBe(3);
  });

  it('clicking + creates a custom preset chip', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: 0, maxMod: 0 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    const addBtn = row._dialog.querySelector('.preset-add') as HTMLButtonElement;
    addBtn.click();
    await new Promise(r => setTimeout(r, 50));
    const customChips = row._dialog.querySelectorAll('.preset-chip-custom');
    expect(customChips.length).toBeGreaterThanOrEqual(1);
  });

  it('clicking add threshold adds a row', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: 0, maxMod: 0 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    // First create a custom preset so inputs are unlocked
    const addPresetBtn = row._dialog.querySelector('.preset-add') as HTMLButtonElement;
    addPresetBtn.click();
    await new Promise(r => setTimeout(r, 50));
    const initialRows = row._dialog.querySelectorAll('.threshold-row').length;
    const addThresholdBtn = row._dialog.querySelector('.threshold-add') as HTMLButtonElement;
    addThresholdBtn.click();
    const rows = row._dialog.querySelectorAll('.threshold-row');
    expect(rows.length).toBe(initialRows + 1);
  });

  it('adding threshold when all removed defaults to 5', async () => {
    // Start with a 2-category config (1 threshold), create custom, remove the threshold, then add
    const twoCategory: DiceConfig = {
      count: 1, sides: 6, label: '1d6',
      thresholds: [4],
      categories: [
        { label: 'Low', color: '#ff0000' },
        { label: 'High', color: '#00ff00' },
      ],
      minMod: 0, maxMod: 0,
    };
    renderPage(container, [twoCategory], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    const addPresetBtn = row._dialog.querySelector('.preset-add') as HTMLButtonElement;
    addPresetBtn.click();
    await new Promise(r => setTimeout(r, 50));
    // Remove the only non-floor threshold
    const removeBtn = row._dialog.querySelector('.threshold-remove') as HTMLButtonElement;
    removeBtn.click();
    // Now only floor remains (1 row, 0 thresholds)
    expect(row.config.thresholds.length).toBe(0);
    // Add a threshold — should default to 5
    const addThresholdBtn = row._dialog.querySelector('.threshold-add') as HTMLButtonElement;
    addThresholdBtn.click();
    expect(row.config.thresholds[0]).toBe(10);
  });

  it('clicking remove threshold removes a row', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: 0, maxMod: 0 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    // Create custom preset to unlock
    const addPresetBtn = row._dialog.querySelector('.preset-add') as HTMLButtonElement;
    addPresetBtn.click();
    await new Promise(r => setTimeout(r, 50));
    const initialRows = row._dialog.querySelectorAll('.threshold-row').length;
    const removeBtns = row._dialog.querySelectorAll('.threshold-remove');
    (removeBtns[0] as HTMLButtonElement).click();
    const rows = row._dialog.querySelectorAll('.threshold-row');
    expect(rows.length).toBe(initialRows - 1);
  });

  it('floor row shows upper bound label', () => {
    renderPage(container, [deepConfig(config2d6)], false, false);
    const floorLabel = container.querySelector('.threshold-floor-label');
    expect(floorLabel).toBeTruthy();
    expect(floorLabel!.textContent).toBe('\u22646'); // thresholds[0] is 7, so 7-1=6
  });

  it('selecting a custom preset switches thresholds', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: 0, maxMod: 0 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    // Create a custom preset first
    const addBtn = row._dialog.querySelector('.preset-add') as HTMLButtonElement;
    addBtn.click();
    await new Promise(r => setTimeout(r, 50));
    // Switch to PbtA, then back to the custom
    const chips = row._dialog.querySelectorAll('.preset-chip');
    const pbtaChip = Array.from(chips).find((c: any) => c.textContent === 'PbtA') as HTMLButtonElement;
    pbtaChip.click();
    const selectBtn = row._dialog.querySelector('.preset-chip-select') as HTMLButtonElement;
    selectBtn.click();
    expect(row._dialog.querySelectorAll('.threshold-row').length).toBe(3);
  });

  it('close button calls dialog.close()', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: 0, maxMod: 0 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    const closeBtn = row._dialog.querySelector('.dialog-close') as HTMLButtonElement;
    closeBtn.click();
    // dialog.close() fires the 'close' event, which triggers onDialogClose
    expect(row._dialog.open).toBeFalsy();
  });

  it('dialog close event fires onDialogClose callback', async () => {
    let closeCalled = false;
    renderPage(container, [deepConfig(config2d6, { minMod: 0, maxMod: 0 })], false, false, undefined, () => { closeCalled = true; });
    const row = container.querySelector('dice-row') as any;
    row._dialog.showModal();
    row._dialog.close();
    expect(closeCalled).toBe(true);
  });

  it('deleting a non-active custom preset keeps current preset', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: 0, maxMod: 0 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    // Create two custom presets
    const addBtn = row._dialog.querySelector('.preset-add') as HTMLButtonElement;
    addBtn.click();
    await new Promise(r => setTimeout(r, 50));
    addBtn.click();
    await new Promise(r => setTimeout(r, 50));
    // The second one is active. Delete the first (non-active) one.
    const customChips = row._dialog.querySelectorAll('.preset-chip-custom');
    expect(customChips.length).toBe(2);
    const firstDeleteBtn = customChips[0].querySelector('.preset-chip-delete') as HTMLButtonElement;
    firstDeleteBtn.click();
    await new Promise(r => setTimeout(r, 50));
    // First custom removed, second still active
    expect(row._dialog.querySelectorAll('.preset-chip-custom').length).toBe(1);
  });

  it('deleting a custom preset removes its chip', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: 0, maxMod: 0 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    // Create a custom preset
    const addBtn = row._dialog.querySelector('.preset-add') as HTMLButtonElement;
    addBtn.click();
    await new Promise(r => setTimeout(r, 50));
    expect(row._dialog.querySelectorAll('.preset-chip-custom').length).toBe(1);
    // Delete it
    const deleteBtn = row._dialog.querySelector('.preset-chip-delete') as HTMLButtonElement;
    deleteBtn.click();
    await new Promise(r => setTimeout(r, 50));
    expect(row._dialog.querySelectorAll('.preset-chip-custom').length).toBe(0);
  });

  it('creates custom preset locally even if IndexedDB save fails', async () => {
    const spy = vi.spyOn(thresholds, 'saveCustomPreset').mockRejectedValue(new Error('DB error'));
    renderPage(container, [deepConfig(config2d6, { minMod: 0, maxMod: 0 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    const addBtn = row._dialog.querySelector('.preset-add') as HTMLButtonElement;
    addBtn.click();
    await new Promise(r => setTimeout(r, 50));
    // Should still create the custom preset locally despite save failure
    const customChips = row._dialog.querySelectorAll('.preset-chip-custom');
    expect(customChips.length).toBeGreaterThanOrEqual(1);
    spy.mockRestore();
  });

  it('editing preset name updates chip label live', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: 0, maxMod: 0 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    // Create a custom preset
    const addBtn = row._dialog.querySelector('.preset-add') as HTMLButtonElement;
    addBtn.click();
    await new Promise(r => setTimeout(r, 50));
    const nameInput = row._dialog.querySelector('.preset-name-input input') as HTMLInputElement;
    nameInput.value = 'My Preset';
    nameInput.dispatchEvent(new Event('input'));
    const selectBtn = row._dialog.querySelector('.preset-chip-select') as HTMLElement;
    expect(selectBtn.textContent).toBe('My Preset');
  });

  it('threshold change calls onConfigChange callback', async () => {
    let callbackConfig: DiceConfig | null = null;
    let callbackPreset = '';
    renderPage(container, [deepConfig(config2d6, { minMod: 0, maxMod: 0 })], false, false, (_idx, cfg, preset) => {
      callbackConfig = cfg;
      callbackPreset = preset;
    });
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    // Create custom to unlock
    const addBtn = row._dialog.querySelector('.preset-add') as HTMLButtonElement;
    addBtn.click();
    await new Promise(r => setTimeout(r, 50));
    // Edit a threshold — this triggers _onThresholdChange which calls onConfigChange
    const numInputs = row._dialog.querySelectorAll('.threshold-row input[type="number"]');
    const firstNum = numInputs[0] as HTMLInputElement;
    firstNum.value = '8';
    firstNum.dispatchEvent(new Event('input'));
    expect(callbackConfig).not.toBeNull();
    expect(callbackConfig!.thresholds[0]).toBe(8);
    expect(callbackPreset).toContain('Custom');
  });

  it('threshold change works without onConfigChange callback', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: 0, maxMod: 0 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    // Create custom to unlock
    const addBtn = row._dialog.querySelector('.preset-add') as HTMLButtonElement;
    addBtn.click();
    await new Promise(r => setTimeout(r, 50));
    // No onConfigChange set, editing should not throw
    row.onConfigChange = undefined;
    const numInputs = row._dialog.querySelectorAll('.threshold-row input[type="number"]');
    const firstNum = numInputs[0] as HTMLInputElement;
    firstNum.value = '9';
    firstNum.dispatchEvent(new Event('input'));
    expect(row.config.thresholds[0]).toBe(9);
  });

  it('changing modifier min updates config', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: -2, maxMod: 5 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    const minInput = row._dialog.querySelector('[aria-label="Min modifier"]') as HTMLInputElement;
    minInput.value = '0';
    minInput.dispatchEvent(new Event('change'));
    expect(row.config.minMod).toBe(0);
  });

  it('changing modifier max updates config', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: -2, maxMod: 5 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    const maxInput = row._dialog.querySelector('[aria-label="Max modifier"]') as HTMLInputElement;
    maxInput.value = '3';
    maxInput.dispatchEvent(new Event('change'));
    expect(row.config.maxMod).toBe(3);
  });

  it('clamps max up when min exceeds max', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: -2, maxMod: 5 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    const minInput = row._dialog.querySelector('[aria-label="Min modifier"]') as HTMLInputElement;
    minInput.value = '10';
    minInput.dispatchEvent(new Event('change'));
    expect(row.config.minMod).toBe(10);
    expect(row.config.maxMod).toBe(10);
  });

  it('clamps min down when max goes below min', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: -2, maxMod: 5 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    const maxInput = row._dialog.querySelector('[aria-label="Max modifier"]') as HTMLInputElement;
    maxInput.value = '-5';
    maxInput.dispatchEvent(new Event('change'));
    expect(row.config.maxMod).toBe(-5);
    expect(row.config.minMod).toBe(-5);
  });

  it('ignores NaN modifier values', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: -2, maxMod: 5 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    const minInput = row._dialog.querySelector('[aria-label="Min modifier"]') as HTMLInputElement;
    minInput.value = '';
    minInput.dispatchEvent(new Event('change'));
    expect(row.config.minMod).toBe(-2);
    const maxInput = row._dialog.querySelector('[aria-label="Max modifier"]') as HTMLInputElement;
    maxInput.value = '';
    maxInput.dispatchEvent(new Event('change'));
    expect(row.config.maxMod).toBe(5);
  });

  it('editing a threshold number updates config', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: 0, maxMod: 0 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    // Create custom preset to unlock inputs
    const addBtn = row._dialog.querySelector('.preset-add') as HTMLButtonElement;
    addBtn.click();
    await new Promise(r => setTimeout(r, 50));
    const numInputs = row._dialog.querySelectorAll('.threshold-row input[type="number"]');
    const firstNum = numInputs[0] as HTMLInputElement;
    firstNum.value = '8';
    firstNum.dispatchEvent(new Event('input'));
    expect(row.config.thresholds[0]).toBe(8);
  });

  it('editing a threshold color updates config', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: 0, maxMod: 0 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    const addBtn = row._dialog.querySelector('.preset-add') as HTMLButtonElement;
    addBtn.click();
    await new Promise(r => setTimeout(r, 50));
    const colorInputs = row._dialog.querySelectorAll('.threshold-row input[type="color"]');
    const firstColor = colorInputs[0] as HTMLInputElement;
    firstColor.value = '#ff0000';
    firstColor.dispatchEvent(new Event('input'));
    expect(row.config.categories[0].color).toBe('#ff0000');
  });

  it('editing a threshold label updates config', async () => {
    renderPage(container, [deepConfig(config2d6, { minMod: 0, maxMod: 0 })], false, false);
    const row = container.querySelector('dice-row') as any;
    await new Promise(r => setTimeout(r, 50));
    const addBtn = row._dialog.querySelector('.preset-add') as HTMLButtonElement;
    addBtn.click();
    await new Promise(r => setTimeout(r, 50));
    const textInputs = row._dialog.querySelectorAll('.threshold-row input[type="text"]');
    const firstLabel = textInputs[0] as HTMLInputElement;
    firstLabel.value = 'Failure';
    firstLabel.dispatchEvent(new Event('input'));
    expect(row.config.categories[0].label).toBe('Failure');
  });
});

describe('stacked-bar', () => {
  it('renders segments with inline background colors', () => {
    renderPage(container, [config2d6], false, false);
    const bar = container.querySelector('stacked-bar')!;
    const segs = bar.querySelectorAll('.seg');
    expect(segs.length).toBe(3);
  });

  it('hides percentage text for segments below 5%', () => {
    renderPage(container, [{ ...config2d6, minMod: 4, maxMod: 4 }], false, false);
    const segs = container.querySelectorAll('.seg');
    // Find the floor segment (Miss) — at +4 it should be ~2.78%
    const floorSeg = segs[segs.length - 1];
    expect(floorSeg.querySelector('span')).toBeNull();
  });

  it('omits 0% segments entirely', () => {
    // 1d20 -10: only Trivial, Very Easy, Easy are non-zero
    renderPage(container, [{ ...config1d20, minMod: -10, maxMod: -10 }], false, false);
    const bar = container.querySelector('stacked-bar')!;
    const segs = bar.querySelectorAll('.seg');
    // Should have 3 segments, not 7
    expect(segs.length).toBe(3);
  });

  it('shows more segments as modifier increases', () => {
    // 1d20 +0: Trivial through Hard are non-zero (5 segments)
    renderPage(container, [{ ...config1d20, minMod: 0, maxMod: 0 }], false, false);
    const bar = container.querySelector('stacked-bar')!;
    const segs = bar.querySelectorAll('.seg');
    expect(segs.length).toBe(5);
  });

  it('sets tooltip data attributes on all segments', () => {
    renderPage(container, [config2d6], false, false);
    const segs = container.querySelectorAll('.seg');
    for (const seg of segs) {
      expect(seg.getAttribute('data-tooltip')).toMatch(/\d+\.\d{2}%$/);
    }
  });
});
