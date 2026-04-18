import type { CriticalConfig } from '../engine';

export interface SegmentData {
  label: string;
  color: string;
  percent: number;
}

export class StackedBar extends HTMLElement {
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

  private _renderSegment(percent: number, color: string, tooltip: string, critClass: string = ''): void {
    if (percent <= 0) return;
    const el = document.createElement('div');
    el.className = critClass ? 'seg ' + critClass : 'seg';
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
      this._renderSegment(critHit, seg.color, 'Crit Hit', 'seg-crit-hit');
      this._renderSegment(remainder, seg.color, seg.label);
      this._renderSegment(critMiss, seg.color, 'Crit Miss', 'seg-crit-miss');
    }
  }

  private _renderPooled(): void {
    const pooledTotal = this.critHitPerCategory.reduce((a, b) => a + b, 0);
    const config = this.critConfig as { type: 'doubles'; color: string; label: string };
    this._renderSegment(pooledTotal, config.color, config.label);
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const seg = this.segments[i];
      const critAmount = this.critHitPerCategory[i] ?? 0;
      const remainder = seg.percent - critAmount;
      this._renderSegment(remainder, seg.color, seg.label);
    }
  }
}
