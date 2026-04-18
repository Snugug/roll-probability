import { computeProbabilities, type RollMode } from '../engine';
import type { DiceConfig } from '../thresholds';
import { StackedBar, type SegmentData } from './stacked-bar';

export class BarColumn extends HTMLElement {
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
      const result = computeProbabilities(
        this.config.count, this.config.sides, this.config.thresholds,
        this.modifier, mode, this.config.criticals
      );
      const segments: SegmentData[] = result.categories.map((percent, i) => ({
        label: this.config.categories[i].label,
        color: this.config.categories[i].color,
        percent,
      }));
      const bar = document.createElement('stacked-bar') as StackedBar;
      bar.segments = segments;
      bar.critHitPerCategory = result.critHitPerCategory;
      bar.critMissPerCategory = result.critMissPerCategory;
      bar.critConfig = this.config.criticals;
      group.appendChild(bar);
    }

    this.appendChild(group);

    const modLabel = document.createElement('div');
    modLabel.className = 'mod-label';
    modLabel.textContent = this.modifier >= 0 ? '+' + this.modifier : String(this.modifier);
    this.appendChild(modLabel);
  }
}
