import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata={title:'Signal Scout — Korea–U.S. Conversation Monitor',description:'A source-aware research workspace for comparing Korean and U.S. market conversations.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}<footer className="border-t border-line bg-white"><div className="shell flex flex-col gap-4 py-6 text-xs text-muted md:flex-row md:items-center md:justify-between"><p>For research and information only; not investment advice.</p><nav aria-label="Footer" className="flex gap-5"><Link href="/about">About</Link><Link href="/privacy">Privacy</Link><Link href="/contact">Contact</Link></nav></div></footer></body></html>}
