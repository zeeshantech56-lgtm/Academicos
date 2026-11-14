import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  CalendarDays, 
  Hash, 
  Sparkles, 
  Check, 
  RefreshCw, 
  Zap, 
  CheckCircle2 
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
  syncRealGoogleCalendar, 
  syncRealSlack 
} from "@/lib/autoSync";

export const Route = createFileRoute("/app/integrations")({ component: Integrations });

interface IntegrationConfig {
  slackBotToken?: string;
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
    slackBotToken: "",
    slackConnected: false,
    googleConnected: false,
    googleEmail: "",
    googleAccessToken: "",
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
    slackBotToken: "",
    slackConnected: false,
    googleConnected: false,
    googleEmail: "",
    googleAccessToken: "",
    aiEnabled: true,
  });

  const [slackBotTokenInput, setSlackBotTokenInput] = useState("");
  const [isSlackModalOpen, setIsSlackModalOpen] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      const cached = getLocalConfig(user.uid);
      setConfig(cached);
      setSlackBotTokenInput(cached.slackBotToken || "");

      try {
        const snap = await getDoc(doc(db, "integrations", user.uid));
        if (snap.exists()) {
          const remote = snap.data() as IntegrationConfig;
          const merged = { ...cached, ...remote };
          setConfig(merged);
          setLocalConfig(user.uid, merged);
          setSlackBotTokenInput(merged.slackBotToken || "");
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

      toast.success(`Google Calendar connected for ${email}!`);

      if (accessToken) {
        toast.loading("Fetching your classes and schedule from Google Calendar...");
        try {
          const res = await syncRealGoogleCalendar(accessToken);
          toast.dismiss();
          toast.success(`Imported ${res.events} calendar events and ${res.tasks} academic tasks!`);
        } catch (calErr: any) {
          toast.dismiss();
          toast.error("Google Calendar fetch error: " + calErr.message);
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/popup-closed-by-user") {
        toast.info("Google authentication was closed.");
      } else {
        toast.error("Failed to authenticate Google: " + err.message);
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
    const token = slackBotTokenInput.trim();
    if (!token) {
      toast.error("Please enter your Slack Bot User OAuth Token.");
      return;
    }

    if (!token.startsWith("xoxb-")) {
      toast.error("Invalid token. Slack Bot User tokens start with 'xoxb-'. You can find it in your Slack App under OAuth & Permissions.");
      return;
    }

    await saveConfig({
      slackBotToken: token,
      slackConnected: true,
    });

    setIsSlackModalOpen(false);
    toast.loading("Importing Slack channels as Subjects & scanning messages...");

    try {
      const res = await syncRealSlack(token);
      toast.dismiss();
      toast.success(`Done! Imported ${res.subjects} courses as Subjects and ${res.tasks} assignments/readings directly from Slack.`);
    } catch (err: any) {
      toast.dismiss();
      toast.error("Slack sync error: " + err.message);
    }
  }

  async function disconnectSlack() {
    await saveConfig({
      slackConnected: false,
      slackBotToken: "",
    });
    setSlackBotTokenInput("");
    toast.info("Slack disconnected.");
  }

  // One-click live sync from real Google Calendar & real Slack
  async function handleSyncAll() {
    setSyncingAll(true);
    setLastSyncResult(null);

    let summaryParts: string[] = [];

    // 1. Sync real Slack channels into Subjects and Tasks
    if (config.slackConnected && config.slackBotToken) {
      try {
        const sRes = await syncRealSlack(config.slackBotToken);
        summaryParts.push(`${sRes.subjects} courses as Subjects`);
        if (sRes.tasks > 0) {
          summaryParts.push(`${sRes.tasks} tasks from Slack`);
        }
      } catch (e: any) {
        toast.error("Slack sync: " + e.message);
      }
    } else {
      toast.info("Slack is not connected yet. Add your Slack Bot Token to read channels.");
    }

    // 2. Sync real Google Calendar into Schedule and Dashboard
    if (config.googleConnected) {
      if (config.googleAccessToken) {
        try {
          const gRes = await syncRealGoogleCalendar(config.googleAccessToken);
          summaryParts.push(`${gRes.events} classes & events from Google Calendar`);
          if (gRes.tasks > 0) {
            summaryParts.push(`${gRes.tasks} readings/tasks`);
          }
        } catch (e: any) {
          toast.error("Google Calendar sync: " + e.message);
        }
      } else {
        toast.info("Click 'Connect Google Calendar' again to refresh your calendar token.");
      }
    } else {
      toast.info("Google Calendar is not connected yet.");
    }

    setSyncingAll(false);

    if (summaryParts.length > 0) {
      const summary = `Live sync complete: Imported ${summaryParts.join(", ")}!`;
      setLastSyncResult(summary);
      toast.success(summary);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Integrations & Automations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Direct sync connecting your real Slack channels (as Subjects) and Google Calendar events (as Schedule &amp; Tasks).</p>
        </div>

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
          {syncingAll ? "Syncing Real Data..." : "⚡ Sync All Real Slack & Calendar Data"}
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

      {/* Info Card */}
      <div className="rounded-xl border bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-bold">Cross-Platform Sync Rules</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span><strong>Slack Channels → Subjects:</strong> Channels like <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">consumer-behavior</code> and <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">business-finance</code> are automatically imported as formatted academic Subjects.</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <span><strong>Google Calendar → Schedule &amp; Readings:</strong> Classes like <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">Consumer Behavior</code> and <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">Design Thinking</code> appear in your timetable, and events like <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">Book Reading</code> automatically become items in your Readings &amp; Priorities!</span>
          </li>
        </ul>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
              Directly queries your primary Google Calendar (Book Reading, Consumer Behavior, Design Thinking, etc.).
            </p>
            {config.googleConnected && (
              <p className="mt-3 text-xs text-muted-foreground font-medium">
                Active: <span className="text-foreground">{config.googleEmail || "Connected"}</span>
              </p>
            )}
          </div>
          <div className="mt-6 flex gap-2">
            {config.googleConnected ? (
              <>
                <Button 
                  variant="cta" 
                  size="sm" 
                  className="flex-1 text-xs" 
                  onClick={async () => {
                    if (config.googleAccessToken) {
                      toast.loading("Fetching Google Calendar events...");
                      try {
                        const r = await syncRealGoogleCalendar(config.googleAccessToken);
                        toast.dismiss();
                        toast.success(`Imported ${r.events} schedule events & ${r.tasks} reading tasks!`);
                      } catch (err: any) {
                        toast.dismiss();
                        toast.error("Fetch error: " + err.message);
                      }
                    } else {
                      connectGoogle();
                    }
                  }}
                >
                  Sync Events Now
                </Button>
                <Button variant="outline" size="sm" className="text-xs text-red-600 hover:text-red-700" onClick={disconnectGoogle}>
                  Disconnect
                </Button>
              </>
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
            <h3 className="mt-4 text-lg font-bold">Slack Workspace</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Fetches course channels from your real Crucible workspace and links them as Subjects.
            </p>
            {config.slackConnected && (
              <p className="mt-3 text-xs text-muted-foreground font-medium">
                Status: <span className="text-foreground font-semibold text-emerald-600">Bot Connected</span>
              </p>
            )}
          </div>
          <div className="mt-6 flex gap-2">
            {config.slackConnected ? (
              <>
                <Button 
                  variant="cta" 
                  size="sm" 
                  className="flex-1 text-xs" 
                  onClick={async () => {
                    if (config.slackBotToken) {
                      toast.loading("Fetching real channels from Slack...");
                      try {
                        const r = await syncRealSlack(config.slackBotToken);
                        toast.dismiss();
                        toast.success(`Imported ${r.subjects} channels as Subjects & ${r.tasks} tasks!`);
                      } catch (err: any) {
                        toast.dismiss();
                        toast.error("Fetch error: " + err.message);
                      }
                    }
                  }}
                >
                  Sync Slack Channels
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setIsSlackModalOpen(true)}>
                  Change Token
                </Button>
                <Button variant="ghost" size="sm" className="text-xs text-red-600 hover:text-red-700" onClick={disconnectSlack}>
                  Disconnect
                </Button>
              </>
            ) : (
              <Button variant="cta" size="sm" className="w-full text-xs" onClick={() => setIsSlackModalOpen(true)}>
                Connect Slack with Bot Token
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Slack Bot Token Modal */}
      <Dialog open={isSlackModalOpen} onOpenChange={setIsSlackModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Slack Workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSlack} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Slack Bot User OAuth Token</Label>
              <Input 
                placeholder="xoxb-your-token-here..." 
                value={slackBotTokenInput}
                onChange={(e) => setSlackBotTokenInput(e.target.value)}
                required
              />
              <p className="text-[12px] text-muted-foreground mt-1">
                Your Bot User OAuth Token starts with <code className="text-xs bg-muted px-1 rounded">xoxb-</code>.
              </p>
            </div>
            <Button type="submit" variant="cta" className="w-full">
              Connect &amp; Fetch Real Slack Channels
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
