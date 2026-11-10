import Link from "next/link";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-[18px] fill-none stroke-accent-ink stroke-[2.2] drop-shadow-[var(--glow)] ${className}`}>
      <path d="M2 13h5l2-5 4 11 3-14 2 8h4" strokeLinecap="square" />
    </svg>
  );
}

export function Brand({ href = "/", cursor = false }: { href?: string; cursor?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-md font-bold tracking-tight no-underline">
      <BrandMark />
      heartbeat
      {cursor ? <span className="cursor" aria-hidden="true" /> : null}
    </Link>
  );
}
