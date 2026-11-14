import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskDialog } from "@/components/app/TaskDialog";
import { TaskList } from "@/components/app/TaskList";
import { tasksQuery } from "@/lib/data";

export const Route = createFileRoute("/app/readings")({ component: Page });

function Page() {
  const { data = [] } = useQuery(tasksQuery);
  const items = data.filter((t) => t.kind === "pre_read" || t.kind === "post_read");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Readings</h1>
        <TaskDialog kinds={[{ value: "pre_read", label: "Pre-read" }, { value: "post_read", label: "Post-read" }]} trigger={<Button variant="cta"><Plus />New reading</Button>} />
      </div>
      <h2 className="font-bold">Open</h2>
      <TaskList tasks={items.filter((t) => t.status !== "done")} empty="No pending readings." />
      <h2 className="font-bold">Completed</h2>
      <TaskList tasks={items.filter((t) => t.status === "done")} empty="Finished readings will show here." />
    </div>
  );
}
