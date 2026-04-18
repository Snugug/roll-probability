import { loadCustomPresets, type DiceConfig } from '../thresholds';
import { ThresholdEditorState } from '../editor-state';
import { computeViewData, type ModifierData, type DiceView } from './dice-view-data';
import { BarChartView } from './bar-chart-view';
import { BarColumn } from './bar-column';
import { DiceTableElement } from './dice-table';
import { buildDialogContent, renderCritSubInputs } from './dialog-builder';
import { createGearSvg, createTableSvg, createBarChartSvg } from './icons';

export class DiceRowElement extends HTMLElement {
  config!: DiceConfig;
  showAdvantage = true;
  showDisadvantage = true;
  onConfigChange?: (config: DiceConfig, presetName: string) => void;
  onDialogClose?: () => void;

  _dialog!: HTMLDialogElement;
  _state!: ThresholdEditorState;
  private _viewData: ModifierData[] = [];
  private _barView!: BarChartView;
  private _tableView!: DiceTableElement;
  private _activeView!: DiceView;
  private _toggleBtn!: HTMLButtonElement;

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

    // Compute view data
    this._viewData = computeViewData(this.config, this.showAdvantage, this.showDisadvantage);

    // Create both views
    this._barView = document.createElement('bar-chart-view') as BarChartView;
    this._tableView = document.createElement('dice-table') as DiceTableElement;

    // Attach the active view
    this._activeView = this.config.viewMode === 'table' ? this._tableView : this._barView;
    this._activeView.update(this._viewData, this.config, this.showAdvantage, this.showDisadvantage);
    this.appendChild(this._activeView);
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
      onToggleView: () => this._handleToggleView(),
    });
  }

  private _renderPreviewBars(previewContainer: HTMLElement) {
    previewContainer.replaceChildren();
    const previewData = computeViewData(this.config, this.showAdvantage, this.showDisadvantage);
    const barsWrapper = document.createElement('div');
    barsWrapper.className = 'bars';
    for (const modData of previewData) {
      const col = document.createElement('bar-column') as BarColumn;
      col.modifier = modData.modifier;
      col.showAdvantage = this.showAdvantage;
      col.showDisadvantage = this.showDisadvantage;
      col.critConfig = this.config.criticals;
      col.modeResults = modData.results;
      barsWrapper.appendChild(col);
    }
    previewContainer.appendChild(barsWrapper);
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

    const preview = this._dialog.querySelector('.dialog-preview') as HTMLElement | null;
    if (preview) {
      this._renderPreviewBars(preview);
    }

    // Update the active view with recomputed data
    this._viewData = computeViewData(this.config, this.showAdvantage, this.showDisadvantage);
    this._activeView.update(this._viewData, this.config, this.showAdvantage, this.showDisadvantage);
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
      this._renderPreviewBars(preview);
    }
  }

  private _swapView(): void {
    this._activeView.remove();
    this._activeView = this.config.viewMode === 'table' ? this._tableView : this._barView;
    this._activeView.update(this._viewData, this.config, this.showAdvantage, this.showDisadvantage);
    this.appendChild(this._activeView);
  }
}

