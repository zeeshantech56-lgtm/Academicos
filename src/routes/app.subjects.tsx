import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUBJECT_COLORS, subjectsQuery, tasksQuery, addSubject, deleteSubject } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/subjects")({ component: Subjects });

function Subjects() {
  const { data: subjects = [] } = useQuery(subjectsQuery);
  const { data: tasks = [] } = useQuery(tasksQuery);
  const qc = useQueryClient();
  const [f, setF] = useState({ name: "", code: "", faculty: "", color: "blue" });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addSubject({
        name: f.name,
        code: f.code || null,
        faculty: f.faculty || null,
        color: f.color,
      });
      toast.success("Subject added");
      setF({ name: "", code: "", faculty: "", color: f.color });
      qc.invalidateQueries({ queryKey: ["subjects"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to add subject");
    }
  }

  async function remove(id: string) {
    try {
      await deleteSubject(id);
      toast.success("Subject removed");
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete subject");
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold">Subjects</h1>
      <form onSubmit={add} className="grid gap-3 rounded-lg bg-background p-5 md:grid-cols-[2fr_1fr_1.5fr_auto_auto]">
        <Input placeholder="Subject name, e.g. Corporate Finance" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input placeholder="Code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
        <Input placeholder="Faculty" value={f.faculty} onChange={(e) => setF({ ...f, faculty: e.target.value })} />
        <div className="flex items-center gap-1.5">
          {Object.entries(SUBJECT_COLORS).map(([k, c]) => (
            <button type="button" key={k} onClick={() => setF({ ...f, color: k })} aria-label={k}
              className={cn("h-7 w-7 rounded-sm", c, f.color === k && "ring-2 ring-ring ring-offset-2")} />
          ))}
        </div>
        <Button type="submit" variant="cta">Add subject</Button>
      </form>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => {
          const mine = tasks.filter((t) => t.subject_id === s.id);
          const open = mine.filter((t) => t.status !== "done").length;
          return (
            <div key={s.id} className="group relative overflow-hidden rounded-lg bg-background p-6">
              <span className={cn("absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-90", SUBJECT_COLORS[s.color] ?? "bg-primary")} />
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{s.code ?? "Subject"}</p>
              <h3 className="mt-1 pr-16 text-xl font-bold">{s.name}</h3>
              {s.faculty && <p className="text-sm text-muted-foreground">{s.faculty}</p>}
              <p className="mt-6 text-sm"><span className="font-display text-2xl font-extrabold">{open}</span> open Â· {mine.length - open} done</p>
              <button onClick={() => remove(s.id)} className="absolute bottom-5 right-5 text-muted-foreground opacity-0 hover:text-cta group-hover:opacity-100" aria-label="Delete subject"><Trash2 className="h-4 w-4" /></button>
            </div>
          );
        })}
        {!subjects.length && <p className="text-sm text-muted-foreground">No subjects yet.</p>}
      </div>
    </div>
  );
}
