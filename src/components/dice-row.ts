import { loadCustomPresets, type DiceConfig } from '../thresholds';
import { ThresholdEditorState } from '../editor-state';
import { computeViewData, buildColumnDescriptors, type ModifierData, type DiceView } from './dice-view-data';
import { BarChartView } from './bar-chart-view';
import { DiceTableElement } from './dice-table';
import { buildDialogContent, renderCritSubInputs } from './dialog-builder';
import { createGearSvg, createTableSvg, createBarChartSvg } from './icons';

export function computeInsertIndex(
  fromIdx: number,
  toIdx: number,
  position: 'before' | 'after'
): number {
  if (fromIdx === toIdx) return fromIdx;
  const adjusted = toIdx > fromIdx ? toIdx - 1 : toIdx;
  return position === 'before' ? adjusted : adjusted + 1;
}

export interface DiceReorderDetail {
  fromId: number;
  toId: number;
  position: 'before' | 'after';
}

let draggedRow: DiceRowElement | null = null;

export class DiceRowElement extends HTMLElement {
  config!: DiceConfig;
  showAdvantage = true;
  showDisadvantage = true;
  onConfigChange?: (config: DiceConfig, presetName: string) => void;
  onDialogClose?: () => void | Promise<void>;
  onDelete?: () => void;

  _dialog!: HTMLDialogElement;
  _state!: ThresholdEditorState;
  private _viewData: ModifierData[] = [];
  private _barView!: BarChartView;
  private _tableView!: DiceTableElement;
  private _activeView!: DiceView;
  private _toggleBtn!: HTMLButtonElement;

  private get _effectiveShowAdvantage(): boolean {
    return this.showAdvantage && this.config.advantageMethod !== 'none';
  }

  private get _effectiveShowDisadvantage(): boolean {
    return this.showDisadvantage && this.config.disadvantageMethod !== 'none';
  }

  connectedCallback() {
    this.dataset.id = String(this.config.id);
    this.draggable = true;
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

    const nameInput = this._createNameInput();
    header.appendChild(nameInput);

    this._renderRangeItems(header);

    // Toggle view button
    this._toggleBtn = document.createElement('button');
    this._toggleBtn.className = 'view-toggle-btn';
    this._toggleBtn.appendChild(
      this.config.viewMode === 'table' ? createBarChartSvg() : createTableSvg()
    );
    this._toggleBtn.addEventListener('click', () => {
      this._handleToggleView();
    });
    header.appendChild(this._toggleBtn);

    const gearBtn = document.createElement('button');
    gearBtn.className = 'gear-btn';
    gearBtn.setAttribute('commandfor', 'dialog-' + this.config.id);
    gearBtn.setAttribute('command', 'show-modal');
    gearBtn.appendChild(createGearSvg());
    header.appendChild(gearBtn);

    this.appendChild(header);

    let dragEnterCounter = 0;

    this.addEventListener('dragstart', (e) => {
      draggedRow = this;
      this.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(this.config.id));
      }
    });

    this.addEventListener('dragend', () => {
      this.classList.remove('dragging');
      draggedRow = null;
      this.parentElement?.querySelectorAll('dice-row.drop-before, dice-row.drop-after')
        .forEach(el => el.classList.remove('drop-before', 'drop-after'));
    });

    this.addEventListener('dragenter', (e) => {
      if (!draggedRow || draggedRow === this) return;
      e.preventDefault();
      dragEnterCounter++;
    });

    this.addEventListener('dragleave', () => {
      if (!draggedRow || draggedRow === this) return;
      dragEnterCounter--;
      if (dragEnterCounter <= 0) {
        dragEnterCounter = 0;
        this.classList.remove('drop-before', 'drop-after');
      }
    });

    this.addEventListener('dragover', (e) => {
      if (!draggedRow || draggedRow === this) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      const rect = this.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      this.classList.toggle('drop-before', before);
      this.classList.toggle('drop-after', !before);
    });

    this.addEventListener('drop', (e) => {
      if (!draggedRow || draggedRow === this) return;
      e.preventDefault();
      const rect = this.getBoundingClientRect();
      const position: 'before' | 'after' = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      const fromId = draggedRow.config.id;
      const toId = this.config.id;
      this.classList.remove('drop-before', 'drop-after');
      dragEnterCounter = 0;
      this.dispatchEvent(new CustomEvent('dice-reorder', {
        detail: { fromId, toId, position },
        bubbles: true,
      }));
    });

    this._dialog = document.createElement('dialog');
    this._dialog.id = 'dialog-' + this.config.id;
    this._dialog.addEventListener('close', () => {
      if (this.onDialogClose) Promise.resolve(this.onDialogClose()).catch(() => {});
    });
    this._buildDialogContent();
    this.appendChild(this._dialog);

    loadCustomPresets().then(presets => {
      if (presets.length > 0) {
        this._state.customPresets = presets;
        this._buildDialogContent();
      }
    }).catch(() => {});

    // Compute view data
    this._viewData = computeViewData(this.config, this.showAdvantage, this.showDisadvantage);

    // Create both views
    this._barView = document.createElement('bar-chart-view') as BarChartView;
    this._tableView = document.createElement('dice-table') as DiceTableElement;

    // Attach the active view
    this._activeView = this.config.viewMode === 'table' ? this._tableView : this._barView;
    this._activeView.update(this._viewData, this.config, this._effectiveShowAdvantage, this._effectiveShowDisadvantage);
    this.appendChild(this._activeView);
  }

  private _renderRangeItems(header: HTMLElement) {
    const rangeWrapper = document.createElement('div');
    rangeWrapper.className = 'dice-ranges';

    for (const col of buildColumnDescriptors(this.config)) {
      rangeWrapper.appendChild(this._makeRangeItem(col.label, col.color, col.swatchClass));
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

  _createNameInput(): HTMLInputElement {
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'dice-name-input';
    nameInput.value = this.config.name;

    let lastCommittedName = this.config.name;

    nameInput.addEventListener('focus', () => {
      nameInput.select();
    });

    nameInput.addEventListener('blur', () => {
      const val = nameInput.value.trim();
      if (!val) {
        nameInput.value = lastCommittedName;
      } else {
        this.config.name = val;
        lastCommittedName = val;
        if (this.onConfigChange) {
          this.onConfigChange(this.config, this._state.presetName);
        }
      }
    });

    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        nameInput.blur();
      } else if (e.key === 'Escape') {
        nameInput.value = lastCommittedName;
        nameInput.blur();
      }
    });

    nameInput.addEventListener('mousedown', () => {
      this.draggable = false;
      document.addEventListener('mouseup', () => {
        this.draggable = true;
      }, { once: true });
    });

    return nameInput;
  }

  _buildDialogContent() {
    buildDialogContent({
      dialog: this._dialog,
      config: this.config,
      state: this._state,
      renderPreview: (container) => this._renderPreview(container),
      onToggleView: () => this._handleToggleView(),
      onDelete: this.onDelete,
      createNameInput: () => this._createNameInput(),
    });
  }

  private _renderPreview(previewContainer: HTMLElement, data?: ModifierData[]) {
    previewContainer.replaceChildren();
    const previewData = data ?? computeViewData(this.config, this.showAdvantage, this.showDisadvantage);
    if (this.config.viewMode === 'table') {
      const tableView = document.createElement('dice-table') as DiceTableElement;
      tableView.update(previewData, this.config, this._effectiveShowAdvantage, this._effectiveShowDisadvantage);
      previewContainer.appendChild(tableView);
    } else {
      const barView = document.createElement('bar-chart-view') as BarChartView;
      barView.update(previewData, this.config, this._effectiveShowAdvantage, this._effectiveShowDisadvantage);
      previewContainer.appendChild(barView);
    }
  }

  private _updateDialogValues(): void {
    const floorLabel = this._dialog.querySelector('.threshold-floor-label') as HTMLSpanElement | null;
    if (floorLabel && this.config.thresholds.length > 0) {
      floorLabel.textContent = '\u2264' + (this.config.thresholds[0] - 1);
    }

    const critContainer = this._dialog.querySelector('.crit-sub-inputs') as HTMLElement | null;
    if (critContainer) {
      renderCritSubInputs(critContainer, this.config, this._state, this._state.isBuiltin);
    }

    this._viewData = computeViewData(this.config, this.showAdvantage, this.showDisadvantage);

    const preview = this._dialog.querySelector('.dialog-preview') as HTMLElement | null;
    if (preview) {
      this._renderPreview(preview, this._viewData);
    }

    this._activeView.update(this._viewData, this.config, this._effectiveShowAdvantage, this._effectiveShowDisadvantage);
  }

  private _handleToggleView(): void {
    const isTable = this.config.viewMode === 'table';
    this.config.viewMode = isTable ? 'bar' : 'table';
    this._toggleBtn.replaceChildren(
      this.config.viewMode === 'table' ? createBarChartSvg() : createTableSvg()
    );
    this._swapView();
    if (this.onConfigChange) {
      this.onConfigChange(this.config, this._state.presetName);
    }
    const preview = this._dialog.querySelector('.dialog-preview') as HTMLElement | null;
    if (preview) {
      this._renderPreview(preview);
    }
  }

  private _swapView(): void {
    this._activeView.remove();
    this._activeView = this.config.viewMode === 'table' ? this._tableView : this._barView;
    this._activeView.update(this._viewData, this.config, this._effectiveShowAdvantage, this._effectiveShowDisadvantage);
    this.appendChild(this._activeView);
  }
}

