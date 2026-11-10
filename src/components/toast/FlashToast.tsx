"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast, type ToastKind } from "./store";

type Props = { kind?: ToastKind; title: string; body?: string };

/** Shows a one-off toast for a redirect flag (e.g. ?saved=1), then drops the flag from the URL. */
export function FlashToast({ kind = "ok", title, body }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    toast(kind, title, body);
    const params = new URLSearchParams(window.location.search);
    for (const key of ["welcome", "deleted", "created", "saved", "error"]) params.delete(key);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [kind, title, body, pathname, router]);
  return null;
}
