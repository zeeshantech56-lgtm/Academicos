import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Calendar, Clock, MapPin, Hash, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskDialog } from "@/components/app/TaskDialog";
import { TaskList } from "@/components/app/TaskList";
import { meQuery, tasksQuery, subjectsQuery, calendarEventsQuery, SUBJECT_COLORS } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({ component: Dashboard });

const KINDS = [{ value: "assignment", label: "Assignment" }, { value: "pre_read", label: "Pre-read" }, { value: "post_read", label: "Post-read" }];
const PRI = { high: 0, medium: 1, low: 2 } as Record<string, number>;

function Dashboard() {
  const { data: me } = useQuery(meQuery);
  const { data: tasks = [] } = useQuery(tasksQuery);
  const { data: subjects = [] } = useQuery(subjectsQuery);
  const { data: calendarEvents = [] } = useQuery(calendarEventsQuery);

  const bySubject = Object.fromEntries(subjects.map((s) => [s.id, s]));

  const now = new Date();
  const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
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

  // Filter schedule items for today and next 7 days
  const todayEvents = calendarEvents.filter((ev) => {
    const d = new Date(ev.start_at);
    return d >= startToday && d <= endToday;
  });

  const upcomingEvents = calendarEvents.filter((ev) => {
    const d = new Date(ev.start_at);
    return d > endToday && d <= week;
  });

  const stats = [
    { label: "Open tasks", value: open.length },
    { label: "Overdue", value: overdue.length, alert: overdue.length > 0 },
    { label: "Due this week", value: upcoming.length },
    { label: "Scheduled classes", value: calendarEvents.length },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">Good {hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}{first ? `, ${first}` : ""}.</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/app/calendar"><Calendar className="h-4 w-4 mr-1.5" /> View Timetable</Link>
          </Button>
          <TaskDialog kinds={KINDS} trigger={<Button variant="cta"><Plus />Add item</Button>} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={s.alert ? "rounded-lg bg-cta p-5 text-cta-foreground" : "rounded-lg bg-background p-5 border"}>
            <p className="font-display text-4xl font-extrabold tabular-nums">{s.value}</p>
            <p className={s.alert ? "mt-1 text-sm text-cta-foreground/80" : "mt-1 text-sm text-muted-foreground"}>{s.label}</p>
          </div>
        ))}
      </div>

      {subjects.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-primary p-6 text-primary-foreground shadow-sm">
          <div>
            <p className="font-display text-lg font-bold">Start by adding your subjects</p>
            <p className="text-sm text-primary-foreground/70">Everything you track is organized by subject (Marketing, Finance, Analytics, etc.).</p>
          </div>
          <Button variant="inverse" asChild><Link to="/app/subjects">Add subjects</Link></Button>
        </div>
      )}

      {/* Schedule Banner */}
      <section className="rounded-lg border bg-background p-6 shadow-sm">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Today's Schedule & Classes
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Classes, timetable events, and calendar sync</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app/calendar" className="text-xs font-semibold text-primary">Manage Schedule →</Link>
          </Button>
        </div>

        {todayEvents.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <p>No classes scheduled for today.</p>
            <p className="text-xs mt-1">
              {calendarEvents.length > 0 
                ? `You have ${calendarEvents.length} upcoming classes in your schedule.` 
                : "Add your lectures or schedule items in the Schedule tab."}
            </p>
          </div>
        ) : (
          <div className="divide-y mt-2">
            {todayEvents.map((ev) => {
              const subj = ev.subject_id ? bySubject[ev.subject_id] : null;
              const start = new Date(ev.start_at);
              return (
                <div key={ev.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className={cn("h-3 w-3 rounded-full", subj ? (SUBJECT_COLORS[subj.color] || "bg-primary") : "bg-primary")} />
                    <div>
                      <p className="font-medium text-sm text-foreground">{ev.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {subj ? `${subj.name} · ` : ""}{ev.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {ev.location && (
                      <span className="hidden sm:flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {ev.location}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Priorities and Next 7 Days */}
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
    </div>
  );
}
