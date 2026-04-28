import {
  BUILTIN_PRESETS,
  mapThresholds,
  mapCriticals,
  saveCustomPreset,
  deleteCustomPreset,
  type DiceConfig,
  type ThresholdPreset,
  type SavedCustomPreset,
  type AdvantageMethod,
  type DisadvantageMethod,
} from './thresholds';

export type EditorChangeKind = 'value' | 'structure';

export class ThresholdEditorState {
  config: DiceConfig;
  customPresets: SavedCustomPreset[] = [];
  private _onChange: (kind: EditorChangeKind) => void;

  constructor(config: DiceConfig, onChange: (kind: EditorChangeKind) => void) {
    this.config = config;
    this._onChange = onChange;
  }

  get presetName(): string {
    return this.config.presetName ?? BUILTIN_PRESETS[0].name;
  }

  set presetName(name: string) {
    this.config.presetName = name;
  }

  get isBuiltin(): boolean {
    return BUILTIN_PRESETS.some(p => p.name === this.presetName);
  }

  switchToBuiltinPreset(preset: ThresholdPreset): void {
    this.presetName = preset.name;
    this.config.thresholds = mapThresholds(preset, this.config.terms);
    this.config.categories = preset.categories.map(c => ({ ...c }));
    this.config.criticals = mapCriticals(preset, this.config.terms);
    this.config.advantageMethod = preset.advantageMethod;
    this.config.disadvantageMethod = preset.disadvantageMethod;
    this._onChange('structure');
  }

  switchToCustomPreset(custom: SavedCustomPreset): void {
    this.presetName = custom.name;
    this.config.thresholds = [...custom.thresholds];
    this.config.categories = custom.categories.map(c => ({ ...c }));
    this.config.criticals = custom.criticals ?? { type: 'none' };
    this.config.advantageMethod = custom.advantageMethod ?? BUILTIN_PRESETS[0].advantageMethod;
    this.config.disadvantageMethod = custom.disadvantageMethod ?? BUILTIN_PRESETS[0].disadvantageMethod;
    this.config.minMod = custom.minMod ?? -2;
    this.config.maxMod = custom.maxMod ?? 5;
    this._onChange('structure');
  }

  updateThreshold(index: number, value: number): void {
    this.config.thresholds[index] = value;
    this._persistAndNotify('value');
  }

  updateCategory(index: number, field: 'label' | 'color', value: string): void {
    this.config.categories[index][field] = value;
    this._persistAndNotify('value');
  }

  updateMinMod(value: number): void {
    this.config.minMod = value;
    if (this.config.minMod > this.config.maxMod) {
      this.config.maxMod = this.config.minMod;
    }
    this._persistAndNotify('value');
  }

  updateMaxMod(value: number): void {
    this.config.maxMod = value;
    if (this.config.maxMod < this.config.minMod) {
      this.config.minMod = this.config.maxMod;
    }
    this._persistAndNotify('value');
  }

  setAdvantageMethod(method: AdvantageMethod): void {
    this.config.advantageMethod = method;
    this._persistAndNotify('value');
  }

  setDisadvantageMethod(method: DisadvantageMethod): void {
    this.config.disadvantageMethod = method;
    this._persistAndNotify('value');
  }

  setCritType(type: string): void {
    if (type === 'none') {
      this.config.criticals = { type: 'none' };
    } else if (type === 'natural') {
      const first = this.config.terms[0];
      this.config.criticals = { type: 'natural', hit: first.count * first.sides, miss: first.count };
    } else if (type === 'conditional-doubles') {
      this.config.criticals = { type: 'conditional-doubles', hit: this.config.categories.length - 1, miss: 0 };
    } else if (type === 'doubles') {
      this.config.criticals = { type: 'doubles', color: '#ffaa00', label: 'Critical' };
    }
    this._persistAndNotify('value');
  }

  updateNaturalCrit(field: 'hit' | 'miss', value: number): void {
    if (this.config.criticals.type === 'natural') {
      this.config.criticals[field] = value;
      this._persistAndNotify('value');
    }
  }

  updateConditionalDoublesCrit(field: 'hit' | 'miss', value: number): void {
    if (this.config.criticals.type === 'conditional-doubles') {
      this.config.criticals[field] = value;
      this._persistAndNotify('value');
    }
  }

  updateDoublesCrit(field: 'color' | 'label', value: string): void {
    if (this.config.criticals.type === 'doubles') {
      this.config.criticals[field] = value;
      this._persistAndNotify('value');
    }
  }

  addThreshold(): void {
    const lastThreshold = this.config.thresholds.length > 0
      ? this.config.thresholds[this.config.thresholds.length - 1]
      : 5;
    this.config.thresholds.push(lastThreshold + 5);
    this.config.categories.push({ label: 'New', color: '#888888' });
    this._persistAndNotify('structure');
  }

  removeThreshold(categoryIndex: number): void {
    this.config.categories.splice(categoryIndex, 1);
    this.config.thresholds.splice(categoryIndex - 1, 1);
    this._persistAndNotify('structure');
  }

  renamePreset(newName: string): void {
    const oldName = this.presetName;
    const custom = this.customPresets.find(p => p.name === oldName);
    if (custom) {
      custom.name = newName;
    }
    this.presetName = newName;
    this._persistAndNotify('value');
  }

  createCustomPreset(): void {
    const name = 'Custom ' + Date.now();
    const newPreset: SavedCustomPreset = {
      name,
      referenceDie: this.config.label,
      thresholds: [...this.config.thresholds],
      categories: this.config.categories.map(c => ({ ...c })),
      criticals: this.config.criticals,
      advantageMethod: this.config.advantageMethod,
      disadvantageMethod: this.config.disadvantageMethod,
      minMod: this.config.minMod,
      maxMod: this.config.maxMod,
    };

    saveCustomPreset(newPreset).then(savedId => {
      newPreset.id = savedId;
    }).catch(() => {}).then(() => {
      this.customPresets.push(newPreset);
      this.presetName = name;
      this._onChange('structure');
    });
  }

  deleteCustomPreset(custom: SavedCustomPreset): void {
    if (custom.id != null) {
      deleteCustomPreset(custom.id).catch(() => {});
    }
    this.customPresets = this.customPresets.filter(p => p !== custom);
    if (this.presetName === custom.name) {
      this.switchToBuiltinPreset(BUILTIN_PRESETS[0]);
    } else {
      this._onChange('structure');
    }
  }

  private _persistAndNotify(kind: EditorChangeKind): void {
    if (!this.isBuiltin) {
      const custom = this.customPresets.find(p => p.name === this.presetName);
      if (custom) {
        custom.thresholds = [...this.config.thresholds];
        custom.categories = this.config.categories.map(c => ({ ...c }));
        custom.criticals = this.config.criticals;
        custom.advantageMethod = this.config.advantageMethod;
        custom.disadvantageMethod = this.config.disadvantageMethod;
        custom.minMod = this.config.minMod;
        custom.maxMod = this.config.maxMod;
        saveCustomPreset(custom).catch(() => {});
      }
    }
    this._onChange(kind);
  }
}
