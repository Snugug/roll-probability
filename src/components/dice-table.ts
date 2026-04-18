import type { DiceConfig } from '../thresholds';
import type { ModifierData, ModeResult, DiceView } from './dice-view-data';
import type { RollMode } from '../engine';

interface ColumnDef {
  label: string;
  color: string;
  swatchClass: string;
  isCrit: boolean;
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
    const columns = this._buildColumns(config, data);

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

  private _buildColumns(config: DiceConfig, _data: ModifierData[]): ColumnDef[] {
    const { categories, thresholds, criticals } = config;
    const columns: ColumnDef[] = [];

    const hasCritSwatches = criticals.type === 'natural' || criticals.type === 'conditional-doubles';
    const missBeforeCat = criticals.type === 'conditional-doubles' ? criticals.miss : -1;
    const hitAfterCat = criticals.type === 'conditional-doubles' ? criticals.hit : -1;
    const missCatColor = criticals.type === 'conditional-doubles'
      ? categories[criticals.miss]?.color ?? '#888' : '#888';
    const hitCatColor = criticals.type === 'conditional-doubles'
      ? categories[criticals.hit]?.color ?? '#888' : '#888';

    if (hasCritSwatches && criticals.type === 'natural') {
      columns.push(this._critMissCol(missCatColor));
    }

    for (let i = 0; i < categories.length; i++) {
      if (hasCritSwatches && i === missBeforeCat) {
        columns.push(this._critMissCol(missCatColor));
      }

      const cat = categories[i];
      let rangeText: string;
      if (i === 0) {
        rangeText = '\u2264' + (thresholds[0] - 1);
      } else if (i === categories.length - 1) {
        rangeText = thresholds[i - 1] + '+';
      } else {
        rangeText = thresholds[i - 1] + '\u2013' + (thresholds[i] - 1);
      }

      const catIdx = i;
      columns.push({
        label: cat.label + ' ' + rangeText,
        color: cat.color,
        swatchClass: '',
        isCrit: false,
        getValues: (modData, modes) =>
          modes.map(m => modData.results[m]?.segments[catIdx]?.percent ?? 0),
      });

      if (hasCritSwatches && i === hitAfterCat) {
        columns.push(this._critHitCol(hitCatColor));
      }
    }

    if (hasCritSwatches && criticals.type === 'natural') {
      columns.push(this._critHitCol(hitCatColor));
    } else if (hasCritSwatches && criticals.type === 'conditional-doubles') {
      if (missBeforeCat < 0 || missBeforeCat >= categories.length) {
        columns.unshift(this._critMissCol(missCatColor));
      }
      if (hitAfterCat < 0 || hitAfterCat >= categories.length) {
        columns.push(this._critHitCol(hitCatColor));
      }
    }

    if (criticals.type === 'doubles') {
      columns.push({
        label: criticals.label,
        color: criticals.color,
        swatchClass: '',
        isCrit: true,
        getValues: (modData, modes) =>
          modes.map(m => {
            const r = modData.results[m];
            if (!r) return 0;
            return r.critHitPerCategory.reduce((a, b) => a + b, 0);
          }),
      });
    }

    return columns;
  }

  private _critMissCol(color: string): ColumnDef {
    return {
      label: 'Crit Miss',
      color,
      swatchClass: 'range-swatch-crit-miss',
      isCrit: true,
      getValues: (modData, modes) =>
        modes.map(m => {
          const r = modData.results[m];
          if (!r) return 0;
          return r.critMissPerCategory.reduce((a, b) => a + b, 0);
        }),
    };
  }

  private _critHitCol(color: string): ColumnDef {
    return {
      label: 'Crit Hit',
      color,
      swatchClass: 'range-swatch-crit-hit',
      isCrit: true,
      getValues: (modData, modes) =>
        modes.map(m => {
          const r = modData.results[m];
          if (!r) return 0;
          return r.critHitPerCategory.reduce((a, b) => a + b, 0);
        }),
    };
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
      if (col.isCrit) th.classList.add('crit-col');

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
          if (col.isCrit) th.classList.add('crit-col');
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
          if (col.isCrit) td.classList.add('crit-col');
          td.textContent = val.toFixed(1) + '%';
          tr.appendChild(td);
        }
      }

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
  }
}
