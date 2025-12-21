import { Link } from "react-router-dom";
import { Gamepad2 } from "lucide-react";
import FrilppLogo from "@/components/FrilppLogo";

const footerLinks = {
  "[MENU]": [
    { name: "HOW_IT_WORKS", href: "#how-it-works" },
    { name: "FOR_BRANDS", href: "#for-brands" },
    { name: "FOR_CREATORS", href: "#for-influencers" },
    { name: "PRICING", href: "#pricing" },
    { name: "FAQ", href: "#faq" },
  ],
  "[PORTALS]": [
    { name: "BRAND_LOGIN", href: "/brand/auth" },
    { name: "CREATOR_LOGIN", href: "/influencer/auth" },
    { name: "LEADERBOARD", href: "/leaderboard" },
    { name: "ACHIEVEMENTS", href: "/achievements" },
  ],
  "[LEGAL]": [
    { name: "PRIVACY", href: "/legal/privacy" },
    { name: "TERMS", href: "/legal/terms" },
  ],
};

const Footer = () => {
  return (
    <footer className="bg-card border-t-4 border-primary">
      <div className="container mx-auto px-4">
        {/* Main Footer */}
        <div className="py-16 grid md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            {/* Logo */}
            <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
              <div className="w-8 h-8 bg-primary flex items-center justify-center">
                <FrilppLogo size="sm" />
              </div>
              <span className="text-sm font-pixel text-neon-green">
                FRI<span className="text-neon-pink">L</span>PP
              </span>
            </Link>
            
            <p className="font-mono text-sm text-muted-foreground mb-8 max-w-sm leading-relaxed">
              &gt; TINDER_FOR_COLLABS<br />
              &gt; BRANDS + CREATORS<br />
              &gt; SWIPE.MATCH.CREATE
            </p>

            <p className="font-mono text-xs text-muted-foreground">
              CONTACT:{" "}
              <a className="text-neon-green hover:underline" href="mailto:hello@frilpp.com">
                hello@frilpp.com
              </a>
            </p>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-xs font-pixel text-neon-yellow mb-6">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <a 
                      href={link.href} 
                      className="font-mono text-xs text-muted-foreground hover:text-neon-green transition-colors"
                    >
                      &gt; {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t-2 border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-4 h-4 text-neon-green animate-pulse-neon" />
            <p className="text-xs font-mono text-muted-foreground">
              © {new Date().getFullYear()} FRILPP // ALL_RIGHTS_RESERVED
            </p>
          </div>
        </div>

        {/* Easter egg */}
        <div className="pb-6 text-center">
          <span className="text-xs font-mono text-muted-foreground/30">
            ↑↑↓↓←→←→BA
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
