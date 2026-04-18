import type { RollMode, CriticalConfig } from '../engine';
import { StackedBar } from './stacked-bar';
import type { ModeResult } from './dice-view-data';

export class BarColumn extends HTMLElement {
  modifier = 0;
  showAdvantage = true;
  showDisadvantage = true;
  critConfig: CriticalConfig = { type: 'none' };
  modeResults: Partial<Record<RollMode, ModeResult>> = {};

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
      const result = this.modeResults[mode]!;
      const bar = document.createElement('stacked-bar') as StackedBar;
      bar.segments = result.segments;
      bar.critHitPerCategory = result.critHitPerCategory;
      bar.critMissPerCategory = result.critMissPerCategory;
      bar.critConfig = this.critConfig;
      group.appendChild(bar);
    }

    this.appendChild(group);

    const modLabel = document.createElement('div');
    modLabel.className = 'mod-label';
    modLabel.textContent = this.modifier >= 0 ? '+' + this.modifier : String(this.modifier);
    this.appendChild(modLabel);
  }
}
