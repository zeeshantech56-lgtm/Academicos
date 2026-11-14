import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, Hash, Sparkles, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/app/integrations")({ component: Integrations });

function Integrations() {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [slackConnected, setSlackConnected] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);

  const [slackWebhook, setSlackWebhook] = useState("");
  const [slackChannel, setSlackChannel] = useState("");
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);

  function connectGoogle() {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: "Authenticating with Google Calendar API...",
        success: () => {
          setGoogleConnected(true);
          return "Google Calendar linked! Schedule events will now automatically sync.";
        },
        error: "Failed to connect Google Calendar",
      }
    );
  }

  function handleSaveSlack(e: React.FormEvent) {
    e.preventDefault();
    if (!slackWebhook) {
      toast.error("Please enter a valid webhook or bot token");
      return;
    }
    setSlackConnected(true);
    setIsSlackModalOpen(false);
    toast.success(`Connected Slack workspace! Monitoring channel: ${slackChannel || "#general"}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">Integrations & Automations</h1>
        <p className="mt-1 text-sm text-muted-foreground">Connect your external school tools to consolidate course schedules and assignments.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Google Calendar */}
        <div className="flex flex-col justify-between rounded-lg border bg-background p-6 shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                <CalendarDays className="h-6 w-6" />
              </span>
              {googleConnected && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> Connected
                </span>
              )}
            </div>
            <h3 className="mt-4 text-lg font-bold">Google Calendar</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Sync your class schedule and academic timetables directly into your unified dashboard.
            </p>
          </div>
          <div className="mt-6">
            {googleConnected ? (
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setGoogleConnected(false)}>
                Disconnect Calendar
              </Button>
            ) : (
              <Button variant="cta" size="sm" className="w-full text-xs" onClick={connectGoogle}>
                Connect Google Calendar
              </Button>
            )}
          </div>
        </div>

        {/* Slack Integration */}
        <div className="flex flex-col justify-between rounded-lg border bg-background p-6 shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-purple-50 text-purple-600">
                <Hash className="h-6 w-6" />
              </span>
              {slackConnected && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> Connected
                </span>
              )}
            </div>
            <h3 className="mt-4 text-lg font-bold">Slack Sync</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Read course announcements from class channels and automatically extract readings and assignment deadlines.
            </p>
          </div>
          <div className="mt-6">
            {slackConnected ? (
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setSlackConnected(false)}>
                Disconnect Slack
              </Button>
            ) : (
              <Dialog open={isSlackModalOpen} onOpenChange={setIsSlackModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="cta" size="sm" className="w-full text-xs">
                    Configure Slack App
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configure Slack Integration</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveSlack} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Slack Incoming Webhook / Bot Token</Label>
                      <Input 
                        placeholder="https://hooks.slack.com/services/... or xoxb-..." 
                        value={slackWebhook}
                        onChange={(e) => setSlackWebhook(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Default Announcement Channel</Label>
                      <Input 
                        placeholder="#announcements or #course-updates" 
                        value={slackChannel}
                        onChange={(e) => setSlackChannel(e.target.value)}
                      />
                    </div>
                    <Button type="submit" variant="cta" className="w-full">
                      Link Workspace Channel
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* AI Planner */}
        <div className="flex flex-col justify-between rounded-lg border bg-background p-6 shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                <Sparkles className="h-6 w-6" />
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                Active
              </span>
            </div>
            <h3 className="mt-4 text-lg font-bold">AI Extraction & Planner</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Automatically prioritizes your daily study queue by weighting deadline proximity and course credits.
            </p>
          </div>
          <div className="mt-6">
            <Button 
              variant={aiEnabled ? "outline" : "cta"} 
              size="sm" 
              className="w-full text-xs" 
              onClick={() => {
                setAiEnabled(!aiEnabled);
                toast.success(`AI daily planner ${!aiEnabled ? "activated" : "paused"}`);
              }}
            >
              {aiEnabled ? "Planner Enabled" : "Enable Planner"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
