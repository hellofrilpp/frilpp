"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import FrilppLogo from "@/components/frilpp-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccessibilityToggle } from "@/components/accessibility-toggle";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b-4 border-primary">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 h-16 md:h-20">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary flex items-center justify-center animate-pulse-neon">
              <FrilppLogo size="sm" />
            </div>
            <span className="text-sm md:text-base font-pixel text-neon-green tracking-tight">
              FRI<span className="text-neon-pink">L</span>PP
            </span>
          </Link>

          <nav className="hidden lg:flex flex-1 items-center justify-center gap-6">
            <a
              href="#how-it-works"
              className="text-xs font-mono text-muted-foreground hover:text-neon-green transition-colors hover-shake"
            >
              [HOW_IT_WORKS]
            </a>
            <a
              href="#for-brands"
              className="text-xs font-mono text-muted-foreground hover:text-neon-pink transition-colors hover-shake"
            >
              [BRANDS]
            </a>
            <a
              href="#for-influencers"
              className="text-xs font-mono text-muted-foreground hover:text-neon-purple transition-colors hover-shake"
            >
              [CREATORS]
            </a>
            <a
              href="#pricing"
              className="text-xs font-mono text-muted-foreground hover:text-neon-yellow transition-colors hover-shake"
            >
              [PRICING]
            </a>
            <Link
              href="/leaderboard"
              className="text-xs font-mono text-muted-foreground hover:text-neon-green transition-colors hover-shake"
            >
              [LEADERBOARD]
            </Link>
          </nav>

          <div className="hidden lg:flex items-center gap-3 shrink-0 ml-auto">
            <Link
              href="/influencer/auth"
              className="inline-flex items-center border-2 border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-background text-xs font-pixel px-5 py-2 pixel-btn"
            >
              CREATOR →
            </Link>
            <Link
              href="/brand/auth"
              className="inline-flex items-center bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-pixel px-6 py-2 pixel-btn"
            >
              BUSINESS →
            </Link>
            <div className="w-px h-8 bg-border" />
            <ThemeToggle />
            <AccessibilityToggle />
          </div>

          <div className="lg:hidden ml-auto flex items-center gap-2 shrink-0">
            <button
              className="p-2 border-2 border-primary pixel-btn"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 text-primary" />
              ) : (
                <Menu className="w-5 h-5 text-primary" />
              )}
            </button>
            <ThemeToggle />
            <AccessibilityToggle />
          </div>
        </div>

        {isMenuOpen ? (
          <div className="lg:hidden py-6 border-t-2 border-border animate-fade-in bg-card">
            <nav className="flex flex-col gap-4">
              <a href="#how-it-works" className="text-xs font-mono text-muted-foreground hover:text-neon-green">
                [HOW_IT_WORKS]
              </a>
              <a href="#for-brands" className="text-xs font-mono text-muted-foreground hover:text-neon-pink">
                [BRANDS]
              </a>
              <a href="#for-influencers" className="text-xs font-mono text-muted-foreground hover:text-neon-purple">
                [CREATORS]
              </a>
              <a href="#pricing" className="text-xs font-mono text-muted-foreground hover:text-neon-yellow">
                [PRICING]
              </a>
              <Link href="/leaderboard" className="text-xs font-mono text-muted-foreground hover:text-neon-green">
                [LEADERBOARD]
              </Link>
              <div className="flex flex-col gap-2 pt-4 border-t-2 border-border">
                <Link
                  href="/influencer/auth"
                  className="inline-flex items-center justify-center w-full border-2 border-neon-pink text-neon-pink font-pixel text-xs px-5 py-2 pixel-btn"
                >
                  CREATOR →
                </Link>
                <Link
                  href="/brand/auth"
                  className="inline-flex items-center justify-center bg-primary text-primary-foreground w-full font-pixel text-xs px-6 py-2 pixel-btn"
                >
                  BUSINESS →
                </Link>
              </div>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
