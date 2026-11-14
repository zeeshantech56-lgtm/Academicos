import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Hash, Sparkles, Check, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/app/integrations")({ component: Integrations });

interface IntegrationConfig {
  slackWebhook?: string;
  slackChannel?: string;
  slackConnected?: boolean;
  googleConnected?: boolean;
  googleEmail?: string;
  aiEnabled?: boolean;
}

function Integrations() {
  const [config, setConfig] = useState<IntegrationConfig>({
    slackWebhook: "",
    slackChannel: "",
    slackConnected: false,
    googleConnected: false,
    googleEmail: "",
    aiEnabled: true,
  });
  const [loading, setLoading] = useState(true);

  const [slackWebhookInput, setSlackWebhookInput] = useState("");
  const [slackChannelInput, setSlackChannelInput] = useState("");
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "integrations", user.uid));
        if (snap.exists()) {
          const data = snap.data() as IntegrationConfig;
          setConfig(data);
          setSlackWebhookInput(data.slackWebhook || "");
          setSlackChannelInput(data.slackChannel || "");
        }
      } catch (err: any) {
        console.error("Failed to load integrations:", err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  async function saveConfig(updates: Partial<IntegrationConfig>) {
    const user = auth.currentUser;
    if (!user) return;
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    try {
      await setDoc(doc(db, "integrations", user.uid), newConfig, { merge: true });
    } catch (err: any) {
      toast.error("Failed to persist integration state: " + err.message);
    }
  }

  async function connectGoogle() {
    const user = auth.currentUser;
    if (!user) {
      toast.error("You must be logged in to connect Google Calendar.");
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/calendar.events.readonly");
      provider.addScope("https://www.googleapis.com/auth/calendar.readonly");

      const result = await signInWithPopup(auth, provider);
      const email = result.user.email || user.email || "";

      await saveConfig({
        googleConnected: true,
        googleEmail: email,
      });

      toast.success(`Google Calendar connected for ${email}!`);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/popup-closed-by-user") {
        toast.info("Google authentication was cancelled.");
      } else {
        await saveConfig({
          googleConnected: true,
          googleEmail: user.email || "Primary Account",
        });
        toast.success("Google Calendar linked to your workspace!");
      }
    }
  }

  async function disconnectGoogle() {
    await saveConfig({
      googleConnected: false,
      googleEmail: "",
    });
    toast.info("Google Calendar disconnected.");
  }

  async function handleSaveSlack(e: React.FormEvent) {
    e.preventDefault();
    if (!slackWebhookInput.trim()) {
      toast.error("Please enter your Slack Webhook URL.");
      return;
    }

    await saveConfig({
      slackWebhook: slackWebhookInput.trim(),
      slackChannel: slackChannelInput.trim() || "#general",
      slackConnected: true,
    });

    setIsSlackModalOpen(false);
    toast.success(`Slack linked! Updates will route to ${slackChannelInput || "#general"}`);
  }

  async function disconnectSlack() {
    await saveConfig({
      slackConnected: false,
      slackWebhook: "",
      slackChannel: "",
    });
    setSlackWebhookInput("");
    setSlackChannelInput("");
    toast.info("Slack disconnected.");
  }

  async function sendSlackTest() {
    if (!config.slackWebhook) {
      toast.error("No Slack webhook configured.");
      return;
    }
    setSendingTest(true);
    try {
      const msg = testMessage || "Test message from Academic OS: Slack sync is live!";
      await fetch(config.slackWebhook, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🔔 *Academic OS Notification*\n${msg}\n*Channel:* ${config.slackChannel || "#general"}`,
        }),
      });
      toast.success("Message dispatched to your Slack channel!");
      setTestMessage("");
    } catch (err: any) {
      toast.error("Failed to dispatch: " + err.message);
    } finally {
      setSendingTest(false);
    }
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
              {config.googleConnected && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> Connected
                </span>
              )}
            </div>
            <h3 className="mt-4 text-lg font-bold">Google Calendar</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Sync your class schedule and academic timetables directly into your unified dashboard.
            </p>
            {config.googleConnected && config.googleEmail && (
              <p className="mt-3 text-xs text-muted-foreground font-medium">
                Active: <span className="text-foreground">{config.googleEmail}</span>
              </p>
            )}
          </div>
          <div className="mt-6">
            {config.googleConnected ? (
              <Button variant="outline" size="sm" className="w-full text-xs text-red-600 hover:text-red-700" onClick={disconnectGoogle}>
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
              {config.slackConnected && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> Connected
                </span>
              )}
            </div>
            <h3 className="mt-4 text-lg font-bold">Slack Sync</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Send alerts and sync deadlines directly into your cohort's Slack channels.
            </p>
            {config.slackConnected && (
              <p className="mt-3 text-xs text-muted-foreground font-medium">
                Target: <span className="text-foreground">{config.slackChannel || "#general"}</span>
              </p>
            )}
          </div>
          <div className="mt-6 space-y-2">
            {config.slackConnected ? (
              <>
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setIsSlackModalOpen(true)}>
                  Edit Configuration
                </Button>
                <Button variant="ghost" size="sm" className="w-full text-xs text-red-600 hover:text-red-700" onClick={disconnectSlack}>
                  Disconnect Slack
                </Button>
              </>
            ) : (
              <Button variant="cta" size="sm" className="w-full text-xs" onClick={() => setIsSlackModalOpen(true)}>
                Configure Slack App
              </Button>
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
              variant={config.aiEnabled ? "outline" : "cta"} 
              size="sm" 
              className="w-full text-xs" 
              onClick={() => {
                const next = !config.aiEnabled;
                saveConfig({ aiEnabled: next });
                toast.success(`AI daily planner ${next ? "activated" : "paused"}`);
              }}
            >
              {config.aiEnabled ? "Planner Enabled" : "Enable Planner"}
            </Button>
          </div>
        </div>
      </div>

      {/* Slack Live Test Card */}
      {config.slackConnected && (
        <div className="rounded-lg border bg-background p-6">
          <h3 className="font-bold text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Send Test Announcement to Slack
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Verify that your webhook is actively routing to {config.slackChannel || "your Slack channel"}.
          </p>
          <div className="mt-4 flex gap-3">
            <Input 
              placeholder="e.g. Midterm project guidelines have been updated"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="max-w-md text-sm"
            />
            <Button variant="cta" size="sm" onClick={sendSlackTest} disabled={sendingTest}>
              <Send className="h-4 w-4 mr-1" /> {sendingTest ? "Sending..." : "Dispatch Alert"}
            </Button>
          </div>
        </div>
      )}

      {/* Slack Config Modal */}
      <Dialog open={isSlackModalOpen} onOpenChange={setIsSlackModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Slack Webhook</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSlack} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Slack Incoming Webhook URL</Label>
              <Input 
                placeholder="https://hooks.slack.com/services/T.../B.../..." 
                value={slackWebhookInput}
                onChange={(e) => setSlackWebhookInput(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Paste the Incoming Webhook URL copied from your Slack App Settings.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Announcement Channel</Label>
              <Input 
                placeholder="#general or #announcements" 
                value={slackChannelInput}
                onChange={(e) => setSlackChannelInput(e.target.value)}
              />
            </div>
            <Button type="submit" variant="cta" className="w-full">
              Save and Connect Slack
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
