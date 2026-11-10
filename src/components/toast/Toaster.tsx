"use client";

import { useEffect, useState } from "react";
import { subscribeToasts, type ToastItem } from "./store";
import { Toast } from "./Toast";

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => subscribeToasts(setItems), []);
  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="pointer-events-none fixed right-3 bottom-[76px] z-70 flex w-[min(400px,calc(100vw-24px))] flex-col-reverse gap-2 md:right-4 md:bottom-4"
    >
      {items.map((t) => (
        <Toast key={t.id} item={t} />
      ))}
    </div>
  );
}
