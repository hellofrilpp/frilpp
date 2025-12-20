import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Outfit } from "next/font/google";
import "../index.css";

const displayFont = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
});

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Frilpp",
  description: "Product seeding CRM for D2C brands and nano-creators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
      <body
        className="min-h-screen bg-background font-body text-foreground antialiased"
      >
        {children}
      </body>
    </html>
  );
}
