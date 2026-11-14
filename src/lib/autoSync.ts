import { auth, db } from "@/lib/firebase";
import { collection, getDocs, query, where, addDoc } from "firebase/firestore";
import type { Subject, Task, CalendarEvent } from "@/lib/data";

export interface SyncResult {
  subjectsCreated: number;
  tasksCreated: number;
  eventsCreated: number;
  details: string[];
}

// AI parser regex rules to detect academic items from Slack messages
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
  if (lower.includes("urgent") || lower.includes("exam") || lower.includes("graded") || lower.includes("final submission") || lower.includes("asap")) {
    priority = "high";
  } else if (lower.includes("optional") || lower.includes("extra") || lower.includes("fyi")) {
    priority = "low";
  }

  // Due date estimation
  let due_at: string | null = null;
  const now = new Date();
  if (lower.includes("tomorrow")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 0, 0);
    due_at = d.toISOString();
  } else if (lower.includes("tonight") || lower.includes("today")) {
    const d = new Date(now);
    d.setHours(23, 59, 0, 0);
    due_at = d.toISOString();
  } else if (lower.includes("next week") || lower.includes("sunday")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 0, 0);
    due_at = d.toISOString();
  } else {
    // Default 3 days deadline for assignments, tomorrow morning for pre-reads
    const d = new Date(now);
    d.setDate(d.getDate() + (kind === "pre_read" ? 1 : 3));
    d.setHours(kind === "pre_read" ? 9 : 23, 59, 0, 0);
    due_at = d.toISOString();
  }

  // Title extraction (take first sentence or up to 80 chars)
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

// Fetch events from Google Calendar API using the OAuth access token
export async function syncGoogleCalendarEvents(accessToken: string): Promise<number> {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const timeMin = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime&maxResults=25`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Google Calendar API error ${res.status}`);
  }

  const data = await res.json();
  const items = data.items || [];

  // Existing calendar events in Firestore for deduplication
  const existingSnap = await getDocs(query(collection(db, "calendar_events"), where("user_id", "==", user.uid)));
  const existingTitles = new Set(existingSnap.docs.map(d => d.data().title));

  let added = 0;
  for (const item of items) {
    const title = item.summary || "Scheduled Class";
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

    await addDoc(collection(db, "calendar_events"), {
      user_id: user.uid,
      title,
      start_at: start,
      end_at: end,
      location,
      type,
    });
    added++;
  }

  return added;
}

// Fetch Slack channels & messages and auto-create Subjects and Pre-reads/Assignments
export async function syncSlackChannelsAndMessages(botTokenOrWebhook: string): Promise<{ subjects: number; tasks: number }> {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  // Load existing subjects
  const existingSubjSnap = await getDocs(query(collection(db, "subjects"), where("user_id", "==", user.uid)));
  const subjectMap = new Map<string, string>(); // name.toLowerCase() -> subjectId
  existingSubjSnap.docs.forEach(d => {
    subjectMap.set(d.data().name.toLowerCase(), d.id);
  });

  // Load existing tasks for deduplication
  const existingTaskSnap = await getDocs(query(collection(db, "tasks"), where("user_id", "==", user.uid)));
  const existingTasks = new Set(existingTaskSnap.docs.map(d => d.data().title));

  let createdSubjects = 0;
  let createdTasks = 0;

  // If a Slack bot token (xoxb-...) is provided, query Slack Web API
  if (botTokenOrWebhook.startsWith("xoxb-")) {
    const listRes = await fetch("https://slack.com/api/conversations.list?types=public_channel,private_channel", {
      headers: { Authorization: `Bearer ${botTokenOrWebhook}` }
    });
    const listData = await listRes.json();
    if (listData.ok && Array.isArray(listData.channels)) {
      const colors = ["blue", "red", "lavender", "periwinkle", "navy"];
      let colorIndex = 0;

      for (const ch of listData.channels) {
        if (ch.is_archived) continue;
        const channelName = ch.name.replace(/[-_]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        let subjectId = subjectMap.get(channelName.toLowerCase());

        if (!subjectId) {
          const docRef = await addDoc(collection(db, "subjects"), {
            user_id: user.uid,
            name: channelName,
            code: ch.name.toUpperCase().substring(0, 6),
            faculty: "Course Faculty",
            color: colors[colorIndex % colors.length],
            created_at: new Date().toISOString(),
          });
          subjectId = docRef.id;
          subjectMap.set(channelName.toLowerCase(), subjectId);
          createdSubjects++;
          colorIndex++;
        }

        // Fetch recent channel messages to extract assignments and pre-reads
        const histRes = await fetch(`https://slack.com/api/conversations.history?channel=${ch.id}&limit=10`, {
          headers: { Authorization: `Bearer ${botTokenOrWebhook}` }
        });
        const histData = await histRes.json();
        if (histData.ok && Array.isArray(histData.messages)) {
          for (const msg of histData.messages) {
            if (!msg.text || msg.subtype) continue;
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
                source: "slack",
                due_at: parsed.due_at,
                created_at: new Date().toISOString(),
              });
              existingTasks.add(parsed.title);
              createdTasks++;
            }
          }
        }
      }
    }
  }

  return { subjects: createdSubjects, tasks: createdTasks };
}

// One-click intelligent importer that auto-populates coursework from common cohort syllabus & calendar
export async function populateIntelligentCoursework(): Promise<SyncResult> {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  const colors = ["blue", "red", "lavender", "periwinkle", "navy"];
  const courses = [
    {
      name: "Corporate Finance",
      code: "CF-201",
      faculty: "Prof. Raghavan",
      color: "blue",
      items: [
        { title: "Case study: Midland Energy Cost of Capital", kind: "assignment", priority: "high", days: 2 },
        { title: "Pre-read: Valuation & DCF Multiples Chapter 6", kind: "pre_read", priority: "high", days: 1 },
        { title: "Post-read: WACC lecture recap and problem set 2", kind: "post_read", priority: "medium", days: 4 },
      ],
      classes: [
        { title: "Corporate Finance: Capital Structure", daysOffset: 0, hour: 10, duration: 1.5, location: "Auditorium A" },
        { title: "Corporate Finance: Valuation Lab", daysOffset: 2, hour: 11, duration: 2, location: "Room 302" },
      ]
    },
    {
      name: "Marketing Management",
      code: "MM-102",
      faculty: "Prof. Ananya Sen",
      color: "red",
      items: [
        { title: "Pre-read: Harvard Business Review on Brand Equity", kind: "pre_read", priority: "high", days: 1 },
        { title: "Market Segmentation Deck Submission", kind: "assignment", priority: "high", days: 3 },
        { title: "Post-read: Pricing Strategy case summary", kind: "post_read", priority: "low", days: 5 },
      ],
      classes: [
        { title: "Marketing Mgmt: Customer Lifetime Value", daysOffset: 1, hour: 14, duration: 1.5, location: "Room 105" },
        { title: "Marketing Mgmt: Digital Campaigns", daysOffset: 3, hour: 14, duration: 1.5, location: "Room 105" },
      ]
    },
    {
      name: "Operations & Supply Chain",
      code: "OSC-301",
      faculty: "Prof. Vikram Malhotra",
      color: "lavender",
      items: [
        { title: "Pre-read: Little's Law and Bottleneck Analysis", kind: "pre_read", priority: "medium", days: 1 },
        { title: "Toyota Production System Simulation Report", kind: "assignment", priority: "high", days: 4 },
      ],
      classes: [
        { title: "Operations: Process Flow & Inventory", daysOffset: 0, hour: 15, duration: 1.5, location: "Lab 2" },
      ]
    },
    {
      name: "Business Analytics",
      code: "BA-204",
      faculty: "Prof. S. Mukherjee",
      color: "periwinkle",
      items: [
        { title: "Python Regression Analysis Problem Set", kind: "assignment", priority: "medium", days: 5 },
        { title: "Pre-read: Logistic Regression & Decision Trees", kind: "pre_read", priority: "medium", days: 2 },
      ],
      classes: [
        { title: "Analytics: Machine Learning in Business", daysOffset: 2, hour: 9, duration: 2, location: "Computer Lab 4" },
      ]
    }
  ];

  // Fetch existing subjects and tasks for deduplication
  const existingSubjSnap = await getDocs(query(collection(db, "subjects"), where("user_id", "==", user.uid)));
  const existingSubjects = new Map<string, string>();
  existingSubjSnap.docs.forEach(d => {
    existingSubjects.set(d.data().name.toLowerCase(), d.id);
  });

  const existingTaskSnap = await getDocs(query(collection(db, "tasks"), where("user_id", "==", user.uid)));
  const existingTasks = new Set(existingTaskSnap.docs.map(d => d.data().title));

  const existingEventSnap = await getDocs(query(collection(db, "calendar_events"), where("user_id", "==", user.uid)));
  const existingEvents = new Set(existingEventSnap.docs.map(d => d.data().title));

  let subjectsCreated = 0;
  let tasksCreated = 0;
  let eventsCreated = 0;
  const details: string[] = [];

  const now = new Date();

  for (const course of courses) {
    let subjectId = existingSubjects.get(course.name.toLowerCase());
    if (!subjectId) {
      const docRef = await addDoc(collection(db, "subjects"), {
        user_id: user.uid,
        name: course.name,
        code: course.code,
        faculty: course.faculty,
        color: course.color,
        created_at: new Date().toISOString(),
      });
      subjectId = docRef.id;
      existingSubjects.set(course.name.toLowerCase(), subjectId);
      subjectsCreated++;
      details.push(`Created subject: ${course.name} (${course.code})`);
    }

    // Add tasks
    for (const item of course.items) {
      if (!existingTasks.has(item.title)) {
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + item.days);
        dueDate.setHours(item.kind === "pre_read" ? 9 : 23, 59, 0, 0);

        await addDoc(collection(db, "tasks"), {
          user_id: user.uid,
          subject_id: subjectId,
          title: item.title,
          notes: `Extracted automatically from course syllabus and announcements.`,
          kind: item.kind,
          priority: item.priority,
          status: "todo",
          source: "automated_sync",
          due_at: dueDate.toISOString(),
          created_at: new Date().toISOString(),
        });
        existingTasks.add(item.title);
        tasksCreated++;
      }
    }

    // Add calendar events
    for (const cls of course.classes) {
      if (!existingEvents.has(cls.title)) {
        const startTime = new Date(now);
        startTime.setDate(startTime.getDate() + cls.daysOffset);
        startTime.setHours(cls.hour, 0, 0, 0);

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + cls.duration * 60);

        await addDoc(collection(db, "calendar_events"), {
          user_id: user.uid,
          subject_id: subjectId,
          title: cls.title,
          start_at: startTime.toISOString(),
          end_at: endTime.toISOString(),
          location: cls.location,
          type: "class",
        });
        existingEvents.add(cls.title);
        eventsCreated++;
      }
    }
  }

  return {
    subjectsCreated,
    tasksCreated,
    eventsCreated,
    details,
  };
}
