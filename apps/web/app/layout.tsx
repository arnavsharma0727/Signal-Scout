import type { Metadata } from "next";
import Link from "next/link";
import { setDisplayTimeZone } from "./actions";
import { getDisplayTimeZone } from "../lib/display-timezone";
import { TIME_ZONE_OPTIONS } from "../lib/time-zones";
import "./globals.css";
export const metadata: Metadata = {
  title: "Signal Scout — International Conversation Research",
  description:
    "A source-aware workspace for turning public online discussion and reporting into evidence-linked research questions.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const timeZone = await getDisplayTimeZone();
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="border-t border-line bg-white">
          <div className="shell flex flex-col gap-4 py-6 text-xs text-muted md:flex-row md:items-center md:justify-between">
            <p>For research and information only; not investment advice.</p>
            <div className="flex flex-wrap items-center gap-5">
              <form
                action={setDisplayTimeZone}
                className="flex flex-wrap items-center gap-2"
              >
                <label htmlFor="display-timezone">Display time in</label>
                <select
                  id="display-timezone"
                  name="timezone"
                  defaultValue={timeZone}
                  className="rounded border border-line bg-white px-2 py-1 text-xs text-ink"
                >
                  {TIME_ZONE_OPTIONS.map((zone) => (
                    <option key={zone.value} value={zone.value}>
                      {zone.label}
                    </option>
                  ))}
                </select>
                <button className="underline underline-offset-2" type="submit">
                  Apply
                </button>
                <span className="sr-only">
                  Stored timestamps remain in UTC.
                </span>
              </form>
              <nav aria-label="Footer" className="flex gap-5">
                <Link href="/about">About</Link>
                <Link href="/privacy">Privacy</Link>
                <Link href="/contact">Contact</Link>
              </nav>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
