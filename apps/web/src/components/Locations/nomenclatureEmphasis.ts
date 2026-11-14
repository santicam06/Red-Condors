import type { MarsViewerController } from '../../core/MarsViewerController';

const REST_SCALE = 1;
const HOVER_SCALE = 1.16;
const SELECT_SCALE = 1.14;
const HOVER_AND_SELECT_SCALE = 1.2;

interface VisualState {
  scale: number;
  mix: number;
}

/**
 * Animates nomenclature labels: a short ease toward a slightly larger red label
 * on hover, and a held red treatment while its details panel is open.
 */
export class NomenclatureEmphasis {
  private hoverFid: number | null = null;
  private selectedFid: number | null = null;
  private readonly visuals = new Map<number, VisualState>();
  private rafId: number | null = null;
  private disposed = false;

  constructor(private readonly controller: MarsViewerController) {}

  public setHover(fid: number | null): void {
    if (this.hoverFid === fid) return;
    this.hoverFid = fid;
    this.kick();
  }

  public setSelected(fid: number | null): void {
    if (this.selectedFid === fid) return;
    this.selectedFid = fid;
    this.kick();
  }

  public dispose(): void {
    this.disposed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    for (const fid of this.visuals.keys()) {
      this.controller.setNomenclatureLabelVisual(fid, REST_SCALE, 0);
    }
    this.visuals.clear();
  }

  private kick(): void {
    if (this.disposed || this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => this.frame());
  }

  private frame(): void {
    this.rafId = null;
    if (this.disposed) return;

    const targets = new Map<number, VisualState>();
    if (this.selectedFid !== null) {
      const hoveredToo = this.hoverFid === this.selectedFid;
      targets.set(this.selectedFid, {
        scale: hoveredToo ? HOVER_AND_SELECT_SCALE : SELECT_SCALE,
        mix: 1,
      });
    }
    if (this.hoverFid !== null && this.hoverFid !== this.selectedFid) {
      targets.set(this.hoverFid, { scale: HOVER_SCALE, mix: 1 });
    }

    const fids = new Set<number>([...this.visuals.keys(), ...targets.keys()]);
    let moving = false;

    for (const fid of fids) {
      const target = targets.get(fid) ?? { scale: REST_SCALE, mix: 0 };
      const current = this.visuals.get(fid) ?? { scale: REST_SCALE, mix: 0 };
      const scale = damp(current.scale, target.scale);
      const mix = damp(current.mix, target.mix);
      const settled =
        Math.abs(scale - target.scale) < 0.004 && Math.abs(mix - target.mix) < 0.015;

      if (settled && target.scale === REST_SCALE && target.mix === 0) {
        this.visuals.delete(fid);
        this.controller.setNomenclatureLabelVisual(fid, REST_SCALE, 0);
        continue;
      }

      const next = settled ? target : { scale, mix };
      this.visuals.set(fid, next);
      this.controller.setNomenclatureLabelVisual(fid, next.scale, next.mix);
      if (!settled) moving = true;
    }

    if (moving) {
      this.rafId = requestAnimationFrame(() => this.frame());
    }
  }
}

function damp(current: number, target: number): number {
  const next = current + (target - current) * 0.28;
  return Math.abs(next - target) < 0.004 ? target : next;
}
