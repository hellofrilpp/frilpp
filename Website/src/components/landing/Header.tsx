import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import FrilppLogo from "@/components/FrilppLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b-4 border-primary">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-4 h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary flex items-center justify-center animate-pulse-neon">
              <FrilppLogo size="sm" />
            </div>
            <span className="text-sm md:text-base font-pixel text-neon-green tracking-tight">
              FRI<span className="text-neon-pink">L</span>PP
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex flex-1 items-center justify-center gap-6">
            <a href="#how-it-works" className="text-xs font-mono text-muted-foreground hover:text-neon-green transition-colors hover-shake">
              [HOW_IT_WORKS]
            </a>
            <a href="#for-brands" className="text-xs font-mono text-muted-foreground hover:text-neon-pink transition-colors hover-shake">
              [BRANDS]
            </a>
            <a href="#for-influencers" className="text-xs font-mono text-muted-foreground hover:text-neon-purple transition-colors hover-shake">
              [CREATORS]
            </a>
            <a href="#pricing" className="text-xs font-mono text-muted-foreground hover:text-neon-yellow transition-colors hover-shake">
              [PRICING]
            </a>
            <Link to="/leaderboard" className="text-xs font-mono text-muted-foreground hover:text-neon-green transition-colors hover-shake">
              [LEADERBOARD]
            </Link>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-3 shrink-0 ml-auto">
            <Button
              variant="outline"
              className="border-2 border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-background text-xs font-pixel px-5 pixel-btn"
              asChild
            >
              <Link to="/influencer/signup">CREATOR →</Link>
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-pixel px-6 pixel-btn"
              asChild
            >
              <Link to="/brand/signup">BUSINESS →</Link>
            </Button>
            <div className="w-px h-8 bg-border" />
            <ThemeToggle />
            <AccessibilityToggle />
          </div>

          {/* Mobile Controls */}
          <div className="lg:hidden ml-auto flex items-center gap-2 shrink-0">
            <button
              className="p-2 border-2 border-primary pixel-btn"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-5 h-5 text-primary" /> : <Menu className="w-5 h-5 text-primary" />}
            </button>
            <ThemeToggle />
            <AccessibilityToggle />
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
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
              <Link to="/leaderboard" className="text-xs font-mono text-muted-foreground hover:text-neon-green">
                [LEADERBOARD]
              </Link>
              <div className="flex flex-col gap-2 pt-4 border-t-2 border-border">
                <Button
                  variant="outline"
                  asChild
                  className="w-full border-2 border-neon-pink text-neon-pink font-pixel text-xs pixel-btn"
                >
                  <Link to="/influencer/signup">CREATOR →</Link>
                </Button>
                <Button className="bg-primary text-primary-foreground w-full font-pixel text-xs pixel-btn" asChild>
                  <Link to="/brand/signup">BUSINESS →</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
