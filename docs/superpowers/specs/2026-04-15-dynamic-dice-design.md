# Dynamic XdY Dice Configuration — Design Spec

## Purpose

Replace the hardcoded dice types (2d6, 2d8, 2d10, 2d12) with a dynamic system where users can add and remove arbitrary dice configurations using XdY notation (e.g., 3d8, 1d20, 4d6). The core miss/weak hit/strong hit baseline percentages (from 2d6: 41.67% / 41.67% / 16.67%) remain unchanged — optimal thresholds are computed for each new dice type.

## Engine Generalization

### DiceConfig

```typescript
interface DiceConfig {
  count: number;   // X in XdY
  sides: number;   // Y in XdY
  label: string;   // "2d6", "3d8", etc.
  missMax: number;
  weakMax: number;
}
```

### Probability Computation

Replace hardcoded nested loops with recursive enumeration.

**Normal rolls (XdY):** Enumerate all Y^X outcomes. For each complete set of X dice values, sum them + modifier, classify into miss/weak/strong.

**Advantage (X+1 dice, keep highest X):** Enumerate all Y^(X+1) outcomes. For each set, sort, drop the lowest die, sum the remaining X + modifier, classify.

**Disadvantage (X+1 dice, keep lowest X):** Same as advantage but drop the highest die.

All computation functions gain a `count` parameter for the number of dice. The `sides` parameter remains as-is.

### Threshold Mapping

`computeOptimalThresholds` gains a `count` parameter. The sum range for XdY is `count` to `count * sides`. It iterates all valid threshold pairs (missMax, weakMax) within that range and picks the pair minimizing total absolute deviation from the 2d6 baseline.

### Dice Notation Parser

New function: `parseDiceNotation(input: string): { count: number; sides: number } | null`

- Parses strings like "2d6", "3d8", "1d20", "4D6"
- Case-insensitive, trims whitespace
- Returns null for invalid input (non-matching format, count < 1, sides < 2)

### Performance

No artificial limits. The user accepts responsibility for large configurations. Y^X outcomes for normal, Y^(X+1) for advantage/disadvantage.

## UI Changes

### Dice Input Area

Located in the header, below the existing controls:

- Text input with placeholder "e.g. 3d8"
- "Add" button next to input
- Pressing Enter in the input also adds
- Added dice appear as pill/tag elements in a row below the input
- Each pill shows the label (e.g., "2d6") with an "x" button to remove it
- Duplicate detection: adding a dice type that already exists is silently ignored
- Invalid input is silently ignored (input just doesn't add anything)

### Existing Controls

Min/max modifier inputs and advantage/disadvantage toggles remain exactly as they are, unchanged.

## localStorage Persistence

A single localStorage key (`dice-visualizer-settings`) stores all settings as JSON:

```typescript
interface SavedSettings {
  diceList: string[];       // ["2d6", "2d8", "2d10", "2d12"]
  minMod: number;           // -2
  maxMod: number;           // 5
  showAdvantage: boolean;   // true
  showDisadvantage: boolean; // true
}
```

- Saved on every state change (add/remove dice, change modifier, toggle)
- Loaded on page init
- Falls back to defaults if key doesn't exist or is corrupted: `{ diceList: ["2d6", "2d8", "2d10", "2d12"], minMod: -2, maxMod: 5, showAdvantage: true, showDisadvantage: true }`

## File Changes

All modifications to existing files — no new files created.

| File | Change |
|------|--------|
| `src/engine.ts` | Generalize all functions to accept `count`, add `parseDiceNotation`, update `DiceConfig` |
| `src/__tests__/engine.test.ts` | Update existing tests for new signatures, add tests for generalized enumeration and parser |
| `src/renderer.ts` | Update `renderDiceRow` to show min sum based on `config.count` instead of hardcoded 2 |
| `src/main.ts` | Replace hardcoded dice setup with dynamic add/remove, wire input, add localStorage |
| `index.html` | Add dice input field, add button, pill container to header |
| `src/style.css` | Add styles for dice input, pills, remove buttons |
