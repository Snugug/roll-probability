import type { DiceConfig } from '../thresholds';
import type { ThresholdEditorState } from '../editor-state';

export function renderCritSubInputs(
  container: HTMLElement,
  config: DiceConfig,
  state: ThresholdEditorState,
  disabled: boolean,
): void {
  container.replaceChildren();
  const crit = config.criticals;

  if (crit.type === 'natural') {
    const hitLabel = document.createElement('span');
    hitLabel.textContent = 'Hit:';
    container.appendChild(hitLabel);

    const hitInput = document.createElement('input');
    hitInput.type = 'number';
    hitInput.value = String(crit.hit);
    hitInput.disabled = disabled;
    hitInput.addEventListener('input', () => {
      const val = parseInt(hitInput.value, 10);
      if (!isNaN(val)) {
        state.updateNaturalCrit('hit', val);
      }
    });
    container.appendChild(hitInput);

    const missLabel = document.createElement('span');
    missLabel.textContent = 'Miss:';
    container.appendChild(missLabel);

    const missInput = document.createElement('input');
    missInput.type = 'number';
    missInput.value = String(crit.miss);
    missInput.disabled = disabled;
    missInput.addEventListener('input', () => {
      const val = parseInt(missInput.value, 10);
      if (!isNaN(val)) {
        state.updateNaturalCrit('miss', val);
      }
    });
    container.appendChild(missInput);
  } else if (crit.type === 'conditional-doubles') {
    const hitLabel = document.createElement('span');
    hitLabel.textContent = 'Hit:';
    container.appendChild(hitLabel);

    const hitSelect = document.createElement('select');
    hitSelect.disabled = disabled;
    for (let i = 0; i < config.categories.length; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = config.categories[i].label;
      if (i === crit.hit) opt.selected = true;
      hitSelect.appendChild(opt);
    }
    hitSelect.addEventListener('change', () => {
      const val = parseInt(hitSelect.value, 10);
      if (!isNaN(val)) {
        state.updateConditionalDoublesCrit('hit', val);
      }
    });
    container.appendChild(hitSelect);

    const missLabel = document.createElement('span');
    missLabel.textContent = 'Miss:';
    container.appendChild(missLabel);

    const missSelect = document.createElement('select');
    missSelect.disabled = disabled;
    for (let i = 0; i < config.categories.length; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = config.categories[i].label;
      if (i === crit.miss) opt.selected = true;
      missSelect.appendChild(opt);
    }
    missSelect.addEventListener('change', () => {
      const val = parseInt(missSelect.value, 10);
      if (!isNaN(val)) {
        state.updateConditionalDoublesCrit('miss', val);
      }
    });
    container.appendChild(missSelect);
  } else if (crit.type === 'doubles') {
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = crit.color;
    colorInput.disabled = disabled;
    colorInput.addEventListener('input', () => {
      state.updateDoublesCrit('color', colorInput.value);
    });
    container.appendChild(colorInput);

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.value = crit.label;
    labelInput.disabled = disabled;
    labelInput.addEventListener('input', () => {
      state.updateDoublesCrit('label', labelInput.value);
    });
    container.appendChild(labelInput);
  }
}
