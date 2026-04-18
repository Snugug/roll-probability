import { BUILTIN_PRESETS, type DiceConfig } from '../thresholds';
import type { ThresholdEditorState } from '../editor-state';

export interface DialogContext {
  dialog: HTMLDialogElement;
  config: DiceConfig;
  state: ThresholdEditorState;
  renderPreviewBars: (container: HTMLElement) => void;
  renderCritSubInputs: (container: HTMLElement, disabled: boolean) => void;
}

export function buildDialogContent(ctx: DialogContext): void {
  ctx.dialog.replaceChildren();

  const isBuiltin = ctx.state.isBuiltin;

  const dialogHeader = document.createElement('div');
  dialogHeader.className = 'dialog-header';

  const h3 = document.createElement('h3');
  h3.textContent = ctx.config.label + ' Thresholds';
  dialogHeader.appendChild(h3);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'dialog-close';
  closeBtn.textContent = '\u00d7';
  closeBtn.addEventListener('click', () => {
    ctx.dialog.close();
  });
  dialogHeader.appendChild(closeBtn);

  ctx.dialog.appendChild(dialogHeader);

  // Preview
  const preview = document.createElement('div');
  preview.className = 'dialog-preview';
  ctx.renderPreviewBars(preview);
  ctx.dialog.appendChild(preview);

  // Preset chips
  const chipsContainer = document.createElement('div');
  chipsContainer.className = 'preset-chips';

  for (const preset of BUILTIN_PRESETS) {
    const chip = document.createElement('button');
    chip.className = 'preset-chip';
    if (ctx.state.presetName === preset.name) {
      chip.classList.add('active');
    }
    chip.textContent = preset.name;
    chip.addEventListener('click', () => {
      ctx.state.switchToBuiltinPreset(preset);
    });
    chipsContainer.appendChild(chip);
  }

  for (const custom of ctx.state.customPresets) {
    const chipWrapper = document.createElement('div');
    chipWrapper.className = 'preset-chip-custom';
    if (ctx.state.presetName === custom.name) {
      chipWrapper.classList.add('active');
    }

    const selectBtn = document.createElement('button');
    selectBtn.className = 'preset-chip-select';
    selectBtn.textContent = custom.name;
    selectBtn.setAttribute('aria-label', 'Select preset ' + custom.name);
    selectBtn.addEventListener('click', () => {
      ctx.state.switchToCustomPreset(custom);
    });
    chipWrapper.appendChild(selectBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'preset-chip-delete';
    deleteBtn.textContent = '\u00d7';
    deleteBtn.setAttribute('aria-label', 'Delete preset ' + custom.name);
    deleteBtn.addEventListener('click', () => {
      ctx.state.deleteCustomPreset(custom);
    });
    chipWrapper.appendChild(deleteBtn);

    chipsContainer.appendChild(chipWrapper);
  }

  const addPresetBtn = document.createElement('button');
  addPresetBtn.className = 'preset-chip preset-add';
  addPresetBtn.textContent = '+';
  addPresetBtn.addEventListener('click', () => {
    ctx.state.createCustomPreset();
  });
  chipsContainer.appendChild(addPresetBtn);

  ctx.dialog.appendChild(chipsContainer);

  // Editor
  const editorWrapper = document.createElement('div');
  editorWrapper.className = 'dialog-editor-wrapper';

  // Preset name
  const nameInputContainer = document.createElement('div');
  nameInputContainer.className = 'preset-name-input';
  if (isBuiltin) {
    nameInputContainer.style.display = 'none';
  }

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = ctx.state.presetName;

  const activeChipLabel = chipsContainer.querySelector('.preset-chip-custom.active .preset-chip-select') as HTMLElement | null;

  nameInput.addEventListener('input', () => {
    if (activeChipLabel) {
      activeChipLabel.textContent = nameInput.value;
    }
    ctx.state.renamePreset(nameInput.value);
  });
  nameInputContainer.appendChild(nameInput);

  editorWrapper.appendChild(nameInputContainer);

  // Modifiers
  const modContainer = document.createElement('div');
  modContainer.className = 'dialog-mod-inputs';

  const modLabel = document.createElement('span');
  modLabel.textContent = 'Modifiers:';
  modContainer.appendChild(modLabel);

  const minModInput = document.createElement('input');
  minModInput.type = 'number';
  minModInput.value = String(ctx.config.minMod);
  minModInput.setAttribute('aria-label', 'Min modifier');
  minModInput.addEventListener('change', () => {
    const val = parseInt(minModInput.value, 10);
    if (isNaN(val)) return;
    ctx.state.updateMinMod(val);
    maxModInput.value = String(ctx.config.maxMod);
  });
  modContainer.appendChild(minModInput);

  const dash = document.createElement('span');
  dash.textContent = '\u2013';
  modContainer.appendChild(dash);

  const maxModInput = document.createElement('input');
  maxModInput.type = 'number';
  maxModInput.value = String(ctx.config.maxMod);
  maxModInput.setAttribute('aria-label', 'Max modifier');
  maxModInput.addEventListener('change', () => {
    const val = parseInt(maxModInput.value, 10);
    if (isNaN(val)) return;
    ctx.state.updateMaxMod(val);
    minModInput.value = String(ctx.config.minMod);
  });
  modContainer.appendChild(maxModInput);

  editorWrapper.appendChild(modContainer);

  // Criticals
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
    if (opt.value === ctx.config.criticals.type) {
      option.selected = true;
    }
    critSelect.appendChild(option);
  }

  const critSubInputs = document.createElement('div');
  critSubInputs.className = 'crit-sub-inputs';

  critSelect.addEventListener('change', () => {
    ctx.state.setCritType(critSelect.value);
  });

  critContainer.appendChild(critSelect);
  ctx.renderCritSubInputs(critSubInputs, isBuiltin);
  critContainer.appendChild(critSubInputs);

  editorWrapper.appendChild(critContainer);

  // Thresholds
  const editor = document.createElement('div');
  editor.className = 'threshold-editor';

  const { categories, thresholds } = ctx.config;

  for (let i = 0; i < categories.length; i++) {
    const row = document.createElement('div');
    row.className = 'threshold-row';

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = categories[i].color;
    colorInput.disabled = isBuiltin;
    colorInput.addEventListener('input', () => {
      ctx.state.updateCategory(i, 'color', colorInput.value);
    });
    row.appendChild(colorInput);

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.value = categories[i].label;
    labelInput.disabled = isBuiltin;
    labelInput.addEventListener('input', () => {
      ctx.state.updateCategory(i, 'label', labelInput.value);
    });
    row.appendChild(labelInput);

    if (i === 0) {
      const floorLabel = document.createElement('span');
      floorLabel.className = 'threshold-floor-label';
      floorLabel.textContent = '\u2264' + (thresholds.length > 0 ? thresholds[0] - 1 : '?');
      row.appendChild(floorLabel);
    } else {
      const numInput = document.createElement('input');
      numInput.type = 'number';
      numInput.value = String(thresholds[i - 1]);
      numInput.disabled = isBuiltin;
      if (i > 1) {
        numInput.min = String(thresholds[i - 2] + 1);
      }
      numInput.addEventListener('input', () => {
        const val = parseInt(numInput.value, 10);
        if (!isNaN(val)) {
          ctx.state.updateThreshold(i - 1, val);
        }
      });
      row.appendChild(numInput);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'threshold-remove';
      removeBtn.textContent = '\u00d7';
      removeBtn.disabled = isBuiltin;
      removeBtn.addEventListener('click', () => {
        ctx.state.removeThreshold(i);
      });
      row.appendChild(removeBtn);
    }

    editor.appendChild(row);
  }

  editorWrapper.appendChild(editor);

  const addBtn = document.createElement('button');
  addBtn.className = 'threshold-add';
  addBtn.textContent = '+ Add Threshold';
  addBtn.disabled = isBuiltin;
  addBtn.addEventListener('click', () => {
    ctx.state.addThreshold();
  });
  editorWrapper.appendChild(addBtn);

  ctx.dialog.appendChild(editorWrapper);
}
