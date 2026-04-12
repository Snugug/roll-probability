import { computeOptimalThresholds, type DiceConfig } from './engine';
import { renderPage } from './renderer';
import './style.css';

const BASELINE_MISS = (15 / 36) * 100;
const BASELINE_WEAK = (15 / 36) * 100;
const BASELINE_STRONG = (6 / 36) * 100;

function init(): void {
  const diceConfigs: DiceConfig[] = [
    { sides: 6, label: '2d6', missMax: 6, weakMax: 9 },
  ];

  for (const sides of [8, 10, 12]) {
    const t = computeOptimalThresholds(sides, BASELINE_MISS, BASELINE_WEAK, BASELINE_STRONG);
    diceConfigs.push({ sides, label: '2d' + sides, missMax: t.missMax, weakMax: t.weakMax });
  }

  let minMod = -2;
  let maxMod = 5;
  let showAdvantage = true;
  let showDisadvantage = true;

  const rowsContainer = document.getElementById('dice-rows')!;
  const minInput = document.getElementById('min-mod') as HTMLInputElement;
  const maxInput = document.getElementById('max-mod') as HTMLInputElement;
  const advToggle = document.getElementById('adv-toggle') as HTMLButtonElement;
  const disToggle = document.getElementById('dis-toggle') as HTMLButtonElement;

  function update(): void {
    renderPage(rowsContainer, diceConfigs, minMod, maxMod, showAdvantage, showDisadvantage);
  }

  minInput.addEventListener('change', () => {
    const val = parseInt(minInput.value, 10);
    if (!isNaN(val)) {
      minMod = val;
      update();
    }
  });

  maxInput.addEventListener('change', () => {
    const val = parseInt(maxInput.value, 10);
    if (!isNaN(val)) {
      maxMod = val;
      update();
    }
  });

  advToggle.addEventListener('click', () => {
    showAdvantage = !showAdvantage;
    advToggle.classList.toggle('active', showAdvantage);
    update();
  });

  disToggle.addEventListener('click', () => {
    showDisadvantage = !showDisadvantage;
    disToggle.classList.toggle('active', showDisadvantage);
    update();
  });

  update();
}

document.addEventListener('DOMContentLoaded', init);
