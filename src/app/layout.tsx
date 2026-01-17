import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Outfit } from "next/font/google";
import "../index.css";
import { ThemeAccessibilityControls } from "@/components/theme-accessibility-controls";

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
    <html
      lang="en"
      suppressHydrationWarning
      className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
    >
      <body
        className="min-h-screen bg-background font-body text-foreground antialiased"
      >
        <script
          // Keep theme/a11y state in sync with the marketing SPA (next-themes uses `theme`).
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var dark=(t==='dark')||(t!=='light'&&((t==='system'||!t)&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches));document.documentElement.classList.toggle('dark',!!dark);var a=localStorage.getItem('frilpp-a11y')==='1';document.documentElement.classList.toggle('a11y',a);}catch(e){}})();`,
          }}
        />
        <ThemeAccessibilityControls />
        {children}
      </body>
    </html>
  );
}
