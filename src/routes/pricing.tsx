import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PageHero, SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Academic OS — Free & Open Workspace" },
      { name: "description", content: "Academic OS is fully open for all students. No subscriptions or paywalls." },
      { property: "og:title", content: "Academic OS — Free & Open Access" },
      { property: "og:description", content: "Organize Slack, Google Calendar, and coursework with complete access." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  return (
    <div>
      <SiteHeader />
      <PageHero 
        eyebrow="Access" 
        title="100% Free. All Features Included." 
        intro="No subscriptions, no hidden tiers. Full access to subjects, assignments, readings, and integrations." 
      />
      <section className="mx-auto max-w-4xl px-5 py-20">
        <div className="rounded-2xl border-2 border-primary bg-primary p-10 text-primary-foreground shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cta px-3 py-1 text-xs font-bold text-cta-foreground">
                <Sparkles className="h-3.5 w-3.5" /> Full Academic OS
              </span>
              <h3 className="mt-3 text-3xl font-extrabold">All-In-One Student Workspace</h3>
            </div>
            <div className="text-right">
              <span className="font-display text-5xl font-extrabold">Free</span>
              <p className="text-xs text-primary-foreground/70">Forever access for students</p>
            </div>
          </div>
          <p className="mt-4 text-primary-foreground/80">
            Everything you need to master your term without worrying about paywalls or limits.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "Unlimited subjects & course tracking",
              "Assignments & pre/post reading manager",
              "Integrated academic schedule & calendar",
              "Slack announcements & channels sync",
              "Google Calendar timetable integration",
              "AI prioritization of daily study items",
              "Multi-role administration tools",
              "Cloud Firestore real-time sync",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cta text-cta-foreground">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Button variant="cta" size="xl" className="w-full sm:w-auto" asChild>
              <Link to="/auth" search={{ mode: "signup" }}>Create Your Account Now</Link>
            </Button>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
