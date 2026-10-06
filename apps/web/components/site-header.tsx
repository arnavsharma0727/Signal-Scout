import Link from "next/link";
import type { ReactNode } from "react";

/** Shared public-page masthead: identical width, brand lockup, and vertical rhythm. */
export default function SiteHeader({ action }: { action: ReactNode }) {
  return (
    <header className="border-b border-line">
      <div className="shell flex min-h-16 items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Signal Scout research desk">
          <span className="flex h-8 w-8 items-center justify-center rounded border border-line text-xs font-bold" aria-hidden="true">SS</span>
          <span className="font-bold tracking-tight">SIGNAL SCOUT</span>
        </Link>
        <div className="text-right text-sm text-muted">{action}</div>
      </div>
    </header>
  );
}
