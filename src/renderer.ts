import { computeProbabilities, type RollMode, type CriticalConfig } from './engine';
import {
  BUILTIN_PRESETS,
  mapThresholds,
  mapCriticals,
  saveCustomPreset,
  deleteCustomPreset,
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
  critHitPerCategory: number[] = [];
  critMissPerCategory: number[] = [];
  critConfig: CriticalConfig = { type: 'none' };

  connectedCallback() {
    if (this.critConfig.type === 'doubles') {
      this._renderPooled();
    } else {
      this._renderSubdivided();
    }
  }

  private _renderSegment(percent: number, color: string, tooltip: string, isCrit: boolean): void {
    if (percent <= 0) return;
    const el = document.createElement('div');
    el.className = isCrit ? 'seg seg-crit' : 'seg';
    el.style.backgroundColor = color;
    el.style.flex = String(percent);
    if (percent >= 5) {
      const span = document.createElement('span');
      span.textContent = Math.round(percent) + '%';
      el.appendChild(span);
    }
    el.dataset.tooltip = tooltip + ': ' + percent.toFixed(2) + '%';
    this.appendChild(el);
  }

  private _renderSubdivided(): void {
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i];
      const critHit = this.critHitPerCategory[i] ?? 0;
      const critMiss = this.critMissPerCategory[i] ?? 0;
      const remainder = seg.percent - critHit - critMiss;
      this._renderSegment(critHit, seg.color, 'Crit Hit', true);
      this._renderSegment(remainder, seg.color, seg.label, false);
      this._renderSegment(critMiss, seg.color, 'Crit Miss', true);
    }
  }

  private _renderPooled(): void {
    const pooledTotal = this.critHitPerCategory.reduce((a, b) => a + b, 0);
    const config = this.critConfig as { type: 'doubles'; color: string; label: string };
    this._renderSegment(pooledTotal, config.color, config.label, false);
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i];
      const critAmount = this.critHitPerCategory[i] ?? 0;
      const remainder = seg.percent - critAmount;
      this._renderSegment(remainder, seg.color, seg.label, false);
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

class DiceRowElement extends HTMLElement {
  config!: DiceConfig;
  showAdvantage = true;
  showDisadvantage = true;
  presetName = 'PbtA';
  onConfigChange?: (config: DiceConfig, presetName: string) => void;
  onDialogClose?: () => void;

  private _dialog!: HTMLDialogElement;
  private _floorLabel: HTMLSpanElement | null = null;
  private _critSubInputs: HTMLElement | null = null;
  private _customPresets: SavedCustomPreset[] = [];

  connectedCallback() {
    if (this.config.presetName) {
      this.presetName = this.config.presetName;
    }

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
    this._dialog.addEventListener('close', () => {
      if (this.onDialogClose) this.onDialogClose();
    });
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
    const { thresholds, categories } = this.config;

    const rangeWrapper = document.createElement('div');
    rangeWrapper.className = 'dice-ranges';

    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i];
      let rangeText: string;
      if (i === 0) {
        rangeText = '≤' + (thresholds[0] - 1);
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



      rangeWrapper.appendChild(rangeEl);
    }

    // Crit swatches
    const crit = this.config.criticals;
    if (crit.type === 'natural' || crit.type === 'conditional-doubles') {
      const hitEl = document.createElement('span');
      hitEl.className = 'dice-range-item';
      const hitSwatch = document.createElement('span');
      hitSwatch.className = 'range-swatch range-swatch-crit';
      hitEl.appendChild(hitSwatch);
      const hitText = document.createElement('span');
      hitText.textContent = 'Crit Hit';
      hitEl.appendChild(hitText);
      rangeWrapper.appendChild(hitEl);

      const missEl = document.createElement('span');
      missEl.className = 'dice-range-item';
      const missSwatch = document.createElement('span');
      missSwatch.className = 'range-swatch range-swatch-crit';
      missEl.appendChild(missSwatch);
      const missText = document.createElement('span');
      missText.textContent = 'Crit Miss';
      missEl.appendChild(missText);
      rangeWrapper.appendChild(missEl);
    } else if (crit.type === 'doubles') {
      const doublesEl = document.createElement('span');
      doublesEl.className = 'dice-range-item';
      const doublesSwatch = document.createElement('span');
      doublesSwatch.className = 'range-swatch';
      doublesSwatch.style.backgroundColor = crit.color;
      doublesEl.appendChild(doublesSwatch);
      const doublesText = document.createElement('span');
      doublesText.textContent = crit.label;
      doublesEl.appendChild(doublesText);
      rangeWrapper.appendChild(doublesEl);
    }

    header.appendChild(rangeWrapper);
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
      const chipWrapper = document.createElement('div');
      chipWrapper.className = 'preset-chip-custom';
      if (this.presetName === custom.name) {
        chipWrapper.classList.add('active');
      }

      const selectBtn = document.createElement('button');
      selectBtn.className = 'preset-chip-select';
      selectBtn.textContent = custom.name;
      selectBtn.setAttribute('aria-label', 'Select preset ' + custom.name);
      selectBtn.addEventListener('click', () => {
        this._switchToCustomPreset(custom);
      });
      chipWrapper.appendChild(selectBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'preset-chip-delete';
      deleteBtn.textContent = '\u00d7';
      deleteBtn.setAttribute('aria-label', 'Delete preset ' + custom.name);
      deleteBtn.addEventListener('click', () => {
        if (custom.id != null) {
          deleteCustomPreset(custom.id).catch(() => {});
        }
        this._customPresets = this._customPresets.filter(p => p !== custom);
        if (this.presetName === custom.name) {
          this._switchToBuiltinPreset(BUILTIN_PRESETS[0]);
        } else {
          this._buildDialogContent();
        }
      });
      chipWrapper.appendChild(deleteBtn);

      chipsContainer.appendChild(chipWrapper);
    }

    const addPresetBtn = document.createElement('button');
    addPresetBtn.className = 'preset-chip preset-add';
    addPresetBtn.textContent = '+';
    addPresetBtn.addEventListener('click', () => {
      this._createCustomPreset();
    });
    chipsContainer.appendChild(addPresetBtn);

    this._dialog.appendChild(chipsContainer);

    // Editor wrapper — contains name input, modifiers, thresholds, add button
    const editorWrapper = document.createElement('div');
    editorWrapper.className = 'dialog-editor-wrapper';

    // Preset name input
    const nameInputContainer = document.createElement('div');
    nameInputContainer.className = 'preset-name-input';
    if (isBuiltin) {
      nameInputContainer.style.display = 'none';
    }

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = this.presetName;

    // Find the active custom chip's select button to update its text live
    const activeChipLabel = chipsContainer.querySelector('.preset-chip-custom.active .preset-chip-select') as HTMLElement | null;

    nameInput.addEventListener('input', () => {
      const oldName = this.presetName;
      this.presetName = nameInput.value;
      // Live-update the chip label
      if (activeChipLabel) {
        activeChipLabel.textContent = this.presetName;
      }
      // Update the custom preset in storage
      const custom = this._customPresets.find(p => p.name === oldName);
      if (custom) {
        custom.name = this.presetName;
        saveCustomPreset(custom).catch(() => {});
      }
      this._onThresholdChange();
    });
    nameInputContainer.appendChild(nameInput);

    editorWrapper.appendChild(nameInputContainer);

    // Modifier range inputs
    const modContainer = document.createElement('div');
    modContainer.className = 'dialog-mod-inputs';

    const modLabel = document.createElement('span');
    modLabel.textContent = 'Modifiers:';
    modContainer.appendChild(modLabel);

    const minModInput = document.createElement('input');
    minModInput.type = 'number';
    minModInput.value = String(this.config.minMod);
    minModInput.setAttribute('aria-label', 'Min modifier');
    minModInput.addEventListener('change', () => {
      const val = parseInt(minModInput.value, 10);
      if (isNaN(val)) return;
      this.config.minMod = val;
      if (this.config.minMod > this.config.maxMod) {
        this.config.maxMod = this.config.minMod;
        maxModInput.value = String(this.config.maxMod);
      }
      this._onThresholdChange();
    });
    modContainer.appendChild(minModInput);

    const dash = document.createElement('span');
    dash.textContent = '\u2013';
    modContainer.appendChild(dash);

    const maxModInput = document.createElement('input');
    maxModInput.type = 'number';
    maxModInput.value = String(this.config.maxMod);
    maxModInput.setAttribute('aria-label', 'Max modifier');
    maxModInput.addEventListener('change', () => {
      const val = parseInt(maxModInput.value, 10);
      if (isNaN(val)) return;
      this.config.maxMod = val;
      if (this.config.maxMod < this.config.minMod) {
        this.config.minMod = this.config.maxMod;
        minModInput.value = String(this.config.minMod);
      }
      this._onThresholdChange();
    });
    modContainer.appendChild(maxModInput);

    editorWrapper.appendChild(modContainer);

    // Criticals editor
    const critContainer = document.createElement('div');
    critContainer.className = 'dialog-crit-inputs';

    const critLabel = document.createElement('span');
    critLabel.textContent = 'Criticals:';
    critContainer.appendChild(critLabel);

    const critSelect = document.createElement('select');
    critSelect.className = 'crit-type-select';
    critSelect.disabled = isBuiltin;

    const critOptions: Array<{ value: string; text: string }> = [
      { value: 'none', text: 'None' },
      { value: 'natural', text: 'Natural Roll' },
      { value: 'conditional-doubles', text: 'Conditional Doubles' },
      { value: 'doubles', text: 'Doubles' },
    ];
    for (const opt of critOptions) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.text;
      if (opt.value === this.config.criticals.type) {
        option.selected = true;
      }
      critSelect.appendChild(option);
    }

    this._critSubInputs = document.createElement('div');
    this._critSubInputs.className = 'crit-sub-inputs';

    critSelect.addEventListener('change', () => {
      const type = critSelect.value;
      if (type === 'none') {
        this.config.criticals = { type: 'none' };
      } else if (type === 'natural') {
        this.config.criticals = { type: 'natural', hit: this.config.count * this.config.sides, miss: this.config.count };
      } else if (type === 'conditional-doubles') {
        this.config.criticals = { type: 'conditional-doubles', hit: this.config.categories.length - 1, miss: 0 };
      } else if (type === 'doubles') {
        this.config.criticals = { type: 'doubles', color: '#ffaa00', label: 'Critical' };
      }
      this._renderCritSubInputs(this._critSubInputs!, isBuiltin);
      this._onThresholdChange();
    });

    critContainer.appendChild(critSelect);
    this._renderCritSubInputs(this._critSubInputs, isBuiltin);
    critContainer.appendChild(this._critSubInputs);

    editorWrapper.appendChild(critContainer);

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

      if (i === 0) {
        // Floor row: show computed upper bound label, no remove button
        const floorLabel = document.createElement('span');
        floorLabel.className = 'threshold-floor-label';
        floorLabel.textContent = '\u2264' + (thresholds.length > 0 ? thresholds[0] - 1 : '?');
        this._floorLabel = floorLabel;
        row.appendChild(floorLabel);
      } else {
        const numInput = document.createElement('input');
        numInput.type = 'number';
        numInput.value = String(thresholds[i - 1]);
        numInput.disabled = isBuiltin;
        // Min is one more than the previous threshold (or no min for the first)
        if (i > 1) {
          numInput.min = String(thresholds[i - 2] + 1);
        }
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

    editorWrapper.appendChild(editor);

    // Add threshold button
    const addBtn = document.createElement('button');
    addBtn.className = 'threshold-add';
    addBtn.textContent = '+ Add Threshold';
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
    editorWrapper.appendChild(addBtn);

    this._dialog.appendChild(editorWrapper);
  }

  private _renderPreviewBars(container: HTMLElement) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

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

  private _onThresholdChange() {
    // Keep config.presetName in sync with this.presetName
    this.config.presetName = this.presetName;

    // Update floor label to reflect current lowest threshold
    if (this._floorLabel && this.config.thresholds.length > 0) {
      this._floorLabel.textContent = '\u2264' + (this.config.thresholds[0] - 1);
    }

    // Refresh crit sub-inputs so conditional-doubles dropdowns reflect current categories
    if (this._critSubInputs) {
      const isBuiltin = this._isBuiltinPreset();
      this._renderCritSubInputs(this._critSubInputs, isBuiltin);
    }

    // Update the in-memory custom preset so switching away and back preserves changes
    if (!this._isBuiltinPreset()) {
      const custom = this._customPresets.find(p => p.name === this.presetName);
      if (custom) {
        custom.thresholds = [...this.config.thresholds];
        custom.categories = this.config.categories.map(c => ({ ...c }));
        custom.criticals = this.config.criticals;
        saveCustomPreset(custom).catch(() => {});
      }
    }

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

  private _renderCritSubInputs(container: HTMLElement, disabled: boolean) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

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
        if (!isNaN(val) && this.config.criticals.type === 'natural') {
          this.config.criticals.hit = val;
          this._onThresholdChange();
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
        if (!isNaN(val) && this.config.criticals.type === 'natural') {
          this.config.criticals.miss = val;
          this._onThresholdChange();
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
        if (!isNaN(val) && this.config.criticals.type === 'conditional-doubles') {
          this.config.criticals.hit = val;
          this._onThresholdChange();
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
        if (!isNaN(val) && this.config.criticals.type === 'conditional-doubles') {
          this.config.criticals.miss = val;
          this._onThresholdChange();
        }
      });
      container.appendChild(missSelect);
    } else if (crit.type === 'doubles') {
      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = crit.color;
      colorInput.disabled = disabled;
      colorInput.addEventListener('input', () => {
        if (this.config.criticals.type === 'doubles') {
          this.config.criticals.color = colorInput.value;
          this._onThresholdChange();
        }
      });
      container.appendChild(colorInput);

      const labelInput = document.createElement('input');
      labelInput.type = 'text';
      labelInput.value = crit.label;
      labelInput.disabled = disabled;
      labelInput.addEventListener('input', () => {
        if (this.config.criticals.type === 'doubles') {
          this.config.criticals.label = labelInput.value;
          this._onThresholdChange();
        }
      });
      container.appendChild(labelInput);
    }
    // 'none' type: container stays empty
  }

  private _switchToBuiltinPreset(preset: ThresholdPreset) {
    this.presetName = preset.name;
    const mapped = mapThresholds(preset, this.config.count, this.config.sides);
    this.config.thresholds = mapped;
    this.config.categories = preset.categories.map(c => ({ ...c }));
    this.config.criticals = mapCriticals(preset, this.config.count, this.config.sides);
    this._onThresholdChange();
    this._buildDialogContent();
  }

  private _switchToCustomPreset(custom: SavedCustomPreset) {
    this.presetName = custom.name;
    this.config.thresholds = [...custom.thresholds];
    this.config.categories = custom.categories.map(c => ({ ...c }));
    this.config.criticals = custom.criticals ?? { type: 'none' };
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
      criticals: this.config.criticals,
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
  showAdvantage: boolean,
  showDisadvantage: boolean,
  onConfigChange?: (index: number, config: DiceConfig, presetName: string) => void,
  onDialogClose?: () => void
): void {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

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
