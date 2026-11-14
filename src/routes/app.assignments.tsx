import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskDialog } from "@/components/app/TaskDialog";
import { TaskList } from "@/components/app/TaskList";
import { tasksQuery } from "@/lib/data";

export const Route = createFileRoute("/app/assignments")({ component: Page });

function Page() {
  const { data = [] } = useQuery(tasksQuery);
  const items = data.filter((t) => t.kind === "assignment");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Assignments</h1>
        <TaskDialog kinds={[{ value: "assignment", label: "Assignment" }]} trigger={<Button variant="cta"><Plus />New assignment</Button>} />
      </div>
      <h2 className="font-bold">Open</h2>
      <TaskList tasks={items.filter((t) => t.status !== "done")} empty="No open assignments." />
      <h2 className="font-bold">Completed</h2>
      <TaskList tasks={items.filter((t) => t.status === "done")} empty="Completed assignments will show here." />
    </div>
  );
}
