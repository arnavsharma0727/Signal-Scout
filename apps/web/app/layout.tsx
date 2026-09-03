import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'Signal Scout — Find the story. Do the work.',description:'Local-language research discovery for U.S.-traded companies.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
