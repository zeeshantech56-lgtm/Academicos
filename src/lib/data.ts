import { queryOptions } from "@tanstack/react-query";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  faculty: string | null;
  color: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  subject_id: string | null;
  kind: "assignment" | "pre_read" | "post_read" | "announcement";
  title: string;
  notes: string | null;
  due_at: string | null;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "done";
  source: string;
  created_at: string;
  completed_at?: string | null;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  subject_id?: string | null;
  start_at: string;
  end_at: string;
  location?: string | null;
  type: "class" | "exam" | "deadline" | "meeting";
}

export const SUBJECT_COLORS: Record<string, string> = {
  blue: "bg-primary",
  red: "bg-cta",
  lavender: "bg-muted-foreground",
  periwinkle: "bg-periwinkle",
  navy: "bg-foreground",
};

export const KIND_LABEL: Record<string, string> = {
  assignment: "Assignment",
  pre_read: "Pre-read",
  post_read: "Post-read",
  announcement: "Announcement",
};

export const subjectsQuery = queryOptions({
  queryKey: ["subjects"],
  queryFn: async (): Promise<Subject[]> => {
    const user = auth.currentUser;
    if (!user) return [];
    try {
      const q = query(collection(db, "subjects"), where("user_id", "==", user.uid));
      const snap = await getDocs(q);
      const list: Subject[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Subject);
      });
      return list.sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
      console.error("subjectsQuery error:", e);
      return [];
    }
  },
});

export const tasksQuery = queryOptions({
  queryKey: ["tasks"],
  queryFn: async (): Promise<Task[]> => {
    const user = auth.currentUser;
    if (!user) return [];
    try {
      const q = query(collection(db, "tasks"), where("user_id", "==", user.uid));
      const snap = await getDocs(q);
      const list: Task[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Task);
      });
      return list.sort((a, b) => {
        if (!a.due_at) return 1;
        if (!b.due_at) return -1;
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      });
    } catch (e) {
      console.error("tasksQuery error:", e);
      return [];
    }
  },
});

export const calendarEventsQuery = queryOptions({
  queryKey: ["calendarEvents"],
  queryFn: async (): Promise<CalendarEvent[]> => {
    const user = auth.currentUser;
    if (!user) return [];
    try {
      const q = query(collection(db, "calendar_events"), where("user_id", "==", user.uid));
      const snap = await getDocs(q);
      const list: CalendarEvent[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as CalendarEvent);
      });
      return list.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    } catch (e) {
      console.error("calendarEventsQuery error:", e);
      return [];
    }
  },
});

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      const snap = await getDoc(doc(db, "profiles", user.uid));
      const profile = snap.exists() ? snap.data() : null;
      const role = (profile as any)?.role || "user";
      return {
        user: {
          id: user.uid,
          email: user.email,
          displayName: user.displayName,
        },
        profile,
        roles: [role],
        isAdmin: role === "super_admin" || role === "admin",
      };
    } catch (e) {
      console.error("meQuery error:", e);
      return {
        user: {
          id: user.uid,
          email: user.email,
          displayName: user.displayName,
        },
        profile: null,
        roles: ["user"],
        isAdmin: false,
      };
    }
  },
});

export async function addSubject(data: Omit<Subject, "id" | "user_id" | "created_at">) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  const docRef = await addDoc(collection(db, "subjects"), {
    ...data,
    user_id: user.uid,
    created_at: new Date().toISOString(),
  });
  return docRef.id;
}

export async function deleteSubject(id: string) {
  await deleteDoc(doc(db, "subjects", id));
}

export async function addTask(data: Omit<Task, "id" | "user_id" | "created_at">) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  const docRef = await addDoc(collection(db, "tasks"), {
    ...data,
    user_id: user.uid,
    created_at: new Date().toISOString(),
  });
  return docRef.id;
}

export async function updateTask(id: string, updates: Partial<Task>) {
  await updateDoc(doc(db, "tasks", id), updates);
}

export async function deleteTask(id: string) {
  await deleteDoc(doc(db, "tasks", id));
}

export async function addCalendarEvent(data: Omit<CalendarEvent, "id" | "user_id">) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  const docRef = await addDoc(collection(db, "calendar_events"), {
    ...data,
    user_id: user.uid,
  });
  return docRef.id;
}

export async function deleteCalendarEvent(id: string) {
  await deleteDoc(doc(db, "calendar_events", id));
}
