import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { BRAND } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="bg-foreground text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo inverse />
          <p className="mt-4 max-w-sm text-sm text-primary-foreground/60">
            Slack, calendar and coursework in one academic workspace built for MBA and B-school students.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <span className="mb-1 font-semibold">Product</span>
          <Link to="/features" className="text-primary-foreground/60 hover:text-primary-foreground">Features</Link>
          <Link to="/how-it-works" className="text-primary-foreground/60 hover:text-primary-foreground">How it works</Link>
          <Link to="/pricing" className="text-primary-foreground/60 hover:text-primary-foreground">Pricing</Link>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <span className="mb-1 font-semibold">Help</span>
          <Link to="/faq" className="text-primary-foreground/60 hover:text-primary-foreground">FAQ</Link>
          <Link to="/auth" className="text-primary-foreground/60 hover:text-primary-foreground">Log in</Link>
        </div>
      </div>
      <div className="border-t border-primary-foreground/10 py-5 text-center text-xs text-primary-foreground/40">
        © {new Date().getFullYear()} {BRAND.name}
      </div>
    </footer>
  );
}

export function PageHero({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) {
  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground grid-lines">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border-[40px] border-cta/90" />
      <div className="absolute bottom-0 right-48 h-24 w-24 bg-periwinkle/80" />
      <div className="relative mx-auto max-w-7xl px-5 py-20 md:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-periwinkle">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.05] md:text-6xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-lg text-primary-foreground/75">{intro}</p>
      </div>
    </section>
  );
}
