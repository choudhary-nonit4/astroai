import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AstroAI — Your birth chart, clearly explained",
  description: "Generate a deterministic Vedic birth chart and an easy-to-read report.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
