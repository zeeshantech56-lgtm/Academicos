import { createFileRoute } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PageHero, SiteFooter } from "@/components/site/SiteFooter";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Academic OS" },
      { name: "description", content: "Answers about Slack and Google Calendar integration, AI extraction, plans and privacy." },
      { property: "og:title", content: "FAQ — Academic OS" },
      { property: "og:description", content: "Common questions about Academic OS." },
    ],
  }),
  component: Faq,
});

const QA: [string, string][] = [
  ["What is Academic OS?", "A workspace that brings your Slack course channels, Google Calendar and coursework together, and helps you decide what to work on first."],
  ["How does Slack integration work?", "You authorise Academic OS to read the channels you choose in your own Slack workspace. Messages from those channels are analysed to suggest assignments, readings and deadlines."],
  ["Do I need to connect my own Slack account?", "Yes. Each student connects their own account, so you only ever see channels you already have access to."],
  ["Can I connect multiple Slack channels?", "Yes. You can map several channels to different subjects, or more than one channel to the same subject."],
  ["How does subject-wise organisation work?", "You create a subject for each course. Tasks, readings, calendar events and Slack channels are linked to a subject so everything stays grouped."],
  ["Can I connect Google Calendar?", "Yes, on the Pro and Premium plans. Your events are read from your own Google account."],
  ["Does the application automatically create assignments?", "AI suggests assignments it finds. They stay as suggestions until you confirm them."],
  ["Can I edit AI-extracted information?", "Always. You can edit titles, subjects, due dates and priorities, or discard a suggestion."],
  ["Can I use the application for free?", "Yes. The Free plan includes the dashboard, manual assignments and readings, and subject organisation."],
  ["How do monthly subscriptions work?", "Choose Pro or Premium, pay using the instructions shown, then submit your transaction reference. An administrator verifies it and activates your plan for one month."],
  ["How can I disconnect Slack or Google Calendar?", "From the Integrations page in your dashboard. Disconnecting stops future syncing."],
  ["Is my academic information private?", "Your data is tied to your account and other students cannot see it. Access rules are enforced in the database, not just the interface."],
];

function Faq() {
  return (
    <div>
      <SiteHeader />
      <PageHero eyebrow="FAQ" title="Questions, answered." intro="Can't find what you need? Reach out after signing up." />
      <section className="mx-auto max-w-3xl px-5 py-20">
        <Accordion type="single" collapsible>
          {QA.map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="text-left text-lg font-semibold">{q}</AccordionTrigger>
              <AccordionContent className="text-base text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
      <SiteFooter />
    </div>
  );
}
