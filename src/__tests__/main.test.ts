import { describe, it, expect, beforeEach, vi } from 'vitest';

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

async function loadInit() {
  const mod = await import('../main');
  return mod.init;
}

describe('main — loadSettings', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.body.replaceChildren();
    setupDOM();
  });

  it('uses defaults when no localStorage data', async () => {
    const init = await loadInit();
    init();
    expect(document.querySelectorAll('dice-row').length).toBe(3);
    expect(document.querySelectorAll('.dice-pill').length).toBe(3);
  });

  it('loads saved settings from localStorage', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      diceList: ['2d6'],
      minMod: 0,
      maxMod: 3,
      showAdvantage: false,
      showDisadvantage: false,
    }));
    const init = await loadInit();
    init();
    expect(document.querySelectorAll('dice-row').length).toBe(1);
    expect((document.getElementById('min-mod') as HTMLInputElement).value).toBe('0');
    expect((document.getElementById('max-mod') as HTMLInputElement).value).toBe('3');
    expect(document.getElementById('adv-toggle')!.classList.contains('active')).toBe(false);
    expect(document.getElementById('dis-toggle')!.classList.contains('active')).toBe(false);
  });

  it('falls back to defaults for invalid JSON', async () => {
    localStorage.setItem(STORAGE_KEY, 'not-json!!!');
    const init = await loadInit();
    init();
    expect(document.querySelectorAll('dice-row').length).toBe(3);
  });

  it('falls back to defaults when diceList is not an array', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ diceList: 'bad' }));
    const init = await loadInit();
    init();
    expect(document.querySelectorAll('dice-row').length).toBe(3);
  });

  it('uses field defaults for missing fields', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ diceList: ['2d6'] }));
    const init = await loadInit();
    init();
    expect(document.querySelectorAll('dice-row').length).toBe(1);
    expect((document.getElementById('min-mod') as HTMLInputElement).value).toBe('-2');
  });

  it('filters non-string items from diceList', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ diceList: ['2d6', 42, null, '2d8'] }));
    const init = await loadInit();
    init();
    expect(document.querySelectorAll('dice-row').length).toBe(2);
  });

  it('skips invalid dice notation in saved diceList', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ diceList: ['2d6', 'bad', '2d8'] }));
    const init = await loadInit();
    init();
    expect(document.querySelectorAll('dice-row').length).toBe(2);
  });
});

describe('main — addDice', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.body.replaceChildren();
    setupDOM();
  });

  it('adds a dice type via the add button', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ diceList: ['2d6'] }));
    const init = await loadInit();
    init();

    const input = document.getElementById('dice-input') as HTMLInputElement;
    const btn = document.getElementById('dice-add') as HTMLButtonElement;
    input.value = '3d8';
    btn.click();

    expect(document.querySelectorAll('dice-row').length).toBe(2);
    expect(document.querySelectorAll('.dice-pill').length).toBe(2);
    expect(input.value).toBe('');
  });

  it('adds a dice type via Enter key', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ diceList: ['2d6'] }));
    const init = await loadInit();
    init();

    const input = document.getElementById('dice-input') as HTMLInputElement;
    input.value = '2d10';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(document.querySelectorAll('dice-row').length).toBe(2);
  });

  it('does not add on non-Enter keydown', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ diceList: ['2d6'] }));
    const init = await loadInit();
    init();

    const input = document.getElementById('dice-input') as HTMLInputElement;
    input.value = '2d10';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));

    expect(document.querySelectorAll('dice-row').length).toBe(1);
  });

  it('ignores empty input', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ diceList: ['2d6'] }));
    const init = await loadInit();
    init();

    (document.getElementById('dice-input') as HTMLInputElement).value = '';
    (document.getElementById('dice-add') as HTMLButtonElement).click();

    expect(document.querySelectorAll('dice-row').length).toBe(1);
  });

  it('ignores invalid notation', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ diceList: ['2d6'] }));
    const init = await loadInit();
    init();

    (document.getElementById('dice-input') as HTMLInputElement).value = 'foo';
    (document.getElementById('dice-add') as HTMLButtonElement).click();

    expect(document.querySelectorAll('dice-row').length).toBe(1);
  });

  it('ignores duplicates', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ diceList: ['2d6'] }));
    const init = await loadInit();
    init();

    (document.getElementById('dice-input') as HTMLInputElement).value = '2d6';
    (document.getElementById('dice-add') as HTMLButtonElement).click();

    expect(document.querySelectorAll('dice-row').length).toBe(1);
  });
});

describe('main — removeDice', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.body.replaceChildren();
    setupDOM();
  });

  it('removes a dice type when pill x is clicked', async () => {
    const init = await loadInit();
    init();

    expect(document.querySelectorAll('dice-row').length).toBe(3);
    const removeBtn = document.querySelector('.dice-pill button') as HTMLButtonElement;
    removeBtn.click();
    expect(document.querySelectorAll('dice-row').length).toBe(2);
  });
});

describe('main — toggles', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.body.replaceChildren();
    setupDOM();
  });

  it('toggles advantage off and on', async () => {
    const init = await loadInit();
    init();

    const btn = document.getElementById('adv-toggle')!;
    expect(btn.classList.contains('active')).toBe(true);
    btn.click();
    expect(btn.classList.contains('active')).toBe(false);
    btn.click();
    expect(btn.classList.contains('active')).toBe(true);
  });

  it('toggles disadvantage off and on', async () => {
    const init = await loadInit();
    init();

    const btn = document.getElementById('dis-toggle')!;
    expect(btn.classList.contains('active')).toBe(true);
    btn.click();
    expect(btn.classList.contains('active')).toBe(false);
  });
});

describe('main — modifier inputs', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.body.replaceChildren();
    setupDOM();
  });

  it('updates min modifier on change', async () => {
    const init = await loadInit();
    init();

    const minInput = document.getElementById('min-mod') as HTMLInputElement;
    minInput.value = '0';
    minInput.dispatchEvent(new Event('change'));

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.minMod).toBe(0);
  });

  it('clamps max up when min exceeds max', async () => {
    const init = await loadInit();
    init();

    const minInput = document.getElementById('min-mod') as HTMLInputElement;
    const maxInput = document.getElementById('max-mod') as HTMLInputElement;
    minInput.value = '10';
    minInput.dispatchEvent(new Event('change'));

    expect(maxInput.value).toBe('10');
  });

  it('clamps min down when max goes below min', async () => {
    const init = await loadInit();
    init();

    const minInput = document.getElementById('min-mod') as HTMLInputElement;
    const maxInput = document.getElementById('max-mod') as HTMLInputElement;
    maxInput.value = '-5';
    maxInput.dispatchEvent(new Event('change'));

    expect(minInput.value).toBe('-5');
  });

  it('ignores NaN min value', async () => {
    const init = await loadInit();
    init();

    const minInput = document.getElementById('min-mod') as HTMLInputElement;
    minInput.value = '';
    minInput.dispatchEvent(new Event('change'));

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.minMod).toBe(-2);
  });

  it('ignores NaN max value', async () => {
    const init = await loadInit();
    init();

    const maxInput = document.getElementById('max-mod') as HTMLInputElement;
    maxInput.value = '';
    maxInput.dispatchEvent(new Event('change'));

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.maxMod).toBe(5);
  });
});

describe('main — persistence', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.body.replaceChildren();
    setupDOM();
  });

  it('saves settings to localStorage on init', async () => {
    const init = await loadInit();
    init();

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.diceList).toEqual(['2d6', '2d12', '1d20']);
    expect(saved.minMod).toBe(-2);
    expect(saved.maxMod).toBe(5);
    expect(saved.showAdvantage).toBe(true);
    expect(saved.showDisadvantage).toBe(true);
  });

  it('persists after adding dice', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ diceList: ['2d6'] }));
    const init = await loadInit();
    init();

    (document.getElementById('dice-input') as HTMLInputElement).value = '2d8';
    (document.getElementById('dice-add') as HTMLButtonElement).click();

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.diceList).toEqual(['2d6', '2d8']);
  });
});
