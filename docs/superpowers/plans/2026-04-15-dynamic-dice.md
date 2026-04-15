# Dynamic XdY Dice Configuration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded 2d6/2d8/2d10/2d12 with dynamic XdY dice input, generalizing the probability engine for arbitrary dice counts.

**Architecture:** Generalize the engine's nested loops into recursive enumeration accepting a `count` parameter. Add XdY parser. Replace hardcoded dice setup in main.ts with dynamic add/remove UI persisted to localStorage.

**Tech Stack:** Vite, TypeScript, Vitest (existing)

---

## File Structure

All modifications to existing files — no new files.

```
src/
├── engine.ts              # Add count param to all functions, recursive enumeration, parser
├── __tests__/engine.test.ts  # Update existing tests for new signatures, add parser + 1d6 tests
├── renderer.ts            # Pass config.count to computeProbabilities, fix hardcoded min sum
├── main.ts                # Dynamic dice list, add/remove, localStorage persistence
├── style.css              # Dice input, pills styles
index.html                 # Dice input area in header
```

---

### Task 1: Generalize Engine + Update Tests (TDD)

**Files:**
- Modify: `src/__tests__/engine.test.ts`
- Modify: `src/engine.ts`

- [ ] **Step 1: Rewrite test file with new signatures**

Replace the entire contents of `src/__tests__/engine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  computeNormalProbabilities,
  computeAdvantageProbabilities,
  computeDisadvantageProbabilities,
  computeProbabilities,
  computeOptimalThresholds,
  parseDiceNotation,
} from '../engine';

describe('computeNormalProbabilities', () => {
  it('computes 2d6 with no modifier', () => {
    const result = computeNormalProbabilities(2, 6, 6, 9, 0);
    expect(result.miss).toBeCloseTo((15 / 36) * 100, 10);
    expect(result.weakHit).toBeCloseTo((15 / 36) * 100, 10);
    expect(result.strongHit).toBeCloseTo((6 / 36) * 100, 10);
  });

  it('computes 2d6 with +1 modifier', () => {
    const result = computeNormalProbabilities(2, 6, 6, 9, 1);
    expect(result.miss).toBeCloseTo((10 / 36) * 100, 10);
    expect(result.weakHit).toBeCloseTo((16 / 36) * 100, 10);
    expect(result.strongHit).toBeCloseTo((10 / 36) * 100, 10);
  });

  it('computes 2d8 with no modifier', () => {
    const result = computeNormalProbabilities(2, 8, 8, 12, 0);
    expect(result.miss).toBeCloseTo((28 / 64) * 100, 10);
    expect(result.weakHit).toBeCloseTo((26 / 64) * 100, 10);
    expect(result.strongHit).toBeCloseTo((10 / 64) * 100, 10);
  });

  it('all three outcomes sum to exactly 100', () => {
    const result = computeNormalProbabilities(2, 6, 6, 9, 0);
    expect(result.miss + result.weakHit + result.strongHit).toBeCloseTo(100, 10);
  });

  it('computes 1d6 with known thresholds', () => {
    // 1d6, missMax=3, weakMax=5: Miss 1-3 (50%), Weak 4-5 (33.33%), Strong 6 (16.67%)
    const result = computeNormalProbabilities(1, 6, 3, 5, 0);
    expect(result.miss).toBeCloseTo((3 / 6) * 100, 10);
    expect(result.weakHit).toBeCloseTo((2 / 6) * 100, 10);
    expect(result.strongHit).toBeCloseTo((1 / 6) * 100, 10);
  });
});

describe('computeAdvantageProbabilities', () => {
  it('computes 3d6 keep highest 2 with no modifier', () => {
    const result = computeAdvantageProbabilities(2, 6, 6, 9, 0);
    // 216 total outcomes (6^3)
    // Miss (highest-2 sum ≤ 6): 42 outcomes
    // Weak (7-9): 97 outcomes
    // Strong (≥10): 77 outcomes
    expect(result.miss).toBeCloseTo((42 / 216) * 100, 10);
    expect(result.weakHit).toBeCloseTo((97 / 216) * 100, 10);
    expect(result.strongHit).toBeCloseTo((77 / 216) * 100, 10);
  });

  it('sums to 100', () => {
    const result = computeAdvantageProbabilities(2, 6, 6, 9, 0);
    expect(result.miss + result.weakHit + result.strongHit).toBeCloseTo(100, 10);
  });
});

describe('computeDisadvantageProbabilities', () => {
  it('computes 3d6 keep lowest 2 with no modifier', () => {
    const result = computeDisadvantageProbabilities(2, 6, 6, 9, 0);
    // 216 total outcomes
    // Miss (lowest-2 sum ≤ 6): 147 outcomes
    // Weak (7-9): 58 outcomes
    // Strong (≥10): 11 outcomes
    expect(result.miss).toBeCloseTo((147 / 216) * 100, 10);
    expect(result.weakHit).toBeCloseTo((58 / 216) * 100, 10);
    expect(result.strongHit).toBeCloseTo((11 / 216) * 100, 10);
  });

  it('sums to 100', () => {
    const result = computeDisadvantageProbabilities(2, 6, 6, 9, 0);
    expect(result.miss + result.weakHit + result.strongHit).toBeCloseTo(100, 10);
  });
});

describe('computeProbabilities', () => {
  it('dispatches to normal', () => {
    const direct = computeNormalProbabilities(2, 6, 6, 9, 0);
    const dispatched = computeProbabilities(2, 6, 6, 9, 0, 'normal');
    expect(dispatched).toEqual(direct);
  });

  it('dispatches to advantage', () => {
    const direct = computeAdvantageProbabilities(2, 6, 6, 9, 0);
    const dispatched = computeProbabilities(2, 6, 6, 9, 0, 'advantage');
    expect(dispatched).toEqual(direct);
  });

  it('dispatches to disadvantage', () => {
    const direct = computeDisadvantageProbabilities(2, 6, 6, 9, 0);
    const dispatched = computeProbabilities(2, 6, 6, 9, 0, 'disadvantage');
    expect(dispatched).toEqual(direct);
  });
});

describe('computeOptimalThresholds', () => {
  const baselineMiss = (15 / 36) * 100;
  const baselineWeak = (15 / 36) * 100;
  const baselineStrong = (6 / 36) * 100;

  it('maps 2d6 back to itself', () => {
    const result = computeOptimalThresholds(2, 6, baselineMiss, baselineWeak, baselineStrong);
    expect(result.missMax).toBe(6);
    expect(result.weakMax).toBe(9);
  });

  it('maps 2d8 to 8/12', () => {
    const result = computeOptimalThresholds(2, 8, baselineMiss, baselineWeak, baselineStrong);
    expect(result.missMax).toBe(8);
    expect(result.weakMax).toBe(12);
  });

  it('maps 2d10 to 10/15', () => {
    const result = computeOptimalThresholds(2, 10, baselineMiss, baselineWeak, baselineStrong);
    expect(result.missMax).toBe(10);
    expect(result.weakMax).toBe(15);
  });

  it('maps 2d12 to 11/17', () => {
    const result = computeOptimalThresholds(2, 12, baselineMiss, baselineWeak, baselineStrong);
    expect(result.missMax).toBe(11);
    expect(result.weakMax).toBe(17);
  });
});

describe('parseDiceNotation', () => {
  it('parses standard notation', () => {
    expect(parseDiceNotation('2d6')).toEqual({ count: 2, sides: 6 });
    expect(parseDiceNotation('3d8')).toEqual({ count: 3, sides: 8 });
    expect(parseDiceNotation('1d20')).toEqual({ count: 1, sides: 20 });
  });

  it('is case-insensitive', () => {
    expect(parseDiceNotation('4D6')).toEqual({ count: 4, sides: 6 });
  });

  it('trims whitespace', () => {
    expect(parseDiceNotation(' 2d6 ')).toEqual({ count: 2, sides: 6 });
  });

  it('returns null for invalid input', () => {
    expect(parseDiceNotation('foo')).toBeNull();
    expect(parseDiceNotation('')).toBeNull();
    expect(parseDiceNotation('d6')).toBeNull();
    expect(parseDiceNotation('2d')).toBeNull();
  });

  it('returns null for zero or invalid values', () => {
    expect(parseDiceNotation('0d6')).toBeNull();
    expect(parseDiceNotation('2d0')).toBeNull();
    expect(parseDiceNotation('2d1')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run`

Expected: FAIL — function signatures have changed (count parameter added), `parseDiceNotation` doesn't exist yet.

- [ ] **Step 3: Rewrite engine.ts with generalized functions**

Replace the entire contents of `src/engine.ts`:

```typescript
export interface ProbabilityResult {
  miss: number;
  weakHit: number;
  strongHit: number;
}

export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface DiceThresholds {
  missMax: number;
  weakMax: number;
}

export interface DiceConfig {
  count: number;
  sides: number;
  label: string;
  missMax: number;
  weakMax: number;
}

function classifyOutcomes(
  numDice: number,
  sides: number,
  missMax: number,
  weakMax: number,
  modifier: number,
  sumFn: (dice: number[]) => number
): ProbabilityResult {
  let missCount = 0;
  let weakCount = 0;
  let strongCount = 0;
  let total = 0;
  const dice = new Array<number>(numDice);

  function recurse(depth: number): void {
    if (depth === numDice) {
      total++;
      const sum = sumFn(dice) + modifier;
      if (sum <= missMax) missCount++;
      else if (sum <= weakMax) weakCount++;
      else strongCount++;
      return;
    }
    for (let v = 1; v <= sides; v++) {
      dice[depth] = v;
      recurse(depth + 1);
    }
  }

  recurse(0);

  return {
    miss: (missCount / total) * 100,
    weakHit: (weakCount / total) * 100,
    strongHit: (strongCount / total) * 100,
  };
}

function sumAll(dice: number[]): number {
  let s = 0;
  for (let i = 0; i < dice.length; i++) s += dice[i];
  return s;
}

function sumDropLowest(dice: number[]): number {
  let s = 0;
  let min = dice[0];
  for (let i = 0; i < dice.length; i++) {
    s += dice[i];
    if (dice[i] < min) min = dice[i];
  }
  return s - min;
}

function sumDropHighest(dice: number[]): number {
  let s = 0;
  let max = dice[0];
  for (let i = 0; i < dice.length; i++) {
    s += dice[i];
    if (dice[i] > max) max = dice[i];
  }
  return s - max;
}

export function computeNormalProbabilities(
  count: number,
  sides: number,
  missMax: number,
  weakMax: number,
  modifier: number
): ProbabilityResult {
  return classifyOutcomes(count, sides, missMax, weakMax, modifier, sumAll);
}

export function computeAdvantageProbabilities(
  count: number,
  sides: number,
  missMax: number,
  weakMax: number,
  modifier: number
): ProbabilityResult {
  return classifyOutcomes(count + 1, sides, missMax, weakMax, modifier, sumDropLowest);
}

export function computeDisadvantageProbabilities(
  count: number,
  sides: number,
  missMax: number,
  weakMax: number,
  modifier: number
): ProbabilityResult {
  return classifyOutcomes(count + 1, sides, missMax, weakMax, modifier, sumDropHighest);
}

export function computeProbabilities(
  count: number,
  sides: number,
  missMax: number,
  weakMax: number,
  modifier: number,
  mode: RollMode
): ProbabilityResult {
  switch (mode) {
    case 'normal':
      return computeNormalProbabilities(count, sides, missMax, weakMax, modifier);
    case 'advantage':
      return computeAdvantageProbabilities(count, sides, missMax, weakMax, modifier);
    case 'disadvantage':
      return computeDisadvantageProbabilities(count, sides, missMax, weakMax, modifier);
  }
}

export function computeOptimalThresholds(
  count: number,
  sides: number,
  baselineMiss: number,
  baselineWeak: number,
  baselineStrong: number
): DiceThresholds {
  const minSum = count;
  const maxSum = count * sides;
  let bestDeviation = Infinity;
  let bestMissMax = 0;
  let bestWeakMax = 0;

  for (let missMax = minSum; missMax < maxSum; missMax++) {
    for (let weakMax = missMax + 1; weakMax < maxSum; weakMax++) {
      const result = computeNormalProbabilities(count, sides, missMax, weakMax, 0);
      const deviation =
        Math.abs(result.miss - baselineMiss) +
        Math.abs(result.weakHit - baselineWeak) +
        Math.abs(result.strongHit - baselineStrong);

      if (deviation < bestDeviation) {
        bestDeviation = deviation;
        bestMissMax = missMax;
        bestWeakMax = weakMax;
      }
    }
  }

  return { missMax: bestMissMax, weakMax: bestWeakMax };
}

export function parseDiceNotation(input: string): { count: number; sides: number } | null {
  const match = input.trim().match(/^(\d+)[dD](\d+)$/);
  if (!match) return null;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  if (count < 1 || sides < 2) return null;
  return { count, sides };
}
```

- [ ] **Step 4: Run all tests to verify they pass**

Run: `pnpm exec vitest run`

Expected: All 22 tests PASS (15 original updated + 1 new normal test + 6 parser tests).

- [ ] **Step 5: Commit**

```
git add src/engine.ts src/__tests__/engine.test.ts
git commit -m "feat: generalize engine for arbitrary XdY dice, add parser"
```

---

### Task 2: Update Renderer

**Files:**
- Modify: `src/renderer.ts`

- [ ] **Step 1: Fix hardcoded min sum and add count to computeProbabilities call**

In `src/renderer.ts`, make two changes:

Change 1 — line 42-45, replace the hardcoded `2` in the range label with `config.count`:

Find:
```typescript
  ranges.textContent =
    'Miss: 2\u2013' + config.missMax +
    ' | Weak: ' + (config.missMax + 1) + '\u2013' + config.weakMax +
    ' | Strong: ' + (config.weakMax + 1) + '+';
```

Replace with:
```typescript
  ranges.textContent =
    'Miss: ' + config.count + '\u2013' + config.missMax +
    ' | Weak: ' + (config.missMax + 1) + '\u2013' + config.weakMax +
    ' | Strong: ' + (config.weakMax + 1) + '+';
```

Change 2 — line 107-108, pass `config.count` as first argument to `computeProbabilities`:

Find:
```typescript
    const result = computeProbabilities(
      config.sides, config.missMax, config.weakMax, modifier, mode
    );
```

Replace with:
```typescript
    const result = computeProbabilities(
      config.count, config.sides, config.missMax, config.weakMax, modifier, mode
    );
```

- [ ] **Step 2: Verify tests still pass**

Run: `pnpm exec vitest run`

Expected: All 22 tests PASS (renderer has no tests but engine tests confirm the API contract).

- [ ] **Step 3: Commit**

```
git add src/renderer.ts
git commit -m "feat: update renderer for generalized XdY dice configs"
```

---

### Task 3: HTML + CSS for Dice Input

**Files:**
- Modify: `index.html`
- Modify: `src/style.css`

- [ ] **Step 1: Add dice input area to index.html**

In `index.html`, add the dice input area inside the header, after the closing `</div>` of `.controls` (line 23) and before `</header>` (line 25):

Find:
```html
        </div>
      </div>
    </header>
```

Replace with:
```html
        </div>
      </div>
      <div class="dice-input-area">
        <div class="dice-input-row">
          <input type="text" id="dice-input" placeholder="e.g. 3d8">
          <button id="dice-add" class="toggle-btn">Add</button>
        </div>
        <div id="dice-pills" class="dice-pills"></div>
      </div>
    </header>
```

- [ ] **Step 2: Add CSS styles for dice input and pills**

Append to `src/style.css`, before the `/* ── Dice Rows ── */` comment:

```css
/* ── Dice Input ── */

.dice-input-area {
  margin-top: 12px;
}

.dice-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.dice-input-row input[type="text"] {
  width: 100px;
  background: #12121f;
  border: 1px solid #333;
  border-radius: 4px;
  color: #e0e0e0;
  padding: 4px 8px;
  font-size: 12px;
}

.dice-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.dice-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #12121f;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 2px 8px 2px 10px;
  font-size: 12px;
  color: #e0e0e0;
}

.dice-pill button {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 14px;
  padding: 0 2px;
  line-height: 1;
}

.dice-pill button:hover {
  color: #f87171;
}
```

- [ ] **Step 3: Commit**

```
git add index.html src/style.css
git commit -m "feat: add dice input UI and pill styles"
```

---

### Task 4: Rewrite Main Entry Point

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Replace main.ts with dynamic dice management and localStorage**

Replace the entire contents of `src/main.ts`:

```typescript
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

function init(): void {
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

    const config = buildConfig(label);
    if (!config) return;

    diceConfigs.push(config);
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
```

- [ ] **Step 2: Verify in browser**

Run: `pnpm exec vite`

Expected: Page loads with default 4 dice rows. Pills appear for each. Typing "3d8" and clicking Add (or pressing Enter) adds a new row. Clicking x on a pill removes it. Reloading the page restores the last state. Toggles and modifier inputs persist across reloads.

- [ ] **Step 3: Commit**

```
git add src/main.ts
git commit -m "feat: dynamic XdY dice input with localStorage persistence"
```

---

### Task 5: Final Verification

- [ ] **Step 1: Run all tests**

Run: `pnpm exec vitest run`

Expected: All 22 tests PASS.

- [ ] **Step 2: Spot-check in browser**

Run: `pnpm exec vite`

Verify:
- Default dice (2d6, 2d8, 2d10, 2d12) render with correct percentages
- 2d6 +0 normal shows 42% / 42% / 17% (unchanged from before)
- Adding "3d6" creates a new row with computed thresholds
- Adding "1d20" creates a row for 1d20
- Removing a pill removes the row
- Duplicates are silently ignored
- Invalid input (e.g., "foo") is silently ignored
- All settings persist across page reload
- Advantage/disadvantage toggles and modifier inputs still work

- [ ] **Step 3: Commit if any adjustments were needed**

Only commit if changes were made during verification.
