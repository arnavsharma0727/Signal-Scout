import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'Signal Scout — Korea–U.S. Conversation Monitor',description:'A source-aware research workspace for comparing Korean and U.S. market conversations.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
