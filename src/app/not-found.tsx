import Link from "next/link";
import { EcgTrace } from "@/components/ecg/EcgTrace";
import { Brand } from "@/components/ui/Brand";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr]">
      <header className="border-b border-line px-4 py-3 md:px-8">
        <Brand />
      </header>
      <main id="main" className="mx-auto grid w-full max-w-[640px] content-center gap-4 px-4 py-12">
        <p className="prompt type-on">
          <span className="ps1" aria-hidden="true">
            $
          </span>
          curl -I {"<this page>"}
        </p>
        <h1 className="m-0 flex flex-wrap items-center gap-3 text-xl tracking-[-0.03em]">
          <span className="tag tag-solid bg-down">404</span> Nothing lives at this address.
        </h1>
        <p className="prose-text m-0 text-prose text-fg-2">
          The link may be old, or a status page may have moved to a new address. Monitors you don&apos;t own also show up as not found.
        </p>
        <div className="vitals crt">
          <EcgTrace beats={["down"]} height={72} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className="btn btn-primary">
            go to your monitors
          </Link>
          <Link href="/" className="btn">
            home
          </Link>
        </div>
      </main>
    </div>
  );
}
