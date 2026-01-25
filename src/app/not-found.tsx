import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4">
      <div className="text-center border-4 border-border bg-card px-8 py-10">
        <p className="font-pixel text-sm text-neon-pink mb-2">[404]</p>
        <h1 className="text-3xl font-pixel text-foreground mb-4">PAGE NOT FOUND</h1>
        <p className="font-mono text-sm text-muted-foreground mb-6">
          The route you were looking for does not exist.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 text-xs font-pixel bg-neon-green text-background pixel-btn glow-green"
        >
          RETURN_HOME
        </Link>
      </div>
    </div>
  );
}
