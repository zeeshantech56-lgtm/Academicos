import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addTask, subjectsQuery } from "@/lib/data";

export function TaskDialog({ kinds, trigger }: { kinds: { value: string; label: string }[]; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: subjects = [] } = useQuery(subjectsQuery);
  const qc = useQueryClient();
  const [f, setF] = useState({ title: "", kind: kinds[0]?.value ?? "assignment", subject_id: "none", due_at: "", priority: "medium", notes: "" });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addTask({
        title: f.title,
        kind: f.kind as any,
        priority: f.priority as any,
        notes: f.notes || null,
        status: "todo",
        source: "manual",
        subject_id: f.subject_id === "none" ? null : f.subject_id,
        due_at: f.due_at ? new Date(f.due_at).toISOString() : null,
      });
      toast.success("Item added successfully");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setF({ ...f, title: "", notes: "", due_at: "" });
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add item");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add item</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5"><Label>Title</Label><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            {kinds.length > 1 && (
              <div className="space-y-1.5"><Label>Type</Label>
                <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{kinds.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent></Select>
              </div>
            )}
            <div className="space-y-1.5"><Label>Subject</Label>
              <Select value={f.subject_id} onValueChange={(v) => setF({ ...f, subject_id: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">No subject</SelectItem>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Due</Label><Input type="datetime-local" value={f.due_at} onChange={(e) => setF({ ...f, due_at: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Priority</Label>
              <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Notes</Label><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
          <Button type="submit" variant="cta" className="w-full">Save</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
