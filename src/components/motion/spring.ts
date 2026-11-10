/**
 * Tiny spring integrator (mass 1, semi-implicit Euler, 240 Hz substeps) shared by every
 * physics interaction. Presets match DESIGN.md; ζ = c / (2√k).
 */
export const SPRINGS = {
  ui: { k: 600, c: 40 },
  bar: { k: 300, c: 20 },
  tip: { k: 500, c: 38 },
  toast: { k: 260, c: 24 },
  trace: { k: 90, c: 9 },
} as const;

export type SpringPreset = keyof typeof SPRINGS;

type Options = {
  from: number;
  to: number;
  velocity?: number;
  preset?: SpringPreset;
  onUpdate: (value: number) => void;
  onDone?: () => void;
};

export type Spring = {
  readonly value: number;
  set: (target: number) => void;
  stop: () => void;
};

type Sim = { x: number; v: number; to: number; k: number; c: number; onUpdate: (v: number) => void; onDone?: () => void };

const running = new Set<Sim>();
let frame = 0;
let last = 0;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function tick(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const steps = Math.max(1, Math.round(dt * 240));
  const h = dt / steps;
  for (const s of running) {
    for (let i = 0; i < steps; i++) {
      s.v += (-s.k * (s.x - s.to) - s.c * s.v) * h;
      s.x += s.v * h;
    }
    if (Math.abs(s.x - s.to) < 0.0005 && Math.abs(s.v) < 0.002) {
      s.x = s.to;
      s.v = 0;
      running.delete(s);
      s.onUpdate(s.x);
      s.onDone?.();
      continue;
    }
    s.onUpdate(s.x);
  }
  frame = running.size ? requestAnimationFrame(tick) : 0;
}

function start(sim: Sim): void {
  running.add(sim);
  if (!frame) {
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }
}

export function spring({ from, to, velocity = 0, preset = "ui", onUpdate, onDone }: Options): Spring {
  const { k, c } = SPRINGS[preset];
  const sim: Sim = { x: from, v: velocity, to, k, c, onUpdate, onDone };
  const jump = (target: number) => {
    sim.x = target;
    sim.v = 0;
    sim.to = target;
    running.delete(sim);
    onUpdate(target);
    onDone?.();
  };
  if (prefersReducedMotion()) jump(to);
  else start(sim);
  return {
    get value() {
      return sim.x;
    },
    set(target: number) {
      if (prefersReducedMotion()) return jump(target);
      sim.to = target;
      if (!running.has(sim)) start(sim);
    },
    stop() {
      running.delete(sim);
    },
  };
}
