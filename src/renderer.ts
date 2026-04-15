import { computeProbabilities, type DiceConfig, type ProbabilityResult, type RollMode } from './engine';

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
    container.appendChild(
      renderDiceRow(config, minMod, maxMod, showAdvantage, showDisadvantage)
    );
  }
}

function renderDiceRow(
  config: DiceConfig,
  minMod: number,
  maxMod: number,
  showAdvantage: boolean,
  showDisadvantage: boolean
): HTMLElement {
  const row = document.createElement('div');
  row.className = 'dice-row';

  const header = document.createElement('div');
  header.className = 'dice-header';

  const label = document.createElement('span');
  label.className = 'dice-label';
  label.textContent = config.label;
  header.appendChild(label);

  const rangeItems: Array<{ cls: string; name: string; range: string }> = [
    { cls: 'miss', name: 'Miss', range: config.count + '\u2013' + config.missMax },
    { cls: 'weak', name: 'Weak Hit', range: (config.missMax + 1) + '\u2013' + config.weakMax },
    { cls: 'strong', name: 'Strong Hit', range: (config.weakMax + 1) + '+' },
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

  row.appendChild(header);

  const barsContainer = document.createElement('div');
  barsContainer.className = 'bars';

  for (let mod = minMod; mod <= maxMod; mod++) {
    barsContainer.appendChild(
      renderBarColumn(config, mod, showAdvantage, showDisadvantage)
    );
  }

  row.appendChild(barsContainer);
  return row;
}

function renderBarColumn(
  config: DiceConfig,
  modifier: number,
  showAdvantage: boolean,
  showDisadvantage: boolean
): HTMLElement {
  const col = document.createElement('div');
  col.className = 'bar-col';

  const typeRow = document.createElement('div');
  typeRow.className = 'bar-type-row';

  if (showDisadvantage) {
    const disLabel = document.createElement('span');
    disLabel.className = 'type-dis';
    disLabel.textContent = 'dis';
    typeRow.appendChild(disLabel);
  }

  const norLabel = document.createElement('span');
  norLabel.className = 'type-nor';
  norLabel.textContent = 'nrm';
  typeRow.appendChild(norLabel);

  if (showAdvantage) {
    const advLabel = document.createElement('span');
    advLabel.className = 'type-adv';
    advLabel.textContent = 'adv';
    typeRow.appendChild(advLabel);
  }

  col.appendChild(typeRow);

  const group = document.createElement('div');
  group.className = 'bar-group';

  const modes: Array<{ mode: RollMode; show: boolean }> = [
    { mode: 'disadvantage', show: showDisadvantage },
    { mode: 'normal', show: true },
    { mode: 'advantage', show: showAdvantage },
  ];

  for (const { mode, show } of modes) {
    if (!show) continue;
    const result = computeProbabilities(
      config.count, config.sides, config.missMax, config.weakMax, modifier, mode
    );
    group.appendChild(renderStackedBar(result));
  }

  col.appendChild(group);

  const modLabel = document.createElement('div');
  modLabel.className = 'mod-label';
  modLabel.textContent = modifier >= 0 ? '+' + modifier : String(modifier);
  col.appendChild(modLabel);

  return col;
}

function renderStackedBar(result: ProbabilityResult): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'bar-stack';

  const segments: Array<{ value: number; className: string; tooltipLabel: string }> = [
    { value: result.strongHit, className: 'seg seg-s', tooltipLabel: 'Strong Hit' },
    { value: result.weakHit, className: 'seg seg-w', tooltipLabel: 'Weak Hit' },
    { value: result.miss, className: 'seg seg-m', tooltipLabel: 'Miss' },
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

    bar.appendChild(el);
  }

  return bar;
}
