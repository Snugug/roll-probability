import type { DiceConfig } from '../thresholds';
import { buildColumnDescriptors, type ModifierData, type DiceView, type ColumnDescriptor } from './dice-view-data';
import type { RollMode } from '../engine';

interface ColumnDef {
  label: string;
  color: string;
  swatchClass: string;
  getValues: (modData: ModifierData, modes: RollMode[]) => number[];
}

export class DiceTableElement extends HTMLElement implements DiceView {
  update(
    data: ModifierData[],
    config: DiceConfig,
    showAdvantage: boolean,
    showDisadvantage: boolean,
  ): void {
    this.replaceChildren();

    const modes = this._activeModes(showAdvantage, showDisadvantage);
    const multiMode = modes.length > 1;
    const columns = this._buildColumns(config);

    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';

    const table = document.createElement('table');
    table.className = 'dice-table';

    this._buildHead(table, columns, modes, multiMode);
    this._buildBody(table, data, columns, modes);

    wrapper.appendChild(table);
    this.appendChild(wrapper);
  }

  private _activeModes(showAdv: boolean, showDis: boolean): RollMode[] {
    const modes: RollMode[] = [];
    if (showDis) modes.push('disadvantage');
    modes.push('normal');
    if (showAdv) modes.push('advantage');
    return modes;
  }

  private _buildColumns(config: DiceConfig): ColumnDef[] {
    return buildColumnDescriptors(config).map(col => ({
      ...col,
      getValues: this._getValuesFn(col),
    }));
  }

  private _getValuesFn(col: ColumnDescriptor): ColumnDef['getValues'] {
    if (col.kind === 'category') {
      return (modData, modes) =>
        modes.map(m => {
          const r = modData.results[m];
          if (!r) return 0;
          const base = r.segments[col.catIndex]?.percent ?? 0;
          const critHit = r.critHitPerCategory[col.catIndex] ?? 0;
          const critMiss = r.critMissPerCategory[col.catIndex] ?? 0;
          return base - critHit - critMiss;
        });
    }
    if (col.kind === 'crit-miss') {
      return (modData, modes) =>
        modes.map(m => modData.results[m]?.critMissPerCategory.reduce((a, b) => a + b, 0) ?? 0);
    }
    return (modData, modes) =>
      modes.map(m => modData.results[m]?.critHitPerCategory.reduce((a, b) => a + b, 0) ?? 0);
  }

  private _buildHead(
    table: HTMLTableElement,
    columns: ColumnDef[],
    modes: RollMode[],
    multiMode: boolean,
  ): void {
    const thead = document.createElement('thead');

    const catRow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.className = 'corner';
    corner.textContent = 'Mod';
    if (multiMode) corner.rowSpan = 2;
    catRow.appendChild(corner);

    for (const col of columns) {
      const th = document.createElement('th');
      if (multiMode) th.colSpan = modes.length;

      const swatch = document.createElement('span');
      swatch.className = col.swatchClass ? 'range-swatch ' + col.swatchClass : 'range-swatch';
      swatch.style.backgroundColor = col.color;
      th.appendChild(swatch);

      const text = document.createTextNode(col.label);
      th.appendChild(text);
      catRow.appendChild(th);
    }

    thead.appendChild(catRow);

    if (multiMode) {
      const modeRow = document.createElement('tr');
      modeRow.className = 'mode-header-row';
      for (const col of columns) {
        for (const mode of modes) {
          const th = document.createElement('th');
          const modeLabel = mode === 'disadvantage' ? 'dis' : mode === 'advantage' ? 'adv' : 'base';
          const modeClass = mode === 'disadvantage' ? 'dis' : mode === 'advantage' ? 'adv' : 'nor';
          th.className = modeClass;
          th.textContent = modeLabel;
          modeRow.appendChild(th);
        }
      }
      thead.appendChild(modeRow);
    }

    table.appendChild(thead);
  }

  private _buildBody(
    table: HTMLTableElement,
    data: ModifierData[],
    columns: ColumnDef[],
    modes: RollMode[],
  ): void {
    const tbody = document.createElement('tbody');

    for (const modData of data) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = modData.modifier >= 0 ? '+' + modData.modifier : String(modData.modifier);
      tr.appendChild(th);

      for (const col of columns) {
        const values = col.getValues(modData, modes);
        for (const val of values) {
          const td = document.createElement('td');
          td.textContent = val.toFixed(1) + '%';
          tr.appendChild(td);
        }
      }

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
  }
}
