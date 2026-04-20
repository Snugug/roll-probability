import { BUILTIN_PRESETS, type DiceConfig, type AdvantageMethod, type DisadvantageMethod } from '../thresholds';
import type { ThresholdEditorState } from '../editor-state';
import { renderCritSubInputs } from './crit-sub-inputs';
import { createTableSvg, createBarChartSvg, createCloseSvg, createDeleteSvg } from './icons';

export { renderCritSubInputs } from './crit-sub-inputs';

export interface DialogContext {
  dialog: HTMLDialogElement;
  config: DiceConfig;
  state: ThresholdEditorState;
  renderPreview: (container: HTMLElement) => void;
  onToggleView: () => void;
  onDelete?: () => void;
  createNameInput: () => HTMLInputElement;
}

function buildLabeledSelect(
  containerClass: string,
  labelText: string,
  selectClass: string,
  options: Array<{ value: string; text: string }>,
  currentValue: string,
  disabled: boolean,
  onChange: (value: string) => void,
): HTMLElement {
  const container = document.createElement('div');
  container.className = containerClass;

  const label = document.createElement('span');
  label.textContent = labelText;
  container.appendChild(label);

  const select = document.createElement('select');
  select.className = selectClass;
  select.disabled = disabled;

  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt.value;
    option.textContent = opt.text;
    if (opt.value === currentValue) option.selected = true;
    select.appendChild(option);
  }

  select.addEventListener('change', () => { onChange(select.value); });
  container.appendChild(select);
  return container;
}

export function buildDialogContent(ctx: DialogContext): void {
  ctx.dialog.replaceChildren();

  const isBuiltin = ctx.state.isBuiltin;

  const dialogHeader = document.createElement('div');
  dialogHeader.className = 'dialog-header';

  const titleWrapper = document.createElement('div');
  titleWrapper.className = 'dialog-title';

  const nameInput = ctx.createNameInput();
  titleWrapper.appendChild(nameInput);

  const titleText = document.createElement('span');
  titleText.textContent = 'Thresholds';
  titleWrapper.appendChild(titleText);

  const badge = document.createElement('span');
  badge.className = 'dice-notation-badge';
  badge.textContent = ctx.config.label;
  titleWrapper.appendChild(badge);

  dialogHeader.appendChild(titleWrapper);

  const viewToggleBtn = document.createElement('button');
  viewToggleBtn.className = 'view-toggle-btn';
  viewToggleBtn.appendChild(
    ctx.config.viewMode === 'table' ? createBarChartSvg() : createTableSvg()
  );
  viewToggleBtn.addEventListener('click', () => {
    ctx.onToggleView();
    viewToggleBtn.replaceChildren(
      ctx.config.viewMode === 'table' ? createBarChartSvg() : createTableSvg()
    );
  });
  dialogHeader.appendChild(viewToggleBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'dialog-delete';
  deleteBtn.appendChild(createDeleteSvg());
  deleteBtn.addEventListener('click', () => {
    ctx.dialog.close();
    if (ctx.onDelete) ctx.onDelete();
  });
  dialogHeader.appendChild(deleteBtn);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'dialog-close';
  closeBtn.setAttribute('autofocus', '');
  closeBtn.appendChild(createCloseSvg());
  closeBtn.addEventListener('click', () => {
    ctx.dialog.close();
  });
  dialogHeader.appendChild(closeBtn);

  ctx.dialog.appendChild(dialogHeader);

  const preview = document.createElement('div');
  preview.className = 'dialog-preview';
  ctx.renderPreview(preview);
  ctx.dialog.appendChild(preview);

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

  const editorWrapper = document.createElement('div');
  editorWrapper.className = 'dialog-editor-wrapper';

  const nameInputContainer = document.createElement('div');
  nameInputContainer.className = 'preset-name-input';
  if (isBuiltin) {
    nameInputContainer.style.display = 'none';
  }

  const presetNameInput = document.createElement('input');
  presetNameInput.type = 'text';
  presetNameInput.value = ctx.state.presetName;

  const activeChipLabel = chipsContainer.querySelector('.preset-chip-custom.active .preset-chip-select') as HTMLElement | null;

  presetNameInput.addEventListener('input', () => {
    if (activeChipLabel) {
      activeChipLabel.textContent = presetNameInput.value;
    }
    ctx.state.renamePreset(presetNameInput.value);
  });
  nameInputContainer.appendChild(presetNameInput);

  editorWrapper.appendChild(nameInputContainer);

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

  editorWrapper.appendChild(buildLabeledSelect(
    'dialog-adv-method', 'Advantage:', 'adv-method-select',
    [{ value: 'none', text: 'None' }, { value: 'plus-one-drop-low', text: '+1 Die, Drop Low' }, { value: 'double-dice', text: 'Double Dice' }],
    ctx.config.advantageMethod, isBuiltin,
    (value) => { ctx.state.setAdvantageMethod(value as AdvantageMethod); },
  ));

  editorWrapper.appendChild(buildLabeledSelect(
    'dialog-dis-method', 'Disadvantage:', 'dis-method-select',
    [{ value: 'none', text: 'None' }, { value: 'plus-one-drop-high', text: '+1 Die, Drop High' }],
    ctx.config.disadvantageMethod, isBuiltin,
    (value) => { ctx.state.setDisadvantageMethod(value as DisadvantageMethod); },
  ));

  const critContainer = buildLabeledSelect(
    'dialog-crit-inputs', 'Criticals:', 'crit-type-select',
    [
      { value: 'none', text: 'None' },
      { value: 'natural', text: 'Natural Roll' },
      { value: 'conditional-doubles', text: 'Conditional Doubles' },
      { value: 'doubles', text: 'Doubles' },
    ],
    ctx.config.criticals.type, isBuiltin,
    (value) => { ctx.state.setCritType(value); },
  );
  const critSubInputs = document.createElement('div');
  critSubInputs.className = 'crit-sub-inputs';
  renderCritSubInputs(critSubInputs, ctx.config, ctx.state, isBuiltin);
  critContainer.appendChild(critSubInputs);
  editorWrapper.appendChild(critContainer);

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

