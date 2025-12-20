import { Link } from "react-router-dom";
import { Twitter, Instagram, Linkedin, Youtube, ArrowUpRight, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FrilppLogo from "@/components/FrilppLogo";

const footerLinks = {
  "[MENU]": [
    { name: "HOW_IT_WORKS", href: "#how-it-works" },
    { name: "FOR_BRANDS", href: "#for-brands" },
    { name: "FOR_CREATORS", href: "#for-influencers" },
    { name: "PRICING", href: "#pricing" },
    { name: "FAQ", href: "#faq" },
  ],
  "[INFO]": [
    { name: "ABOUT", href: "#" },
    { name: "BLOG", href: "#" },
    { name: "CAREERS", href: "#" },
    { name: "PRESS", href: "#" },
    { name: "CONTACT", href: "#" },
  ],
  "[LEGAL]": [
    { name: "PRIVACY", href: "#" },
    { name: "TERMS", href: "#" },
    { name: "COOKIES", href: "#" },
  ],
};

const socialLinks = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Youtube, href: "#", label: "YouTube" },
];

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

            {/* Newsletter */}
            <div className="space-y-3">
              <p className="text-xs font-pixel text-neon-purple">[NEWSLETTER]</p>
              <div className="flex gap-2">
                <Input 
                  type="email" 
                  placeholder="ENTER_EMAIL" 
                  className="bg-background border-2 border-border font-mono text-sm focus:border-primary"
                />
                <Button className="bg-primary text-primary-foreground px-4 pixel-btn">
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
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
          
          {/* Social Links */}
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="w-10 h-10 border-2 border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all pixel-btn"
                aria-label={social.label}
              >
                <social.icon className="w-4 h-4" />
              </a>
            ))}
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