import { computeProbabilities, type DiceConfig, type ProbabilityResult, type RollMode } from './engine';

class StackedBar extends HTMLElement {
  result!: ProbabilityResult;

  connectedCallback() {
    const segments: Array<{ value: number; className: string; tooltipLabel: string }> = [
      { value: this.result.strongHit, className: 'seg seg-s', tooltipLabel: 'Strong Hit' },
      { value: this.result.weakHit, className: 'seg seg-w', tooltipLabel: 'Weak Hit' },
      { value: this.result.miss, className: 'seg seg-m', tooltipLabel: 'Miss' },
    ];

    for (const seg of segments) {
      const el = document.createElement('div');
      el.className = seg.className;
      el.style.flex = String(seg.value);

      if (seg.value >= 5) {
        const span = document.createElement('span');
        span.textContent = Math.round(seg.value) + '%';
        el.appendChild(span);
      }

      el.dataset.tooltip = seg.tooltipLabel + ': ' + seg.value.toFixed(2) + '%';
      this.appendChild(el);
    }
  }
}

class BarColumn extends HTMLElement {
  config!: DiceConfig;
  modifier = 0;
  showAdvantage = true;
  showDisadvantage = true;

  connectedCallback() {
    const typeRow = document.createElement('div');
    typeRow.className = 'bar-type-row';

    if (this.showDisadvantage) {
      const disLabel = document.createElement('span');
      disLabel.className = 'type-dis';
      disLabel.textContent = 'dis';
      typeRow.appendChild(disLabel);
    }

    const norLabel = document.createElement('span');
    norLabel.className = 'type-nor';
    norLabel.textContent = 'nrm';
    typeRow.appendChild(norLabel);

    if (this.showAdvantage) {
      const advLabel = document.createElement('span');
      advLabel.className = 'type-adv';
      advLabel.textContent = 'adv';
      typeRow.appendChild(advLabel);
    }

    this.appendChild(typeRow);

    const group = document.createElement('div');
    group.className = 'bar-group';

    const modes: Array<{ mode: RollMode; show: boolean }> = [
      { mode: 'disadvantage', show: this.showDisadvantage },
      { mode: 'normal', show: true },
      { mode: 'advantage', show: this.showAdvantage },
    ];

    for (const { mode, show } of modes) {
      if (!show) continue;
      const result = computeProbabilities(
        this.config.count, this.config.sides, this.config.missMax, this.config.weakMax, this.modifier, mode
      );
      const bar = document.createElement('stacked-bar') as StackedBar;
      bar.result = result;
      group.appendChild(bar);
    }

    this.appendChild(group);

    const modLabel = document.createElement('div');
    modLabel.className = 'mod-label';
    modLabel.textContent = this.modifier >= 0 ? '+' + this.modifier : String(this.modifier);
    this.appendChild(modLabel);
  }
}

class DiceRowElement extends HTMLElement {
  config!: DiceConfig;
  minMod = -2;
  maxMod = 5;
  showAdvantage = true;
  showDisadvantage = true;

  connectedCallback() {
    const header = document.createElement('div');
    header.className = 'dice-header';

    const label = document.createElement('span');
    label.className = 'dice-label';
    label.textContent = this.config.label;
    header.appendChild(label);

    const rangeItems: Array<{ cls: string; name: string; range: string }> = [
      { cls: 'miss', name: 'Miss', range: this.config.count + '\u2013' + this.config.missMax },
      { cls: 'weak', name: 'Weak Hit', range: (this.config.missMax + 1) + '\u2013' + this.config.weakMax },
      { cls: 'strong', name: 'Strong Hit', range: (this.config.weakMax + 1) + '+' },
    ];

    for (const item of rangeItems) {
      const rangeEl = document.createElement('span');
      rangeEl.className = 'dice-range-item';

      const swatch = document.createElement('span');
      swatch.className = 'range-swatch range-swatch-' + item.cls;
      rangeEl.appendChild(swatch);

      const text = document.createElement('span');
      text.textContent = item.name + ' ' + item.range;
      rangeEl.appendChild(text);

      header.appendChild(rangeEl);
    }

    this.appendChild(header);

    const barsContainer = document.createElement('div');
    barsContainer.className = 'bars';

    for (let mod = this.minMod; mod <= this.maxMod; mod++) {
      const col = document.createElement('bar-column') as BarColumn;
      col.config = this.config;
      col.modifier = mod;
      col.showAdvantage = this.showAdvantage;
      col.showDisadvantage = this.showDisadvantage;
      barsContainer.appendChild(col);
    }

    this.appendChild(barsContainer);
  }
}

customElements.define('stacked-bar', StackedBar);
customElements.define('bar-column', BarColumn);
customElements.define('dice-row', DiceRowElement);

export function renderPage(
  container: HTMLElement,
  configs: DiceConfig[],
  minMod: number,
  maxMod: number,
  showAdvantage: boolean,
  showDisadvantage: boolean
): void {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  for (const config of configs) {
    const row = document.createElement('dice-row') as DiceRowElement;
    row.config = config;
    row.minMod = minMod;
    row.maxMod = maxMod;
    row.showAdvantage = showAdvantage;
    row.showDisadvantage = showDisadvantage;
    container.appendChild(row);
  }
}
