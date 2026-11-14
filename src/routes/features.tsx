import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, CalendarDays, ClipboardList, Hash, LayoutDashboard, Layers, Sparkles, TrendingUp } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PageHero, SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Academic OS" },
      { name: "description", content: "Dashboard, Slack and Calendar integration, AI deadline extraction, reading tracking and daily plans." },
      { property: "og:title", content: "Features — Academic OS" },
      { property: "og:description", content: "Everything a B-school student needs to stay on top of coursework." },
    ],
  }),
  component: Features,
});

const ITEMS = [
  { icon: LayoutDashboard, t: "Smart academic dashboard", b: "Today's classes, priorities and deadlines on a single screen." },
  { icon: Hash, t: "Slack integration", b: "Connect your own workspace and choose which channels to follow. (Pro)" },
  { icon: Layers, t: "Subject-wise organisation", b: "Every reading, assignment and update grouped under its course." },
  { icon: CalendarDays, t: "Google Calendar", b: "Bring in your class schedule and map events to subjects. (Pro)" },
  { icon: ClipboardList, t: "Assignment management", b: "Track status, priority and due dates. AI suggests new ones from messages for you to confirm." },
  { icon: BookOpen, t: "Reading management", b: "Separate pre-reads and post-reads, tied to the class they belong to." },
  { icon: Sparkles, t: "AI daily planner", b: "A ranked list of what to tackle today, based on deadlines and effort." },
  { icon: TrendingUp, t: "Weekly overview", b: "See the week's load at a glance so nothing surprises you." },
];

function Features() {
  return (
    <div>
      <SiteHeader />
      <PageHero eyebrow="Features" title="Built around how B-school coursework actually arrives." intro="Messages, calendars and documents — organised into subjects and turned into a plan." />
      <section className="mx-auto grid max-w-7xl gap-px overflow-hidden bg-border px-0 md:my-20 md:grid-cols-2 md:rounded-lg md:border">
        {ITEMS.map((i, n) => (
          <div key={i.t} className="flex gap-5 bg-background p-8">
            <span className={n % 3 === 0 ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cta text-cta-foreground" : "flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"}><i.icon /></span>
            <div>
              <h3 className="text-xl font-bold">{i.t}</h3>
              <p className="mt-2 text-muted-foreground">{i.b}</p>
            </div>
          </div>
        ))}
      </section>
      <SiteFooter />
    </div>
  );
}
