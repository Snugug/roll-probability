import type { DiceConfig } from './thresholds';
import { StackedBar } from './components/stacked-bar';
import { BarColumn } from './components/bar-column';
import { BarChartView } from './components/bar-chart-view';
import { DiceRowElement } from './components/dice-row';
import { DiceTableElement } from './components/dice-table';

if (!customElements.get('stacked-bar')) customElements.define('stacked-bar', StackedBar);
if (!customElements.get('bar-column')) customElements.define('bar-column', BarColumn);
if (!customElements.get('bar-chart-view')) customElements.define('bar-chart-view', BarChartView);
if (!customElements.get('dice-row')) customElements.define('dice-row', DiceRowElement);
if (!customElements.get('dice-table')) customElements.define('dice-table', DiceTableElement);

export function renderPage(
  container: HTMLElement,
  configs: DiceConfig[],
  showAdvantage: boolean,
  showDisadvantage: boolean,
  onConfigChange?: (index: number, config: DiceConfig, presetName: string) => void,
  onDialogClose?: () => void
): void {
  container.replaceChildren();

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const row = document.createElement('dice-row') as DiceRowElement;
    row.config = config;
    row.showAdvantage = showAdvantage;
    row.showDisadvantage = showDisadvantage;
    if (onConfigChange) {
      const idx = i;
      row.onConfigChange = (cfg, presetName) => {
        onConfigChange(idx, cfg, presetName);
      };
    }
    if (onDialogClose) {
      row.onDialogClose = onDialogClose;
    }
    container.appendChild(row);
  }
}
