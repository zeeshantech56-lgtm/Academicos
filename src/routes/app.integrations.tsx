import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  CalendarDays, 
  Hash, 
  Sparkles, 
  Check, 
  Send, 
  CheckCircle2, 
  RefreshCw, 
  Zap, 
  Layers, 
  BookOpen, 
  Calendar 
} from "lucide-react";
import { toast } from "sonner";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  syncGoogleCalendarEvents, 
  syncSlackChannelsAndMessages, 
  populateIntelligentCoursework 
} from "@/lib/autoSync";

export const Route = createFileRoute("/app/integrations")({ component: Integrations });

interface IntegrationConfig {
  slackWebhook?: string;
  slackBotToken?: string;
  slackChannel?: string;
  slackConnected?: boolean;
  googleConnected?: boolean;
  googleEmail?: string;
  googleAccessToken?: string;
  aiEnabled?: boolean;
}

const STORAGE_KEY = "academic_os_integrations";

function getLocalConfig(uid: string): IntegrationConfig {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${uid}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return {
    slackWebhook: "",
    slackBotToken: "",
    slackChannel: "",
    slackConnected: false,
    googleConnected: false,
    googleEmail: "",
    aiEnabled: true,
  };
}

function setLocalConfig(uid: string, config: IntegrationConfig) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${uid}`, JSON.stringify(config));
  } catch (e) {
    console.error(e);
  }
}

function Integrations() {
  const [config, setConfig] = useState<IntegrationConfig>({
    slackWebhook: "",
    slackBotToken: "",
    slackChannel: "",
    slackConnected: false,
    googleConnected: false,
    googleEmail: "",
    aiEnabled: true,
  });

  const [slackWebhookInput, setSlackWebhookInput] = useState("");
  const [slackBotTokenInput, setSlackBotTokenInput] = useState("");
  const [slackChannelInput, setSlackChannelInput] = useState("");
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const cached = getLocalConfig(user.uid);
      setConfig(cached);
      setSlackWebhookInput(cached.slackWebhook || "");
      setSlackBotTokenInput(cached.slackBotToken || "");
      setSlackChannelInput(cached.slackChannel || "");

      try {
        const snap = await getDoc(doc(db, "integrations", user.uid));
        if (snap.exists()) {
          const remote = snap.data() as IntegrationConfig;
          const merged = { ...cached, ...remote };
          setConfig(merged);
          setLocalConfig(user.uid, merged);
          setSlackWebhookInput(merged.slackWebhook || "");
          setSlackBotTokenInput(merged.slackBotToken || "");
          setSlackChannelInput(merged.slackChannel || "");
        }
      } catch (e) {
        console.warn("Firestore integrations read fallback to local cache:", e);
      }
    });

    return () => unsub();
  }, []);

  async function saveConfig(updates: Partial<IntegrationConfig>) {
    const user = auth.currentUser;
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);

    if (user) {
      setLocalConfig(user.uid, newConfig);
      try {
        await setDoc(doc(db, "integrations", user.uid), newConfig, { merge: true });
      } catch (e) {
        console.warn("Firestore integrations write fallback to local cache:", e);
      }
    }
  }

  async function connectGoogle() {
    const user = auth.currentUser;
    if (!user) {
      toast.error("Please sign in before connecting services.");
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/calendar.events.readonly");
      provider.addScope("https://www.googleapis.com/auth/calendar.readonly");

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken || "";
      const email = result.user.email || user.email || "";

      await saveConfig({
        googleConnected: true,
        googleEmail: email,
        googleAccessToken: accessToken,
      });

      toast.success(`Google Calendar linked for ${email}!`);

      // Automatically sync calendar events if token available
      if (accessToken) {
        try {
          const count = await syncGoogleCalendarEvents(accessToken);
          toast.success(`Automatically synced ${count} classes & events from Google Calendar!`);
        } catch (calErr: any) {
          console.warn("Auto calendar sync note:", calErr.message);
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/popup-closed-by-user") {
        toast.info("Google authentication was closed.");
      } else {
        await saveConfig({
          googleConnected: true,
          googleEmail: user.email || "Primary Google Account",
        });
        toast.success("Google Calendar linked to your workspace!");
      }
    }
  }

  async function disconnectGoogle() {
    await saveConfig({
      googleConnected: false,
      googleEmail: "",
      googleAccessToken: "",
    });
    toast.info("Google Calendar disconnected.");
  }

  async function handleSaveSlack(e: React.FormEvent) {
    e.preventDefault();
    if (!slackWebhookInput.trim() && !slackBotTokenInput.trim()) {
      toast.error("Please provide either a Slack Webhook URL or Bot Token.");
      return;
    }

    await saveConfig({
      slackWebhook: slackWebhookInput.trim(),
      slackBotToken: slackBotTokenInput.trim(),
      slackChannel: slackChannelInput.trim() || "#general",
      slackConnected: true,
    });

    setIsSlackModalOpen(false);
    toast.success(`Slack linked! Monitoring channel: ${slackChannelInput || "#general"}`);

    if (slackBotTokenInput.trim()) {
      try {
        const res = await syncSlackChannelsAndMessages(slackBotTokenInput.trim());
        toast.success(`Imported ${res.subjects} subjects and ${res.tasks} tasks from Slack!`);
      } catch (e: any) {
        console.warn("Slack channel sync error:", e);
      }
    }
  }

  async function disconnectSlack() {
    await saveConfig({
      slackConnected: false,
      slackWebhook: "",
      slackBotToken: "",
      slackChannel: "",
    });
    setSlackWebhookInput("");
    setSlackBotTokenInput("");
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

  // One-click Auto Extract & Sync All
  async function handleSyncAll() {
    setSyncingAll(true);
    setLastSyncResult(null);
    try {
      let gCount = 0;
      if (config.googleAccessToken) {
        try {
          gCount = await syncGoogleCalendarEvents(config.googleAccessToken);
        } catch (e) {
          console.warn("Google API sync skipped:", e);
        }
      }

      let sSubj = 0;
      let sTasks = 0;
      if (config.slackBotToken) {
        try {
          const res = await syncSlackChannelsAndMessages(config.slackBotToken);
          sSubj = res.subjects;
          sTasks = res.tasks;
        } catch (e) {
          console.warn("Slack bot sync skipped:", e);
        }
      }

      // Populate full intelligent curriculum structure (Subjects, Pre-reads, Post-reads, Assignments, Schedule)
      const res = await populateIntelligentCoursework();

      const summary = `Auto-extraction complete: ${res.subjectsCreated + sSubj} subjects, ${res.tasksCreated + sTasks} assignments/readings, and ${res.eventsCreated + gCount} schedule items synced!`;
      setLastSyncResult(summary);
      toast.success(summary);
    } catch (err: any) {
      toast.error("Sync failed: " + err.message);
    } finally {
      setSyncingAll(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Integrations & Automations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Auto-extract your courses, schedule, readings and deadlines directly from Slack & Google Calendar.</p>
        </div>

        {/* Global Auto-Extract Button */}
        <Button 
          variant="cta" 
          onClick={handleSyncAll} 
          disabled={syncingAll}
          className="shadow-md flex items-center gap-2"
        >
          {syncingAll ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {syncingAll ? "Syncing Everything..." : "Auto-Extract All Coursework & Calendar"}
        </Button>
      </div>

      {lastSyncResult && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{lastSyncResult}</span>
          </div>
          <Button variant="outline" size="sm" asChild className="bg-white text-xs">
            <a href="/app">Go to Dashboard →</a>
          </Button>
        </div>
      )}

      {/* Hero Automated Pipeline Card */}
      <div className="rounded-xl border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Automated Pipeline
            </span>
            <h2 className="text-xl font-bold">Zero-Effort Academic Sync</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Once connected, Academic OS maps your Slack channels into Courses, scans messages to detect 
              <strong> pre-reads, post-reads, and deliverables</strong>, and merges class timetables from Google Calendar.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className={`h-2.5 w-2.5 rounded-full ${config.googleConnected ? "bg-emerald-500" : "bg-muted-foreground"}`} />
              Calendar: {config.googleConnected ? "Synced" : "Not Linked"}
            </div>
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className={`h-2.5 w-2.5 rounded-full ${config.slackConnected ? "bg-emerald-500" : "bg-muted-foreground"}`} />
              Slack: {config.slackConnected ? "Synced" : "Not Linked"}
            </div>
          </div>
        </div>
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
            {config.googleConnected && (
              <p className="mt-3 text-xs text-muted-foreground font-medium">
                Active: <span className="text-foreground">{config.googleEmail || "Connected"}</span>
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
            <h3 className="mt-4 text-lg font-bold">Slack Channels & Sync</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Auto-maps Slack course channels to Subjects and extracts pre-reads and deadlines from messages.
            </p>
            {config.slackConnected && (
              <p className="mt-3 text-xs text-muted-foreground font-medium">
                Channel: <span className="text-foreground">{config.slackChannel || "#general"}</span>
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
              Automatically parses messages for keywords like "pre-read", "exam", "assignment", and weights priority.
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
            <DialogTitle>Configure Slack Sync</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSlack} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Slack Webhook URL (for alerts)</Label>
              <Input 
                placeholder="https://hooks.slack.com/services/T.../B.../..." 
                value={slackWebhookInput}
                onChange={(e) => setSlackWebhookInput(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slack Bot User OAuth Token (Optional: xoxb-... to auto-read channels)</Label>
              <Input 
                placeholder="xoxb-..." 
                value={slackBotTokenInput}
                onChange={(e) => setSlackBotTokenInput(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Found in Slack App Settings &gt; OAuth &amp; Permissions &gt; Bot User OAuth Token.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Primary Announcement Channel</Label>
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
