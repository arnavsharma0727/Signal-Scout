import Link from "next/link";
import type { ReactNode } from "react";

/** A quiet, single-purpose brand bar for the search application. */
export default function SiteHeader({ action }: { action?: ReactNode } = {}) {
  return (
    <header className="site-masthead">
      <div className="shell site-masthead-inner">
        <Link href="/" className="site-brand" aria-label="Signal Scout home">
          SIGNAL SCOUT
        </Link>
        {action && <span className="site-tagline">{action}</span>}
      </div>
    </header>
  );
}
