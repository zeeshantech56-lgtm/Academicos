import { Link } from "@tanstack/react-router";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="relative flex h-8 w-8 items-center justify-center">
        <span className={cn("absolute inset-0 rounded-sm", inverse ? "bg-primary-foreground" : "bg-primary")} />
        <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-cta" />
      </span>
      <span className={cn("font-display text-lg font-extrabold tracking-tight", inverse ? "text-primary-foreground" : "text-foreground")}>
        {BRAND.name}
      </span>
    </Link>
  );
}
