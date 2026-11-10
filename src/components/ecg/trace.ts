import { SPRINGS } from "@/components/motion/spring";

/** One beat per monitor: up = normal PQRST, slow = late + small, down = flat with retry ticks. */
export type BeatKind = "up" | "slow" | "down" | "idle";

const KIND: Record<BeatKind, { dur: number; amp: number; color: number }> = {
  up: { dur: 0.82, amp: 1, color: 0 },
  slow: { dur: 1.2, amp: 0.55, color: 1 },
  down: { dur: 0.9, amp: 0, color: 2 },
  idle: { dur: 2.6, amp: 0, color: 3 },
};

const gauss = (s: number, mu: number, sd: number) => Math.exp(-((s - mu) ** 2) / (2 * sd * sd));

function shape(kind: BeatKind, s: number): number {
  if (kind === "down") return (s > 0.42 && s < 0.47 ? 0.07 : 0) + (s > 0.47 && s < 0.5 ? -0.04 : 0);
  if (kind === "idle") return gauss(s, 1.3, 0.05) * 0.1;
  const o = kind === "slow" ? 0.28 : 0;
  return (
    0.11 * gauss(s, 0.1 + o, 0.025) -
    0.12 * gauss(s, 0.2 + o, 0.011) +
    gauss(s, 0.235 + o, 0.012) -
    0.26 * gauss(s, 0.27 + o, 0.012) +
    0.24 * gauss(s, 0.46 + o, 0.045)
  );
}

const SPEED = 120; // px per second, like a 25 mm/s paper sweep scaled to screen
const ERASE_GAP = 22;

/** Sweep-style bedside-monitor trace drawn on a canvas. Colours come from CSS variables. */
export class Trace {
  private ctx: CanvasRenderingContext2D;
  private w = 1;
  private h = 1;
  private ys = new Float32Array(1);
  private cols = new Uint8Array(1);
  private head = 0;
  private t = 0;
  private beatStart = 0;
  private index = 0;
  private seq: BeatKind[];
  private kind: BeatKind;
  private amp = 0;
  private ampV = 0;
  private acc = 0;
  colors: string[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    private beats: () => BeatKind[],
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not available");
    this.ctx = ctx;
    this.seq = this.nextSeq();
    this.kind = this.seq[0] ?? "idle";
  }

  private nextSeq(): BeatKind[] {
    const s = this.beats();
    return s.length ? s : ["idle"];
  }

  resize(staticStrip: boolean): void {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(2, Math.round(r.width));
    this.h = Math.max(2, Math.round(r.height));
    this.canvas.width = this.w * dpr;
    this.canvas.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ys = new Float32Array(this.w).fill(Number.NaN);
    this.cols = new Uint8Array(this.w);
    this.head = 0;
    this.advance(staticStrip ? this.w : Math.floor(this.w * 0.75));
    this.draw(staticStrip);
  }

  private sample(): { y: number; color: number } {
    let s = this.t - this.beatStart;
    if (s >= KIND[this.kind].dur) {
      this.beatStart += KIND[this.kind].dur;
      this.index += 1;
      if (this.index >= this.seq.length) {
        this.index = 0;
        this.seq = this.nextSeq();
      }
      this.kind = this.seq[this.index] ?? "idle";
      s = this.t - this.beatStart;
    }
    const h = 1 / SPEED;
    const { k, c } = SPRINGS.trace;
    this.ampV += (-k * (this.amp - KIND[this.kind].amp) - c * this.ampV) * h;
    this.amp += this.ampV * h;
    this.t += h;
    const flat = this.kind === "down" || this.kind === "idle";
    const y = (flat ? shape(this.kind, s) : shape(this.kind, s) * Math.max(0, this.amp)) + (Math.random() - 0.5) * 0.012;
    return { y, color: KIND[this.kind].color };
  }

  private advance(px: number): void {
    for (let n = 0; n < px; n++) {
      const { y, color } = this.sample();
      this.ys[this.head] = y;
      this.cols[this.head] = color;
      this.head = (this.head + 1) % this.w;
      for (let g = 1; g < ERASE_GAP; g++) this.ys[(this.head + g) % this.w] = Number.NaN;
    }
  }

  step(dt: number): void {
    this.acc += dt * SPEED;
    const px = Math.floor(this.acc);
    this.acc -= px;
    if (px) {
      this.advance(px);
      this.draw(false);
    }
  }

  private yPx(v: number): number {
    return this.h * 0.64 - v * this.h * 0.46;
  }

  private draw(full: boolean): void {
    const { ctx, w } = this;
    ctx.clearRect(0, 0, w, this.h);
    ctx.lineWidth = 1.6;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const seg = 6;
    for (let start = 0; start < w; start += seg) {
      const age = (this.head - start + w) % w;
      ctx.globalAlpha = full ? 1 : Math.max(0.08, 1 - (age / w) * 0.85);
      ctx.strokeStyle = this.colors[this.cols[start] ?? 0] ?? "#41f07f";
      ctx.beginPath();
      let pen = false;
      for (let x = start; x <= Math.min(w - 1, start + seg); x++) {
        const v = this.ys[x] ?? Number.NaN;
        if (Number.isNaN(v)) {
          pen = false;
          continue;
        }
        if (pen) ctx.lineTo(x, this.yPx(v));
        else {
          ctx.moveTo(x, this.yPx(v));
          pen = true;
        }
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (full) return;
    const hx = (this.head - 1 + w) % w;
    const hv = this.ys[hx] ?? Number.NaN;
    if (Number.isNaN(hv)) return;
    ctx.fillStyle = this.colors[this.cols[hx] ?? 0] ?? "#41f07f";
    ctx.beginPath();
    ctx.arc(hx, this.yPx(hv), 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(hx, this.yPx(hv), 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
