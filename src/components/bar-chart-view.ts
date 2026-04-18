import type { DiceConfig } from '../thresholds';
import type { ModifierData, DiceView } from './dice-view-data';
import { BarColumn } from './bar-column';

export class BarChartView extends HTMLElement implements DiceView {
  update(
    data: ModifierData[],
    config: DiceConfig,
    showAdvantage: boolean,
    showDisadvantage: boolean,
  ): void {
    this.replaceChildren();

    const barsContainer = document.createElement('div');
    barsContainer.className = 'bars';

    for (const modData of data) {
      const col = document.createElement('bar-column') as BarColumn;
      col.modifier = modData.modifier;
      col.showAdvantage = showAdvantage;
      col.showDisadvantage = showDisadvantage;
      col.critConfig = config.criticals;
      col.modeResults = modData.results;
      barsContainer.appendChild(col);
    }

    this.appendChild(barsContainer);
  }
}
