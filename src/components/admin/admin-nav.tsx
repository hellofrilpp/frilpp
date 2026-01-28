"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/idiot/dashboard", label: "Overview" },
  { href: "/idiot/campaigns", label: "Campaigns" },
  { href: "/idiot/creators", label: "Creators" },
];

export default function AdminNav() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/idiot";
  };

  return (
    <header className="border-b-2 border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-primary bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Admin</Badge>
              <span className="text-xs font-mono text-muted-foreground">Frilpp Control</span>
            </div>
            <div className="text-sm font-semibold">Platform Dashboard</div>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={active ? "default" : "outline"}
                  size="sm"
                  className="font-mono text-xs"
                >
                  {item.label}
                </Button>
              </Link>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );
}
