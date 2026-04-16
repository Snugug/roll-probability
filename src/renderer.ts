import { computeProbabilities, type RollMode } from './engine';
import {
  BUILTIN_PRESETS,
  mapThresholds,
  saveCustomPreset,
  loadCustomPresets,
  type DiceConfig,
  type ThresholdCategory,
  type ThresholdPreset,
  type SavedCustomPreset,
} from './thresholds';

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
  presetName = 'PbtA';
  onConfigChange?: (config: DiceConfig, presetName: string) => void;

  private _dialog!: HTMLDialogElement;
  private _customPresets: SavedCustomPreset[] = [];

  connectedCallback() {
    const header = document.createElement('div');
    header.className = 'dice-header';

    const label = document.createElement('span');
    label.className = 'dice-label';
    label.textContent = this.config.label;
    header.appendChild(label);

    this._renderRangeItems(header);

    // Gear icon button
    const gearBtn = document.createElement('button');
    gearBtn.className = 'gear-btn';
    gearBtn.setAttribute('commandfor', 'dialog-' + this.config.label);
    gearBtn.setAttribute('command', 'show-modal');
    gearBtn.appendChild(createGearSvg());
    header.appendChild(gearBtn);

    this.appendChild(header);

    // Dialog
    this._dialog = document.createElement('dialog');
    this._dialog.id = 'dialog-' + this.config.label;
    this._buildDialogContent();
    this.appendChild(this._dialog);

    // Load custom presets async
    loadCustomPresets().then(presets => {
      this._customPresets = presets;
      this._buildDialogContent();
    }).catch(() => {
      // Ignore errors loading presets
    });

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

  private _renderRangeItems(header: HTMLElement) {
    const { thresholds, categories } = this.config;

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      let rangeText: string;
      if (i === 0) {
        rangeText = '<' + thresholds[0];
      } else if (i === categories.length - 1) {
        rangeText = thresholds[i - 1] + '+';
      } else {
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
  }

  private _isBuiltinPreset(): boolean {
    return BUILTIN_PRESETS.some(p => p.name === this.presetName);
  }

  private _buildDialogContent() {
    while (this._dialog.firstChild) {
      this._dialog.removeChild(this._dialog.firstChild);
    }

    const isBuiltin = this._isBuiltinPreset();

    // Header
    const dialogHeader = document.createElement('div');
    dialogHeader.className = 'dialog-header';

    const h3 = document.createElement('h3');
    h3.textContent = this.config.label + ' Thresholds';
    dialogHeader.appendChild(h3);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'dialog-close';
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', () => {
      this._dialog.close();
    });
    dialogHeader.appendChild(closeBtn);

    this._dialog.appendChild(dialogHeader);

    // Live preview
    const preview = document.createElement('div');
    preview.className = 'dialog-preview';
    this._renderPreviewBars(preview);
    this._dialog.appendChild(preview);

    // Preset chips
    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'preset-chips';

    for (const preset of BUILTIN_PRESETS) {
      const chip = document.createElement('button');
      chip.className = 'preset-chip';
      if (this.presetName === preset.name) {
        chip.classList.add('active');
      }
      chip.textContent = preset.name;
      chip.addEventListener('click', () => {
        this._switchToBuiltinPreset(preset);
      });
      chipsContainer.appendChild(chip);
    }

    for (const custom of this._customPresets) {
      const chip = document.createElement('button');
      chip.className = 'preset-chip';
      if (this.presetName === custom.name) {
        chip.classList.add('active');
      }
      chip.textContent = custom.name;
      chip.addEventListener('click', () => {
        this._switchToCustomPreset(custom);
      });
      chipsContainer.appendChild(chip);
    }

    const addPresetBtn = document.createElement('button');
    addPresetBtn.className = 'preset-chip preset-add';
    addPresetBtn.textContent = '+';
    addPresetBtn.addEventListener('click', () => {
      this._createCustomPreset();
    });
    chipsContainer.appendChild(addPresetBtn);

    this._dialog.appendChild(chipsContainer);

    // Preset name input
    const nameInputContainer = document.createElement('div');
    nameInputContainer.className = 'preset-name-input';
    if (isBuiltin) {
      nameInputContainer.style.display = 'none';
    }

    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Preset Name: ';
    nameInputContainer.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = this.presetName;
    nameInput.addEventListener('change', () => {
      const oldName = this.presetName;
      this.presetName = nameInput.value;
      // Update the custom preset in storage
      const custom = this._customPresets.find(p => p.name === oldName);
      if (custom) {
        custom.name = this.presetName;
        saveCustomPreset(custom).catch(() => {});
      }
      this._buildDialogContent();
    });
    nameInputContainer.appendChild(nameInput);

    this._dialog.appendChild(nameInputContainer);

    // Threshold editor
    const editor = document.createElement('div');
    editor.className = 'threshold-editor';

    const { categories, thresholds } = this.config;

    for (let i = 0; i < categories.length; i++) {
      const row = document.createElement('div');
      row.className = 'threshold-row';

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = categories[i].color;
      colorInput.disabled = isBuiltin;
      colorInput.addEventListener('input', () => {
        this.config.categories[i].color = colorInput.value;
        this._onThresholdChange();
      });
      row.appendChild(colorInput);

      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.value = categories[i].label;
      labelInput.disabled = isBuiltin;
      labelInput.addEventListener('input', () => {
        this.config.categories[i].label = labelInput.value;
        this._onThresholdChange();
      });
      row.appendChild(labelInput);

      // Floor row (index 0) has no number input and no remove button
      if (i > 0) {
        const numInput = document.createElement('input');
        numInput.type = 'number';
        numInput.value = String(thresholds[i - 1]);
        numInput.disabled = isBuiltin;
        numInput.addEventListener('input', () => {
          const val = parseInt(numInput.value, 10);
          if (!isNaN(val)) {
            this.config.thresholds[i - 1] = val;
            this._onThresholdChange();
          }
        });
        row.appendChild(numInput);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'threshold-remove';
        removeBtn.textContent = '\u00d7';
        removeBtn.disabled = isBuiltin;
        removeBtn.addEventListener('click', () => {
          this.config.categories.splice(i, 1);
          this.config.thresholds.splice(i - 1, 1);
          this._onThresholdChange();
          this._buildDialogContent();
        });
        row.appendChild(removeBtn);
      }

      editor.appendChild(row);
    }

    this._dialog.appendChild(editor);

    // Add threshold button
    const addBtn = document.createElement('button');
    addBtn.className = 'threshold-add';
    addBtn.textContent = 'Add Threshold';
    addBtn.disabled = isBuiltin;
    addBtn.addEventListener('click', () => {
      const lastThreshold = this.config.thresholds.length > 0
        ? this.config.thresholds[this.config.thresholds.length - 1]
        : 5;
      this.config.thresholds.push(lastThreshold + 5);
      this.config.categories.push({ label: 'New', color: '#888888' });
      this._onThresholdChange();
      this._buildDialogContent();
    });
    this._dialog.appendChild(addBtn);
  }

  private _renderPreviewBars(container: HTMLElement) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    for (let mod = this.minMod; mod <= this.maxMod; mod++) {
      const col = document.createElement('bar-column') as BarColumn;
      col.config = this.config;
      col.modifier = mod;
      col.showAdvantage = this.showAdvantage;
      col.showDisadvantage = this.showDisadvantage;
      container.appendChild(col);
    }
  }

  private _onThresholdChange() {
    // Update preview
    const preview = this._dialog.querySelector('.dialog-preview');
    if (preview) {
      this._renderPreviewBars(preview as HTMLElement);
    }

    // Notify parent
    if (this.onConfigChange) {
      this.onConfigChange(this.config, this.presetName);
    }
  }

  private _switchToBuiltinPreset(preset: ThresholdPreset) {
    this.presetName = preset.name;
    const mapped = mapThresholds(preset, this.config.count, this.config.sides);
    this.config.thresholds = mapped;
    this.config.categories = preset.categories.map(c => ({ ...c }));
    this._onThresholdChange();
    this._buildDialogContent();
  }

  private _switchToCustomPreset(custom: SavedCustomPreset) {
    this.presetName = custom.name;
    this.config.thresholds = [...custom.thresholds];
    this.config.categories = custom.categories.map(c => ({ ...c }));
    this._onThresholdChange();
    this._buildDialogContent();
  }

  private _createCustomPreset() {
    const id = Date.now();
    const name = 'Custom ' + id;
    const newPreset: SavedCustomPreset = {
      name,
      referenceDie: this.config.label,
      thresholds: [...this.config.thresholds],
      categories: this.config.categories.map(c => ({ ...c })),
    };

    saveCustomPreset(newPreset).then(savedId => {
      newPreset.id = savedId;
      this._customPresets.push(newPreset);
      this.presetName = name;
      this._onThresholdChange();
      this._buildDialogContent();
    }).catch(() => {
      // Still add locally even if save fails
      this._customPresets.push(newPreset);
      this.presetName = name;
      this._onThresholdChange();
      this._buildDialogContent();
    });
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
  showDisadvantage: boolean,
  onConfigChange?: (index: number, config: DiceConfig, presetName: string) => void
): void {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const row = document.createElement('dice-row') as DiceRowElement;
    row.config = config;
    row.minMod = minMod;
    row.maxMod = maxMod;
    row.showAdvantage = showAdvantage;
    row.showDisadvantage = showDisadvantage;
    if (onConfigChange) {
      const idx = i;
      row.onConfigChange = (cfg, presetName) => {
        onConfigChange(idx, cfg, presetName);
      };
    }
    container.appendChild(row);
  }
}
