import { auth, db } from "@/lib/firebase";
import { collection, getDocs, query, where, addDoc } from "firebase/firestore";

export interface SyncResult {
  subjectsCreated: number;
  tasksCreated: number;
  eventsCreated: number;
  details: string[];
}

// Channels to exclude from academic subjects (noise / administrative)
const NON_SUBJECT_CHANNELS = new Set([
  "social",
  "request-time-off",
  "new-channel",
  "clubs-at-crucible",
  "daadi-maa-ke-nuske",
  "library-ledger",
  "all-crucible",
  "pg",
]);

// Map Slack channel name to clean academic Subject Name & Code
export function cleanSubjectName(channelName: string): { name: string; code: string } {
  const words = channelName.split(/[-_]/).filter(Boolean);
  const formatted = words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  const code = words
    .map(w => w.charAt(0).toUpperCase())
    .join("")
    .slice(0, 4) + "-101";

  return { name: formatted, code };
}

// AI parser for academic keywords in Slack messages
export function parseAcademicMessage(text: string): {
  kind: "assignment" | "pre_read" | "post_read" | "announcement";
  title: string;
  notes: string;
  due_at: string | null;
  priority: "high" | "medium" | "low";
} {
  const lower = text.toLowerCase();
  
  let kind: "assignment" | "pre_read" | "post_read" | "announcement" = "assignment";
  if (lower.includes("pre-read") || lower.includes("pre read") || lower.includes("reading for class") || lower.includes("before class") || lower.includes("read chapter")) {
    kind = "pre_read";
  } else if (lower.includes("post-read") || lower.includes("post read") || lower.includes("recap") || lower.includes("supplementary")) {
    kind = "post_read";
  } else if (lower.includes("announcement") || lower.includes("note:") || lower.includes("fyi")) {
    kind = "announcement";
  }

  let priority: "high" | "medium" | "low" = "medium";
  if (lower.includes("urgent") || lower.includes("exam") || lower.includes("graded") || lower.includes("final submission") || lower.includes("asap") || lower.includes("deadline")) {
    priority = "high";
  } else if (lower.includes("optional") || lower.includes("extra") || lower.includes("fyi")) {
    priority = "low";
  }

  let due_at: string | null = null;
  const now = new Date();
  if (lower.includes("tomorrow")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(kind === "pre_read" ? 9 : 23, 59, 0, 0);
    due_at = d.toISOString();
  } else if (lower.includes("tonight") || lower.includes("today")) {
    const d = new Date(now);
    d.setHours(23, 59, 0, 0);
    due_at = d.toISOString();
  } else {
    const d = new Date(now);
    d.setDate(d.getDate() + (kind === "pre_read" ? 1 : 3));
    d.setHours(kind === "pre_read" ? 9 : 23, 59, 0, 0);
    due_at = d.toISOString();
  }

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let title = lines[0] || text.substring(0, 70);
  if (title.length > 80) {
    title = title.substring(0, 77) + "...";
  }

  return {
    kind,
    title,
    notes: text,
    due_at,
    priority,
  };
}

// Call Slack API through the serverless proxy
async function callSlackApi(endpoint: string, token: string, params: Record<string, any> = {}) {
  const res = await fetch("/api/slack-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint, token, params }),
  });
  if (!res.ok) {
    const url = new URL(`https://slack.com/api/${endpoint}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, String(v)));
    const direct = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await direct.json();
  }
  return await res.json();
}

// 1. REAL SLACK SYNC:
// - Imports Slack Channels as Academic Subjects (skipping non-academic ones)
// - Attempts to auto-join public channels and read messages for pre-reads & assignments
export async function syncRealSlack(botToken: string): Promise<{ subjects: number; tasks: number }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in first");
  if (!botToken || !botToken.startsWith("xoxb-")) {
    throw new Error("Invalid Slack Bot Token. Must start with 'xoxb-'.");
  }

  // Fetch all channels
  const listData = await callSlackApi("conversations.list", botToken, {
    types: "public_channel,private_channel",
  });

  if (!listData.ok) {
    throw new Error(`Slack API error: ${listData.error || "Unable to list channels"}`);
  }

  const existingSubjSnap = await getDocs(query(collection(db, "subjects"), where("user_id", "==", user.uid)));
  const subjectMap = new Map<string, string>(); // name.toLowerCase() -> id
  existingSubjSnap.docs.forEach(d => {
    subjectMap.set(d.data().name.toLowerCase(), d.id);
  });

  const existingTaskSnap = await getDocs(query(collection(db, "tasks"), where("user_id", "==", user.uid)));
  const existingTasks = new Set(existingTaskSnap.docs.map(d => d.data().title));

  const colors = ["blue", "red", "lavender", "periwinkle", "navy"];
  let colorIndex = existingSubjSnap.size;

  let createdSubjects = 0;
  let createdTasks = 0;

  for (const ch of (listData.channels || [])) {
    if (ch.is_archived) continue;
    if (NON_SUBJECT_CHANNELS.has(ch.name.toLowerCase())) continue;

    const { name: subjectName, code: subjectCode } = cleanSubjectName(ch.name);
    let subjectId = subjectMap.get(subjectName.toLowerCase());

    // 1. Create subject if not exists
    if (!subjectId) {
      const docRef = await addDoc(collection(db, "subjects"), {
        user_id: user.uid,
        name: subjectName,
        code: subjectCode,
        faculty: null,
        color: colors[colorIndex % colors.length],
        created_at: new Date().toISOString(),
      });
      subjectId = docRef.id;
      subjectMap.set(subjectName.toLowerCase(), subjectId);
      createdSubjects++;
      colorIndex++;
    }

    // 2. Try to read messages from the channel
    try {
      // First attempt to join channel if bot is not a member
      if (!ch.is_member) {
        await callSlackApi("conversations.join", botToken, { channel: ch.id }).catch(() => {});
      }

      const histData = await callSlackApi("conversations.history", botToken, {
        channel: ch.id,
        limit: 25,
      });

      if (histData.ok && Array.isArray(histData.messages)) {
        for (const msg of histData.messages) {
          if (!msg.text || msg.subtype) continue;

          const lower = msg.text.toLowerCase();
          const isAcademic = lower.includes("read") || lower.includes("assignment") || lower.includes("submission") || 
                             lower.includes("due") || lower.includes("homework") || lower.includes("exam") || 
                             lower.includes("case") || lower.includes("problem set") || lower.includes("project") ||
                             lower.includes("presentation") || lower.includes("quiz");

          if (!isAcademic) continue;

          const parsed = parseAcademicMessage(msg.text);
          if (!existingTasks.has(parsed.title)) {
            await addDoc(collection(db, "tasks"), {
              user_id: user.uid,
              subject_id: subjectId,
              title: parsed.title,
              notes: parsed.notes,
              kind: parsed.kind,
              priority: parsed.priority,
              status: "todo",
              source: `Slack (#${ch.name})`,
              due_at: parsed.due_at,
              created_at: new Date().toISOString(),
            });
            existingTasks.add(parsed.title);
            createdTasks++;
          }
        }
      }
    } catch (e) {
      console.warn(`Could not read messages from #${ch.name}:`, e);
    }
  }

  return { subjects: createdSubjects, tasks: createdTasks };
}

// 2. REAL GOOGLE CALENDAR SYNC WITH AUTOMATIC SUBJECT LINKING & TASK CONVERSION
export async function syncRealGoogleCalendar(accessToken: string): Promise<{ events: number; tasks: number }> {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  if (!accessToken) throw new Error("Google access token missing. Please click 'Connect Google Calendar' first.");

  // Fetch both single events and expanded recurring classes for the upcoming 60 days
  const timeMin = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
  
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=100`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Google Calendar API error ${res.status}`);
  }

  const data = await res.json();
  const items = data.items || [];

  // Load existing subjects so we can link calendar events and tasks directly to the right subject
  const existingSubjSnap = await getDocs(query(collection(db, "subjects"), where("user_id", "==", user.uid)));
  const subjectsList = existingSubjSnap.docs.map(d => ({ id: d.id, name: d.data().name as string }));

  // Existing calendar events in Firestore for deduplication
  const existingEventSnap = await getDocs(query(collection(db, "calendar_events"), where("user_id", "==", user.uid)));
  const existingTitles = new Set(existingEventSnap.docs.map(d => `${d.data().title}_${d.data().start_at}`));

  // Existing tasks for deduplication
  const existingTaskSnap = await getDocs(query(collection(db, "tasks"), where("user_id", "==", user.uid)));
  const existingTasks = new Set(existingTaskSnap.docs.map(d => d.data().title));

  let addedEvents = 0;
  let addedTasks = 0;

  for (const item of items) {
    const summary = item.summary?.trim() || "Scheduled Class";
    const start = item.start?.dateTime || item.start?.date || new Date().toISOString();
    const end = item.end?.dateTime || item.end?.date || start;
    const location = item.location || item.hangoutLink || null;
    const description = item.description || "";

    const dedupKey = `${summary}_${start}`;
    if (existingTitles.has(dedupKey)) continue;

    // Detect type based on summary
    const lower = summary.toLowerCase();
    let type: "class" | "exam" | "deadline" | "meeting" = "class";
    if (lower.includes("exam") || lower.includes("quiz") || lower.includes("test") || lower.includes("midterm") || lower.includes("final")) {
      type = "exam";
    } else if (lower.includes("due") || lower.includes("submission") || lower.includes("deadline") || lower.includes("assignment")) {
      type = "deadline";
    } else if (lower.includes("meeting") || lower.includes("sync") || lower.includes("break") || lower.includes("lunch")) {
      type = "meeting";
    }

    // Match calendar item with an existing Subject
    let matchedSubjectId: string | null = null;
    for (const s of subjectsList) {
      const sLower = s.name.toLowerCase();
      // Check if event title contains subject name or words (e.g. "Consumer Behavior", "Simulation - Data" -> "Intro To Data")
      if (lower.includes(sLower) || sLower.split(" ").some(w => w.length > 3 && lower.includes(w))) {
        matchedSubjectId = s.id;
        break;
      }
    }

    // Save to Calendar Events collection
    await addDoc(collection(db, "calendar_events"), {
      user_id: user.uid,
      subject_id: matchedSubjectId,
      title: summary,
      start_at: start,
      end_at: end,
      location,
      type,
    });
    existingTitles.add(dedupKey);
    addedEvents++;

    // If the calendar event represents a Reading, Assignment, or Exam, also auto-create a Task on the Dashboard!
    const isBookReading = lower.includes("reading") || lower.includes("book reading") || lower.includes("pre-read");
    const isSubmission = type === "deadline" || lower.includes("submission") || lower.includes("due");
    const isExam = type === "exam";

    if ((isBookReading || isSubmission || isExam) && !existingTasks.has(summary)) {
      await addDoc(collection(db, "tasks"), {
        user_id: user.uid,
        subject_id: matchedSubjectId,
        title: summary,
        notes: description || `Synced from Google Calendar (${new Date(start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
        kind: isBookReading ? "pre_read" : "assignment",
        priority: isExam || isSubmission ? "high" : "medium",
        status: "todo",
        source: "Google Calendar",
        due_at: start,
        created_at: new Date().toISOString(),
      });
      existingTasks.add(summary);
      addedTasks++;
    }
  }

  return { events: addedEvents, tasks: addedTasks };
}
