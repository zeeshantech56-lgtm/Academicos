import { auth, db } from "@/lib/firebase";
import { collection, getDocs, query, where, addDoc } from "firebase/firestore";

export interface SyncResult {
  subjectsCreated: number;
  tasksCreated: number;
  eventsCreated: number;
  details: string[];
}

// AI parser to detect assignments, pre-reads, post-reads from REAL Slack messages
export function parseAcademicMessage(text: string): {
  kind: "assignment" | "pre_read" | "post_read" | "announcement";
  title: string;
  notes: string;
  due_at: string | null;
  priority: "high" | "medium" | "low";
} {
  const lower = text.toLowerCase();
  
  let kind: "assignment" | "pre_read" | "post_read" | "announcement" = "assignment";
  if (lower.includes("pre-read") || lower.includes("pre read") || lower.includes("before class") || lower.includes("reading for class")) {
    kind = "pre_read";
  } else if (lower.includes("post-read") || lower.includes("post read") || lower.includes("recap read") || lower.includes("supplementary reading")) {
    kind = "post_read";
  } else if (lower.includes("announcement") || lower.includes("note:") || lower.includes("fyi")) {
    kind = "announcement";
  }

  // Priority detection
  let priority: "high" | "medium" | "low" = "medium";
  if (lower.includes("urgent") || lower.includes("exam") || lower.includes("graded") || lower.includes("final submission") || lower.includes("asap") || lower.includes("deadline")) {
    priority = "high";
  } else if (lower.includes("optional") || lower.includes("extra") || lower.includes("fyi")) {
    priority = "low";
  }

  // Due date estimation based on message contents
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
    // Look for day names in text
    const daysMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
    };
    let foundDay = false;
    for (const [dayName, dayNum] of Object.entries(daysMap)) {
      if (lower.includes(dayName)) {
        const d = new Date(now);
        const currentDay = d.getDay();
        const diff = (dayNum + 7 - currentDay) % 7 || 7;
        d.setDate(d.getDate() + diff);
        d.setHours(23, 59, 0, 0);
        due_at = d.toISOString();
        foundDay = true;
        break;
      }
    }
    if (!foundDay) {
      const d = new Date(now);
      d.setDate(d.getDate() + (kind === "pre_read" ? 1 : 3));
      d.setHours(kind === "pre_read" ? 9 : 23, 59, 0, 0);
      due_at = d.toISOString();
    }
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

// REAL Google Calendar Fetch: Fetches actual events from the authenticated user's Google Calendar account
export async function syncRealGoogleCalendar(accessToken: string): Promise<number> {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in first");
  if (!accessToken) throw new Error("Google access token missing. Please click 'Connect Google Calendar' first.");

  const timeMin = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime&maxResults=50`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Google Calendar API returned status ${res.status}`);
  }

  const data = await res.json();
  const items = data.items || [];

  if (items.length === 0) {
    return 0;
  }

  // Load existing subjects so we can link calendar events to subjects by name
  const existingSubjSnap = await getDocs(query(collection(db, "subjects"), where("user_id", "==", user.uid)));
  const subjectMap = new Map<string, string>(); // name.toLowerCase() -> subjectId
  existingSubjSnap.docs.forEach(d => {
    subjectMap.set(d.data().name.toLowerCase(), d.id);
  });

  // Existing calendar events in Firestore for deduplication
  const existingSnap = await getDocs(query(collection(db, "calendar_events"), where("user_id", "==", user.uid)));
  const existingTitles = new Set(existingSnap.docs.map(d => d.data().title));

  let added = 0;
  for (const item of items) {
    const title = item.summary || "Scheduled Event";
    if (existingTitles.has(title)) continue;

    const start = item.start?.dateTime || item.start?.date || new Date().toISOString();
    const end = item.end?.dateTime || item.end?.date || start;
    const location = item.location || item.hangoutLink || null;

    // Detect type based on summary
    const lower = title.toLowerCase();
    let type: "class" | "exam" | "deadline" | "meeting" = "class";
    if (lower.includes("exam") || lower.includes("quiz") || lower.includes("test") || lower.includes("midterm")) {
      type = "exam";
    } else if (lower.includes("due") || lower.includes("submission") || lower.includes("deadline")) {
      type = "deadline";
    } else if (lower.includes("meeting") || lower.includes("sync") || lower.includes("group")) {
      type = "meeting";
    }

    // Attempt to match event with existing subject
    let matchedSubjectId: string | null = null;
    for (const [subjName, subjId] of subjectMap.entries()) {
      if (lower.includes(subjName)) {
        matchedSubjectId = subjId;
        break;
      }
    }

    await addDoc(collection(db, "calendar_events"), {
      user_id: user.uid,
      subject_id: matchedSubjectId,
      title,
      start_at: start,
      end_at: end,
      location,
      type,
    });
    existingTitles.add(title);
    added++;
  }

  return added;
}

// REAL Slack Sync: Reads real channels and real messages using Slack Bot User Token
export async function syncRealSlack(botToken: string): Promise<{ subjects: number; tasks: number }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in first");
  if (!botToken || !botToken.startsWith("xoxb-")) {
    throw new Error("A valid Slack Bot User Token (starting with xoxb-) is required to read your Slack channels and messages.");
  }

  // 1. Fetch real channel list
  const listRes = await fetch("https://slack.com/api/conversations.list?types=public_channel,private_channel", {
    headers: { Authorization: `Bearer ${botToken}` }
  });
  const listData = await listRes.json();
  if (!listData.ok) {
    throw new Error(`Slack API error: ${listData.error || "Unable to list channels"}`);
  }

  const existingSubjSnap = await getDocs(query(collection(db, "subjects"), where("user_id", "==", user.uid)));
  const subjectMap = new Map<string, string>(); // name.toLowerCase() -> subjectId
  existingSubjSnap.docs.forEach(d => {
    subjectMap.set(d.data().name.toLowerCase(), d.id);
  });

  const existingTaskSnap = await getDocs(query(collection(db, "tasks"), where("user_id", "==", user.uid)));
  const existingTasks = new Set(existingTaskSnap.docs.map(d => d.data().title));

  const colors = ["blue", "red", "lavender", "periwinkle", "navy"];
  let colorIndex = existingSubjSnap.size;

  let createdSubjects = 0;
  let createdTasks = 0;

  // 2. Map channels to subjects and fetch messages
  for (const ch of (listData.channels || [])) {
    if (ch.is_archived) continue;
    // Format channel name (e.g. "corp-finance" -> "Corp Finance")
    const channelName = ch.name.replace(/[-_]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    let subjectId = subjectMap.get(channelName.toLowerCase());

    if (!subjectId) {
      const docRef = await addDoc(collection(db, "subjects"), {
        user_id: user.uid,
        name: channelName,
        code: ch.name.toUpperCase().substring(0, 8),
        faculty: null,
        color: colors[colorIndex % colors.length],
        created_at: new Date().toISOString(),
      });
      subjectId = docRef.id;
      subjectMap.set(channelName.toLowerCase(), subjectId);
      createdSubjects++;
      colorIndex++;
    }

    // 3. Fetch real messages from this channel
    try {
      const histRes = await fetch(`https://slack.com/api/conversations.history?channel=${ch.id}&limit=20`, {
        headers: { Authorization: `Bearer ${botToken}` }
      });
      const histData = await histRes.json();
      if (histData.ok && Array.isArray(histData.messages)) {
        for (const msg of histData.messages) {
          if (!msg.text || msg.subtype) continue;
          
          // Only create items for messages that discuss coursework, readings, pre-reads, assignments, or deadlines
          const lower = msg.text.toLowerCase();
          const isAcademic = lower.includes("read") || lower.includes("assignment") || lower.includes("submission") || 
                             lower.includes("due") || lower.includes("homework") || lower.includes("exam") || 
                             lower.includes("case") || lower.includes("problem set") || lower.includes("project");
          
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
    } catch (msgErr) {
      console.warn(`Could not fetch messages for #${ch.name}:`, msgErr);
    }
  }

  return { subjects: createdSubjects, tasks: createdTasks };
}
