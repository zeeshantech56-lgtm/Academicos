import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Hash, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Academic OS — Know what to study today" },
      { name: "description", content: "Turn scattered Slack messages, calendar events and deadlines into one clear academic plan." },
      { property: "og:title", content: "Academic OS — Know what to study today" },
      { property: "og:description", content: "One organised academic workspace for B-school students." },
    ],
  }),
  component: Home,
});

const PROBLEMS = [
  "Pre-reads buried in a dozen Slack channels",
  "Deadlines announced once, in one message",
  "Class schedule lives in a separate calendar",
  "No clear answer to “what do I do first?”",
];

const FEATURES = [
  { icon: Hash, title: "Slack, sorted by subject", body: "Map each course channel to a subject so updates land where they belong." },
  { icon: CalendarDays, title: "Calendar in context", body: "See classes alongside the readings and assignments they need." },
  { icon: Sparkles, title: "Deadlines, extracted", body: "AI spots assignments and due dates in messages for you to confirm." },
  { icon: Layers, title: "A plan for today", body: "Priorities ranked by deadline, effort and what's still open." },
];

function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="relative overflow-hidden bg-primary text-primary-foreground grid-lines">
        <div className="absolute -right-40 top-10 h-[520px] w-[520px] rounded-full bg-primary-foreground/5" />
        <div className="absolute right-24 top-24 hidden h-64 w-64 rounded-full border-[48px] border-cta lg:block" />
        <div className="absolute bottom-0 right-[22rem] hidden h-28 w-28 bg-periwinkle lg:block" />
        <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-20 md:pt-28">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-periwinkle">For MBA & B-school students</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-extrabold leading-[1.02] md:text-7xl">
            Know exactly what to study <span className="text-cta">today.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg text-primary-foreground/75">
            Academic OS pulls your Slack channels, calendar and coursework into one workspace — and tells you what to prioritise.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button variant="cta" size="xl" asChild><Link to="/auth" search={{ mode: "signup" }}>Get started free <ArrowRight /></Link></Button>
            <Button variant="outline-inverse" size="xl" asChild><Link to="/how-it-works">See how it works</Link></Button>
          </div>
          <div className="mt-16 max-w-3xl rounded-lg bg-background p-5 text-foreground shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="font-display font-bold">Today's priorities</span>
              <span className="text-xs text-muted-foreground">Tue · 3 items</span>
            </div>
            {[
              ["Corporate Finance", "Case write-up: Marriott", "Due 11:59 PM", "high"],
              ["Marketing Mgmt", "Pre-read: Kotler Ch. 4", "Before 10 AM class", "medium"],
              ["Business Analytics", "Problem set 3", "Due Thu", "low"],
            ].map(([s, t, d, p]) => (
              <div key={t} className="flex items-center gap-4 border-b py-3 last:border-0">
                <span className={p === "high" ? "h-2.5 w-2.5 rounded-full bg-cta" : p === "medium" ? "h-2.5 w-2.5 rounded-full bg-primary" : "h-2.5 w-2.5 rounded-full bg-periwinkle"} />
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s}</p>
                  <p className="font-medium">{t}</p>
                </div>
                <span className="text-sm text-muted-foreground">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-24 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cta">The problem</p>
          <h2 className="mt-3 text-4xl font-extrabold md:text-5xl">Your coursework is everywhere at once.</h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {PROBLEMS.map((p, i) => (
            <li key={p} className="rounded-lg border bg-surface p-5">
              <span className="font-display text-3xl font-extrabold text-primary/20">0{i + 1}</span>
              <p className="mt-2 font-medium">{p}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-surface grid-lines-light">
        <div className="mx-auto max-w-7xl px-5 py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cta">The solution</p>
          <h2 className="mt-3 max-w-2xl text-4xl font-extrabold md:text-5xl">One workspace that turns noise into a plan.</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-lg bg-background p-6 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground"><f.icon /></span>
                <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24">
        <h2 className="text-4xl font-extrabold md:text-5xl">How it works</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-4">
          {["Create your account", "Add subjects", "Connect Slack & Calendar", "Follow your daily plan"].map((s, i) => (
            <div key={s} className="border-t-4 border-primary pt-5">
              <span className="font-display text-5xl font-extrabold text-cta">{i + 1}</span>
              <p className="mt-3 text-lg font-semibold">{s}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-cta" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 px-5 py-20 md:flex-row md:items-center md:justify-between">
          <h2 className="max-w-xl text-4xl font-extrabold md:pl-40">Start free. Upgrade when you're ready.</h2>
          <div className="flex gap-3">
            <Button variant="cta" size="xl" asChild><Link to="/auth" search={{ mode: "signup" }}>Create free account</Link></Button>
            <Button variant="outline-inverse" size="xl" asChild><Link to="/pricing">View pricing</Link></Button>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

