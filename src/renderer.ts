import { computeProbabilities, type RollMode } from './engine';
import type { DiceConfig, ThresholdCategory } from './thresholds';

interface SegmentData {
  label: string;
  color: string;
  percent: number;
}

class StackedBar extends HTMLElement {
  segments!: SegmentData[];

  connectedCallback() {
    // Render from last category to first (highest at top, floor at bottom)
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i];
      if (seg.percent === 0) continue;

      const el = document.createElement('div');
      el.className = 'seg';
      el.style.backgroundColor = seg.color;
      el.style.flex = String(seg.percent);

      if (seg.percent >= 5) {
        const span = document.createElement('span');
        span.textContent = Math.round(seg.percent) + '%';
        el.appendChild(span);
      }

      el.dataset.tooltip = seg.label + ': ' + seg.percent.toFixed(2) + '%';
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
    norLabel.textContent = 'base';
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
      const probabilities = computeProbabilities(
        this.config.count, this.config.sides, this.config.thresholds, this.modifier, mode
      );
      const segments: SegmentData[] = probabilities.map((percent, i) => ({
        label: this.config.categories[i].label,
        color: this.config.categories[i].color,
        percent,
      }));
      const bar = document.createElement('stacked-bar') as StackedBar;
      bar.segments = segments;
      group.appendChild(bar);
    }

    this.appendChild(group);

    const modLabel = document.createElement('div');
    modLabel.className = 'mod-label';
    modLabel.textContent = this.modifier >= 0 ? '+' + this.modifier : String(this.modifier);
    this.appendChild(modLabel);
  }
}

function createGearSvg(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');

  // Center circle
  const circle = document.createElementNS(ns, 'circle');
  circle.setAttribute('cx', '8');
  circle.setAttribute('cy', '8');
  circle.setAttribute('r', '2.5');
  svg.appendChild(circle);

  // 8 lines radiating outward
  const lineCount = 8;
  for (let i = 0; i < lineCount; i++) {
    const angle = (i * 360) / lineCount;
    const rad = (angle * Math.PI) / 180;
    const x1 = 8 + Math.cos(rad) * 4.5;
    const y1 = 8 + Math.sin(rad) * 4.5;
    const x2 = 8 + Math.cos(rad) * 6.5;
    const y2 = 8 + Math.sin(rad) * 6.5;

    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', x1.toFixed(2));
    line.setAttribute('y1', y1.toFixed(2));
    line.setAttribute('x2', x2.toFixed(2));
    line.setAttribute('y2', y2.toFixed(2));
    svg.appendChild(line);
  }

  return svg;
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

    const { thresholds, categories } = this.config;

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      let rangeText: string;
      if (i === 0) {
        // Floor category: <threshold[0]
        rangeText = '<' + thresholds[0];
      } else if (i === categories.length - 1) {
        // Ceiling category: threshold[i-1]+
        rangeText = thresholds[i - 1] + '+';
      } else {
        // Middle category: threshold[i-1]–threshold[i]-1
        rangeText = thresholds[i - 1] + '\u2013' + (thresholds[i] - 1);
      }

      const rangeEl = document.createElement('span');
      rangeEl.className = 'dice-range-item';

      const swatch = document.createElement('span');
      swatch.className = 'range-swatch';
      swatch.style.backgroundColor = cat.color;
      rangeEl.appendChild(swatch);

      const text = document.createElement('span');
      text.textContent = cat.label + ' ' + rangeText;
      rangeEl.appendChild(text);

      header.appendChild(rangeEl);
    }

    // Gear icon button
    const gearBtn = document.createElement('button');
    gearBtn.className = 'gear-btn';
    gearBtn.setAttribute('commandfor', 'dialog-' + this.config.label);
    gearBtn.setAttribute('command', 'show-modal');
    gearBtn.appendChild(createGearSvg());
    header.appendChild(gearBtn);

    this.appendChild(header);

    // Dialog placeholder
    const dialog = document.createElement('dialog');
    dialog.id = 'dialog-' + this.config.label;
    this.appendChild(dialog);

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

if (!customElements.get('stacked-bar')) customElements.define('stacked-bar', StackedBar);
if (!customElements.get('bar-column')) customElements.define('bar-column', BarColumn);
if (!customElements.get('dice-row')) customElements.define('dice-row', DiceRowElement);

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
