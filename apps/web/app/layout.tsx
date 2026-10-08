import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Atlas — the engine for global markets",
  description:
    "Search current public conversations and reporting about market interests around the world.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
