import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calendarEventsQuery, subjectsQuery, addCalendarEvent, deleteCalendarEvent, SUBJECT_COLORS } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/calendar")({ component: CalendarPage });

function CalendarPage() {
  const { data: events = [] } = useQuery(calendarEventsQuery);
  const { data: subjects = [] } = useQuery(subjectsQuery);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    title: "",
    subject_id: "none",
    start_at: "",
    end_at: "",
    location: "",
    type: "class" as const,
  });

  const bySubject = Object.fromEntries(subjects.map((s) => [s.id, s]));

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addCalendarEvent({
        title: f.title,
        subject_id: f.subject_id === "none" ? null : f.subject_id,
        start_at: new Date(f.start_at).toISOString(),
        end_at: f.end_at ? new Date(f.end_at).toISOString() : new Date(f.start_at).toISOString(),
        location: f.location || null,
        type: f.type,
      });
      toast.success("Schedule item added");
      qc.invalidateQueries({ queryKey: ["calendarEvents"] });
      setF({ title: "", subject_id: "none", start_at: "", end_at: "", location: "", type: "class" });
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add event");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCalendarEvent(id);
      toast.success("Schedule item removed");
      qc.invalidateQueries({ queryKey: ["calendarEvents"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to remove event");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Academic Schedule</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your classes, exams, and weekly lecture timelines.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="cta"><Plus /> Add Schedule Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Class or Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Event / Class Title</Label>
                <Input required placeholder="e.g. Corporate Finance Lecture 4" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={f.type} onValueChange={(v: any) => setF({ ...f, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="class">Class</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                      <SelectItem value="deadline">Project Deadline</SelectItem>
                      <SelectItem value="meeting">Study Group / Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Select value={f.subject_id} onValueChange={(v) => setF({ ...f, subject_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No subject</SelectItem>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Starts At</Label>
                  <Input type="datetime-local" required value={f.start_at} onChange={(e) => setF({ ...f, start_at: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Ends At</Label>
                  <Input type="datetime-local" value={f.end_at} onChange={(e) => setF({ ...f, end_at: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Location / Room / Zoom link</Label>
                <Input placeholder="e.g. Hall B or Zoom URL" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
              </div>
              <Button type="submit" variant="cta" className="w-full">Save to Schedule</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-background p-12 text-center text-muted-foreground">
            <CalendarIcon className="mx-auto h-8 w-8 opacity-40 mb-3" />
            <p className="font-medium">No classes or schedule items yet.</p>
            <p className="mt-1 text-sm">Add your upcoming lectures or sync your Google Calendar below.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {events.map((ev) => {
              const subj = ev.subject_id ? bySubject[ev.subject_id] : null;
              const start = new Date(ev.start_at);
              return (
                <div key={ev.id} className="flex items-center justify-between rounded-lg border bg-background p-4 shadow-sm hover:border-primary/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center justify-center rounded-md bg-surface px-3 py-2 text-center min-w-14">
                      <span className="text-xs uppercase font-semibold text-muted-foreground">{start.toLocaleString("default", { month: "short" })}</span>
                      <span className="text-xl font-extrabold text-foreground">{start.getDate()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn("inline-block h-2 w-2 rounded-full", subj ? (SUBJECT_COLORS[subj.color] || "bg-primary") : "bg-primary")} />
                        <h3 className="font-semibold text-foreground">{ev.title}</h3>
                        <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">{ev.type}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {subj && <span>Subject: <strong>{subj.name}</strong></span>}
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {ev.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(ev.id)} className="text-muted-foreground hover:text-cta p-2" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
