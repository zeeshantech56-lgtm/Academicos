import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PageHero, SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — Academic OS" },
      { name: "description", content: "Sign up, add subjects, connect Slack and Google Calendar, review AI suggestions and follow your daily plan." },
      { property: "og:title", content: "How it works — Academic OS" },
      { property: "og:description", content: "From scattered messages to a daily academic plan in six steps." },
    ],
  }),
  component: How,
});

const STEPS = [
  ["Create your account", "Sign up with email or Google. Every student starts on the Free plan."],
  ["Add your subjects", "Create a subject for each course — name, code and faculty."],
  ["Connect Slack", "Authorise your own Slack workspace and pick the channels for each subject."],
  ["Connect Google Calendar", "Bring in your class timetable and link events to subjects."],
  ["Review what AI found", "Suggested assignments, readings and deadlines appear for you to confirm or edit. Nothing is added silently."],
  ["Follow your daily plan", "Open the dashboard each morning to see what matters most today."],
];

function How() {
  return (
    <div>
      <SiteHeader />
      <PageHero eyebrow="How it works" title="Six steps from chaos to clarity." intro="You stay in control: integrations are opt-in and AI suggestions always wait for your approval." />
      <section className="mx-auto max-w-4xl px-5 py-20">
        <ol className="space-y-0">
          {STEPS.map(([t, b], i) => (
            <li key={t} className="grid grid-cols-[72px_1fr] gap-6 border-b py-8 last:border-0">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary font-display text-2xl font-extrabold text-primary">{i + 1}</span>
              <div>
                <h3 className="text-2xl font-bold">{t}</h3>
                <p className="mt-2 text-muted-foreground">{b}</p>
              </div>
            </li>
          ))}
        </ol>
        <Button variant="cta" size="xl" className="mt-10" asChild><Link to="/auth" search={{ mode: "signup" }}>Get started free</Link></Button>
      </section>
      <SiteFooter />
    </div>
  );
}
