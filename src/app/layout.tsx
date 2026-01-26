import type { Metadata } from "next";
import { Press_Start_2P, Space_Mono } from "next/font/google";
import "../index.css";

const displayFont = Press_Start_2P({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const bodyFont = Space_Mono({
  variable: "--font-body",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const monoFont = Space_Mono({
  variable: "--font-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Frilpp",
  description: "Product seeding CRM for D2C brands and nano-creators.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
        {children}
      </body>
    </html>
  );
}
