import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { KIND_LABEL, SUBJECT_COLORS, subjectsQuery, updateTask, deleteTask, type Task } from "@/lib/data";
import { cn } from "@/lib/utils";

export function formatDue(d: string | null) {
  if (!d) return "No due date";
  const date = new Date(d);
  return date.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function TaskList({ tasks, empty }: { tasks: Task[]; empty: string }) {
  const { data: subjects = [] } = useQuery(subjectsQuery);
  const qc = useQueryClient();
  const byId = Object.fromEntries(subjects.map((s) => [s.id, s]));

  async function toggle(t: Task) {
    const done = t.status !== "done";
    try {
      await updateTask(t.id, {
        status: done ? "done" : "todo",
        completed_at: done ? new Date().toISOString() : null,
      });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update item");
    }
  }

  async function remove(t: Task) {
    try {
      await deleteTask(t.id);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Item deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item");
    }
  }

  if (!tasks.length) return <p className="rounded-lg border border-dashed bg-background p-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y rounded-lg border bg-background">
      {tasks.map((t) => {
        const s = t.subject_id ? byId[t.subject_id] : null;
        const overdue = t.due_at && t.status !== "done" && new Date(t.due_at) < new Date();
        return (
          <li key={t.id} className="group flex items-center gap-4 p-4">
            <Checkbox checked={t.status === "done"} onCheckedChange={() => toggle(t)} aria-label="Mark done" />
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", t.priority === "high" ? "bg-cta" : t.priority === "medium" ? "bg-primary" : "bg-periwinkle")} title={`${t.priority} priority`} />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate font-medium", t.status === "done" && "text-muted-foreground line-through")}>{t.title}</p>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                {s && <><span className={cn("h-2 w-2 rounded-sm", SUBJECT_COLORS[s.color] ?? "bg-primary")} />{s.name} Â·</>}
                {KIND_LABEL[t.kind] || t.kind}
              </p>
            </div>
            <span className={cn("hidden text-sm sm:block", overdue ? "font-semibold text-cta" : "text-muted-foreground")}>{overdue ? "Overdue Â· " : ""}{formatDue(t.due_at)}</span>
            <button onClick={() => remove(t)} className="text-muted-foreground opacity-0 hover:text-cta group-hover:opacity-100" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
          </li>
        );
      })}
    </ul>
  );
}
