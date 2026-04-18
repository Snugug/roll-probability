import { loadCustomPresets, type DiceConfig } from '../thresholds';
import { ThresholdEditorState } from '../editor-state';
import { BarColumn } from './bar-column';
import { buildDialogContent } from './dialog-builder';

function createGearSvg(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('viewBox', '0 -960 960 960');
  svg.setAttribute('fill', 'currentColor');

  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'm370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z');
  svg.appendChild(path);

  return svg;
}

export class DiceRowElement extends HTMLElement {
  config!: DiceConfig;
  showAdvantage = true;
  showDisadvantage = true;
  onConfigChange?: (config: DiceConfig, presetName: string) => void;
  onDialogClose?: () => void;

  _dialog!: HTMLDialogElement;
  _state!: ThresholdEditorState;

  connectedCallback() {
    this._state = new ThresholdEditorState(this.config, (kind) => {
      if (kind === 'structure') {
        this._buildDialogContent();
      } else {
        this._updateDialogValues();
      }
      if (this.onConfigChange) {
        this.onConfigChange(this.config, this._state.presetName);
      }
    });

    const header = document.createElement('div');
    header.className = 'dice-header';

    const label = document.createElement('span');
    label.className = 'dice-label';
    label.textContent = this.config.label;
    header.appendChild(label);

    this._renderRangeItems(header);

    const gearBtn = document.createElement('button');
    gearBtn.className = 'gear-btn';
    gearBtn.setAttribute('commandfor', 'dialog-' + this.config.label);
    gearBtn.setAttribute('command', 'show-modal');
    gearBtn.appendChild(createGearSvg());
    header.appendChild(gearBtn);

    this.appendChild(header);

    this._dialog = document.createElement('dialog');
    this._dialog.id = 'dialog-' + this.config.label;
    this._dialog.addEventListener('close', () => {
      if (this.onDialogClose) this.onDialogClose();
    });
    this._buildDialogContent();
    this.appendChild(this._dialog);

    loadCustomPresets().then(presets => {
      this._state.customPresets = presets;
      this._buildDialogContent();
    }).catch(() => {});

    const barsContainer = document.createElement('div');
    barsContainer.className = 'bars';

    for (let mod = this.config.minMod; mod <= this.config.maxMod; mod++) {
      const col = document.createElement('bar-column') as BarColumn;
      col.config = this.config;
      col.modifier = mod;
      col.showAdvantage = this.showAdvantage;
      col.showDisadvantage = this.showDisadvantage;
      barsContainer.appendChild(col);
    }

    this.appendChild(barsContainer);
  }

  private _renderRangeItems(header: HTMLElement) {
    const { thresholds, categories, criticals } = this.config;

    const rangeWrapper = document.createElement('div');
    rangeWrapper.className = 'dice-ranges';

    const hasCritSwatches = criticals.type === 'natural' || criticals.type === 'conditional-doubles';
    const missBeforeCat = criticals.type === 'conditional-doubles' ? criticals.miss : -1;
    const hitAfterCat = criticals.type === 'conditional-doubles' ? criticals.hit : -1;
    const missCatColor = criticals.type === 'conditional-doubles' ? categories[criticals.miss]?.color ?? '#888' : '#888';
    const hitCatColor = criticals.type === 'conditional-doubles' ? categories[criticals.hit]?.color ?? '#888' : '#888';

    if (hasCritSwatches && criticals.type === 'natural') {
      rangeWrapper.appendChild(this._makeRangeItem('Crit Miss', missCatColor, 'range-swatch-crit-miss'));
    }

    for (let i = 0; i < categories.length; i++) {
      if (hasCritSwatches && i === missBeforeCat) {
        rangeWrapper.appendChild(this._makeRangeItem('Crit Miss', missCatColor, 'range-swatch-crit-miss'));
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

      rangeWrapper.appendChild(this._makeRangeItem(cat.label + ' ' + rangeText, cat.color));

      if (hasCritSwatches && i === hitAfterCat) {
        rangeWrapper.appendChild(this._makeRangeItem('Crit Hit', hitCatColor, 'range-swatch-crit-hit'));
      }
    }

    if (hasCritSwatches && criticals.type === 'natural') {
      rangeWrapper.appendChild(this._makeRangeItem('Crit Hit', hitCatColor, 'range-swatch-crit-hit'));
    } else if (hasCritSwatches && criticals.type === 'conditional-doubles') {
      if (missBeforeCat < 0 || missBeforeCat >= categories.length) {
        rangeWrapper.insertBefore(
          this._makeRangeItem('Crit Miss', missCatColor, 'range-swatch-crit-miss'),
          rangeWrapper.firstChild
        );
      }
      if (hitAfterCat < 0 || hitAfterCat >= categories.length) {
        rangeWrapper.appendChild(this._makeRangeItem('Crit Hit', hitCatColor, 'range-swatch-crit-hit'));
      }
    }

    if (criticals.type === 'doubles') {
      rangeWrapper.appendChild(this._makeRangeItem(criticals.label, criticals.color));
    }

    header.appendChild(rangeWrapper);
  }

  private _makeRangeItem(label: string, bgColor: string, swatchClass: string = ''): HTMLSpanElement {
    const el = document.createElement('span');
    el.className = 'dice-range-item';
    const swatch = document.createElement('span');
    swatch.className = swatchClass ? 'range-swatch ' + swatchClass : 'range-swatch';
    swatch.style.backgroundColor = bgColor;
    el.appendChild(swatch);
    const text = document.createElement('span');
    text.textContent = label;
    el.appendChild(text);
    return el;
  }

  _buildDialogContent() {
    buildDialogContent({
      dialog: this._dialog,
      config: this.config,
      state: this._state,
      renderPreviewBars: (container) => this._renderPreviewBars(container),
      renderCritSubInputs: (container, disabled) => this._renderCritSubInputs(container, disabled),
    });
  }

  private _renderPreviewBars(container: HTMLElement) {
    container.replaceChildren();

    const barsWrapper = document.createElement('div');
    barsWrapper.className = 'bars';

    for (let mod = this.config.minMod; mod <= this.config.maxMod; mod++) {
      const col = document.createElement('bar-column') as BarColumn;
      col.config = this.config;
      col.modifier = mod;
      col.showAdvantage = this.showAdvantage;
      col.showDisadvantage = this.showDisadvantage;
      barsWrapper.appendChild(col);
    }

    container.appendChild(barsWrapper);
  }

  private _updateDialogValues(): void {
    const floorLabel = this._dialog.querySelector('.threshold-floor-label') as HTMLSpanElement | null;
    if (floorLabel && this.config.thresholds.length > 0) {
      floorLabel.textContent = '\u2264' + (this.config.thresholds[0] - 1);
    }

    const critContainer = this._dialog.querySelector('.crit-sub-inputs') as HTMLElement | null;
    if (critContainer) {
      this._renderCritSubInputs(critContainer, this._state.isBuiltin);
    }

    const preview = this._dialog.querySelector('.dialog-preview') as HTMLElement | null;
    if (preview) {
      this._renderPreviewBars(preview);
    }
  }

  private _renderCritSubInputs(container: HTMLElement, disabled: boolean) {
    container.replaceChildren();

    const crit = this.config.criticals;

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
          this._state.updateNaturalCrit('hit', val);
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
          this._state.updateNaturalCrit('miss', val);
        }
      });
      container.appendChild(missInput);
    } else if (crit.type === 'conditional-doubles') {
      const hitLabel = document.createElement('span');
      hitLabel.textContent = 'Hit:';
      container.appendChild(hitLabel);

      const hitSelect = document.createElement('select');
      hitSelect.disabled = disabled;
      for (let i = 0; i < this.config.categories.length; i++) {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = this.config.categories[i].label;
        if (i === crit.hit) opt.selected = true;
        hitSelect.appendChild(opt);
      }
      hitSelect.addEventListener('change', () => {
        const val = parseInt(hitSelect.value, 10);
        if (!isNaN(val)) {
          this._state.updateConditionalDoublesCrit('hit', val);
        }
      });
      container.appendChild(hitSelect);

      const missLabel = document.createElement('span');
      missLabel.textContent = 'Miss:';
      container.appendChild(missLabel);

      const missSelect = document.createElement('select');
      missSelect.disabled = disabled;
      for (let i = 0; i < this.config.categories.length; i++) {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = this.config.categories[i].label;
        if (i === crit.miss) opt.selected = true;
        missSelect.appendChild(opt);
      }
      missSelect.addEventListener('change', () => {
        const val = parseInt(missSelect.value, 10);
        if (!isNaN(val)) {
          this._state.updateConditionalDoublesCrit('miss', val);
        }
      });
      container.appendChild(missSelect);
    } else if (crit.type === 'doubles') {
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = crit.color;
      colorInput.disabled = disabled;
      colorInput.addEventListener('input', () => {
        this._state.updateDoublesCrit('color', colorInput.value);
      });
      container.appendChild(colorInput);

      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.value = crit.label;
      labelInput.disabled = disabled;
      labelInput.addEventListener('input', () => {
        this._state.updateDoublesCrit('label', labelInput.value);
      });
      container.appendChild(labelInput);
    }
  }
}
