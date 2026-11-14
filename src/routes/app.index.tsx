import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskDialog } from "@/components/app/TaskDialog";
import { TaskList } from "@/components/app/TaskList";
import { meQuery, tasksQuery, subjectsQuery } from "@/lib/data";

export const Route = createFileRoute("/app/")({ component: Dashboard });

const KINDS = [{ value: "assignment", label: "Assignment" }, { value: "pre_read", label: "Pre-read" }, { value: "post_read", label: "Post-read" }];
const PRI = { high: 0, medium: 1, low: 2 } as Record<string, number>;

function Dashboard() {
  const { data: me } = useQuery(meQuery);
  const { data: tasks = [] } = useQuery(tasksQuery);
  const { data: subjects = [] } = useQuery(subjectsQuery);
  const now = new Date();
  const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
  const week = new Date(now.getTime() + 7 * 864e5);
  const open = tasks.filter((t) => t.status !== "done");
  const overdue = open.filter((t) => t.due_at && new Date(t.due_at) < now);
  const today = open
    .filter((t) => !t.due_at || new Date(t.due_at) <= endToday)
    .sort((a, b) => (PRI[a.priority] ?? 1) - (PRI[b.priority] ?? 1))
    .slice(0, 6);
  const upcoming = open.filter((t) => t.due_at && new Date(t.due_at) > endToday && new Date(t.due_at) <= week);
  const reads = open.filter((t) => t.kind === "pre_read" || t.kind === "post_read");
  const first = me?.profile?.full_name?.split(" ")[0];
  const hour = now.getHours();

  const stats = [
    { label: "Open items", value: open.length },
    { label: "Overdue", value: overdue.length, alert: overdue.length > 0 },
    { label: "Due this week", value: upcoming.length },
    { label: "Readings pending", value: reads.length },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">Good {hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}{first ? `, ${first}` : ""}.</h1>
        </div>
        <TaskDialog kinds={KINDS} trigger={<Button variant="cta"><Plus />Add item</Button>} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={s.alert ? "rounded-lg bg-cta p-5 text-cta-foreground" : "rounded-lg bg-background p-5"}>
            <p className="font-display text-4xl font-extrabold tabular-nums">{s.value}</p>
            <p className={s.alert ? "mt-1 text-sm text-cta-foreground/80" : "mt-1 text-sm text-muted-foreground"}>{s.label}</p>
          </div>
        ))}
      </div>

      {subjects.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-primary p-6 text-primary-foreground">
          <div><p className="font-display text-lg font-bold">Start by adding your subjects</p><p className="text-sm text-primary-foreground/70">Everything you track is organised by subject.</p></div>
          <Button variant="inverse" asChild><Link to="/app/subjects">Add subjects</Link></Button>
        </div>
      )}

      <section className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h2 className="mb-3 text-xl font-bold">Today's priorities</h2>
          <TaskList tasks={today} empty="Nothing due today. Add an item or enjoy the breathing room." />
        </div>
        <div className="lg:col-span-2">
          <h2 className="mb-3 text-xl font-bold">Next 7 days</h2>
          <TaskList tasks={upcoming} empty="No deadlines in the coming week." />
        </div>
      </section>

      <section className="rounded-lg border border-dashed bg-background p-6">
        <h2 className="text-lg font-bold">Today's schedule</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your classes will appear here once Google Calendar is connected. <Link to="/app/integrations" className="font-medium text-primary">View integrations →</Link></p>
      </section>
    </div>
  );
}
