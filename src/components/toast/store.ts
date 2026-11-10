export type ToastKind = "ok" | "error" | "warn";
export type ToastItem = { id: number; kind: ToastKind; title: string; body?: string };

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

const MAX_VISIBLE = 3;

function emit(): void {
  for (const l of listeners) l(items);
}

export function toast(kind: ToastKind, title: string, body?: string): void {
  items = [...items, { id: nextId++, kind, title, body }].slice(-MAX_VISIBLE);
  emit();
}

export function dismissToast(id: number): void {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(items);
  return () => listeners.delete(listener);
}
