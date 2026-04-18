import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { computeViewData } from '../src/components/dice-view-data';
import { DiceTableElement } from '../src/components/dice-table';
import type { DiceConfig } from '../src/thresholds';
import '../src/renderer';

const config2d6: DiceConfig = {
  count: 2, sides: 6, label: '2d6',
  thresholds: [7, 10],
  categories: [
    { label: 'Miss', color: '#f87171' },
    { label: 'Weak Hit', color: '#facc15' },
    { label: 'Strong Hit', color: '#4ade80' },
  ],
  criticals: { type: 'none' },
  minMod: 0, maxMod: 2,
};

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

describe('DiceTableElement — no crits', () => {
  it('renders a table element', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = computeViewData(config2d6, false, false);
    table.update(data, config2d6, false, false);
    expect(table.querySelector('table')).toBeTruthy();
  });

  it('has one body row per modifier', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = computeViewData(config2d6, false, false);
    table.update(data, config2d6, false, false);
    const rows = table.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
  });

  it('has no crit columns when type is none', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = computeViewData(config2d6, false, false);
    table.update(data, config2d6, false, false);
    const headerText = table.querySelector('thead')!.textContent!;
    expect(headerText).not.toContain('Crit');
  });

  it('has 3 category headers plus Mod corner for no-crit base-only', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = computeViewData(config2d6, false, false);
    table.update(data, config2d6, false, false);
    const headerRow = table.querySelector('thead tr')!;
    const ths = headerRow.querySelectorAll('th');
    expect(ths.length).toBe(4); // Mod + 3 categories
  });

  it('cells contain percentage values', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = computeViewData(config2d6, false, false);
    table.update(data, config2d6, false, false);
    const firstCell = table.querySelector('tbody td')!;
    expect(firstCell.textContent).toMatch(/\d+\.\d%$/);
  });

  it('modifier row headers show signed values', () => {
    const cfg = { ...config2d6, minMod: -1, maxMod: 1 };
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = computeViewData(cfg, false, false);
    table.update(data, cfg, false, false);
    const ths = table.querySelectorAll('tbody th');
    expect(ths[0].textContent).toBe('-1');
    expect(ths[1].textContent).toBe('+0');
    expect(ths[2].textContent).toBe('+1');
  });
});

describe('DiceTableElement — mode sub-columns', () => {
  it('shows dis/base/adv sub-headers when multiple modes active', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = computeViewData(config2d6, true, true);
    table.update(data, config2d6, true, true);
    const headerRows = table.querySelectorAll('thead tr');
    expect(headerRows.length).toBe(2);
    const modeRow = headerRows[1];
    expect(modeRow.textContent).toContain('dis');
    expect(modeRow.textContent).toContain('base');
    expect(modeRow.textContent).toContain('adv');
  });

  it('has 3 cells per category per row when all modes active', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = computeViewData(config2d6, true, true);
    table.update(data, config2d6, true, true);
    const firstRow = table.querySelector('tbody tr')!;
    const tds = firstRow.querySelectorAll('td');
    expect(tds.length).toBe(9); // 3 categories × 3 modes
  });

  it('has single header row when only base mode', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = computeViewData(config2d6, false, false);
    table.update(data, config2d6, false, false);
    const headerRows = table.querySelectorAll('thead tr');
    expect(headerRows.length).toBe(1);
  });
});

describe('DiceTableElement — natural crits', () => {
  const naturalCfg: DiceConfig = {
    ...config2d6,
    criticals: { type: 'natural', hit: 12, miss: 2 },
  };

  it('places Crit Miss first and Crit Hit last', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = computeViewData(naturalCfg, false, false);
    table.update(data, naturalCfg, false, false);
    const headerRow = table.querySelector('thead tr')!;
    const ths = headerRow.querySelectorAll('th');
    expect(ths[1].textContent).toContain('Crit Miss');
    expect(ths[ths.length - 1].textContent).toContain('Crit Hit');
  });
});

describe('DiceTableElement — conditional-doubles crits', () => {
  const condCfg: DiceConfig = {
    ...config2d6,
    criticals: { type: 'conditional-doubles', hit: 2, miss: 0 },
  };

  it('places Crit Miss before its linked category and Crit Hit after', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = computeViewData(condCfg, false, false);
    table.update(data, condCfg, false, false);
    const headerRow = table.querySelector('thead tr')!;
    const ths = headerRow.querySelectorAll('th');
    const texts = Array.from(ths).map(th => th.textContent!.trim());
    const missIdx = texts.findIndex(t => t.includes('Crit Miss'));
    const catMissIdx = texts.findIndex(t => t.includes('Miss') && !t.includes('Crit'));
    const hitIdx = texts.findIndex(t => t.includes('Crit Hit'));
    const catHitIdx = texts.findIndex(t => t.includes('Strong Hit'));
    expect(missIdx).toBeLessThan(catMissIdx);
    expect(hitIdx).toBeGreaterThan(catHitIdx);
  });
});

describe('DiceTableElement — conditional-doubles out-of-bounds indices', () => {
  const oobMissCfg: DiceConfig = {
    ...config2d6,
    criticals: { type: 'conditional-doubles', hit: 2, miss: 5 },
  };

  const oobHitCfg: DiceConfig = {
    ...config2d6,
    criticals: { type: 'conditional-doubles', hit: 5, miss: 0 },
  };

  it('prepends Crit Miss when miss index is out of bounds', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = computeViewData(oobMissCfg, false, false);
    table.update(data, oobMissCfg, false, false);
    const headerRow = table.querySelector('thead tr')!;
    const ths = headerRow.querySelectorAll('th');
    expect(ths[1].textContent).toContain('Crit Miss');
  });

  it('appends Crit Hit when hit index is out of bounds', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = computeViewData(oobHitCfg, false, false);
    table.update(data, oobHitCfg, false, false);
    const headerRow = table.querySelector('thead tr')!;
    const ths = headerRow.querySelectorAll('th');
    expect(ths[ths.length - 1].textContent).toContain('Crit Hit');
  });
});

describe('DiceTableElement — doubles crits', () => {
  const doublesCfg: DiceConfig = {
    ...config2d6,
    criticals: { type: 'doubles', color: '#ffaa00', label: 'Doubles!' },
  };

  it('shows doubles column at end', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = computeViewData(doublesCfg, false, false);
    table.update(data, doublesCfg, false, false);
    const headerRow = table.querySelector('thead tr')!;
    const ths = headerRow.querySelectorAll('th');
    expect(ths[ths.length - 1].textContent).toContain('Doubles!');
  });
});

describe('DiceTableElement — crits with multi-mode', () => {
  const naturalCfg: DiceConfig = {
    ...config2d6,
    criticals: { type: 'natural', hit: 12, miss: 2 },
  };

  it('renders mode sub-headers for crit columns in multi-mode', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = computeViewData(naturalCfg, true, true);
    table.update(data, naturalCfg, true, true);
    const headerRows = table.querySelectorAll('thead tr');
    expect(headerRows.length).toBe(2);
    // 5 columns (Crit Miss + 3 categories + Crit Hit) × 3 modes = 15 sub-headers
    const modeRow = headerRows[1];
    expect(modeRow.querySelectorAll('th').length).toBe(15);
  });
});

describe('DiceTableElement — missing mode result fallback', () => {
  it('renders 0% when a mode result is missing from data', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = [
      {
        modifier: 0,
        results: {
          normal: {
            segments: [
              { label: 'Miss', color: '#f87171', percent: 50 },
              { label: 'Hit', color: '#4ade80', percent: 50 },
            ],
            critHitPerCategory: [0, 0],
            critMissPerCategory: [0, 0],
          },
        },
      },
    ];
    const cfg: DiceConfig = {
      ...config2d6,
      categories: [
        { label: 'Miss', color: '#f87171' },
        { label: 'Hit', color: '#4ade80' },
      ],
      thresholds: [7],
      minMod: 0, maxMod: 0,
    };
    table.update(data, cfg, true, false);
    const tds = table.querySelectorAll('tbody td');
    // 2 categories × 2 modes (normal + advantage), but advantage has no data
    expect(tds.length).toBe(4);
    // advantage cells should show 0.0%
    expect(tds[1].textContent).toBe('0.0%');
    expect(tds[3].textContent).toBe('0.0%');
  });

  it('renders 0% for crit columns when a mode result is missing', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = [
      {
        modifier: 0,
        results: {
          normal: {
            segments: [
              { label: 'Miss', color: '#f87171', percent: 50 },
              { label: 'Hit', color: '#4ade80', percent: 50 },
            ],
            critHitPerCategory: [0, 5],
            critMissPerCategory: [3, 0],
          },
        },
      },
    ];
    const cfg: DiceConfig = {
      ...config2d6,
      categories: [
        { label: 'Miss', color: '#f87171' },
        { label: 'Hit', color: '#4ade80' },
      ],
      thresholds: [7],
      minMod: 0, maxMod: 0,
      criticals: { type: 'natural', hit: 12, miss: 2 },
    };
    table.update(data, cfg, true, false);
    // Find crit columns — they should have 0% for the missing advantage mode
    const tds = table.querySelectorAll('tbody td');
    const zeroCells = Array.from(tds).filter(td => td.textContent === '0.0%');
    expect(zeroCells.length).toBeGreaterThan(0);
  });
});

describe('DiceTableElement — doubles crit missing mode fallback', () => {
  it('renders 0% for doubles column when a mode result is missing', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = [
      {
        modifier: 0,
        results: {
          normal: {
            segments: [
              { label: 'Miss', color: '#f87171', percent: 50 },
              { label: 'Hit', color: '#4ade80', percent: 50 },
            ],
            critHitPerCategory: [5, 5],
            critMissPerCategory: [0, 0],
          },
        },
      },
    ];
    const cfg: DiceConfig = {
      ...config2d6,
      categories: [
        { label: 'Miss', color: '#f87171' },
        { label: 'Hit', color: '#4ade80' },
      ],
      thresholds: [7],
      minMod: 0, maxMod: 0,
      criticals: { type: 'doubles', color: '#ffaa00', label: 'Doubles!' },
    };
    table.update(data, cfg, true, false);
    // 3 columns (Miss, Hit, Doubles!) × 2 modes (normal + advantage) = 6 tds
    const tds = table.querySelectorAll('tbody td');
    expect(tds.length).toBe(6);
    // Last column advantage cell should be 0.0%
    expect(tds[5].textContent).toBe('0.0%');
  });
});

describe('DiceTableElement — replaces on update', () => {
  it('clears previous content on re-render', () => {
    const table = document.createElement('dice-table') as DiceTableElement;
    container.appendChild(table);
    const data = computeViewData(config2d6, false, false);
    table.update(data, config2d6, false, false);
    table.update(data, config2d6, false, false);
    expect(table.querySelectorAll('table').length).toBe(1);
  });
});
