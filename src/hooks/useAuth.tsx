import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  institution: string | null;
  programme: string | null;
  role: "super_admin" | "admin" | "user";
  created_at?: string;
  updated_at?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const ref = doc(db, "profiles", currentUser.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            const initial: UserProfile = {
              id: currentUser.uid,
              email: currentUser.email,
              full_name: currentUser.displayName || "",
              institution: "",
              programme: "",
              role: currentUser.email === "zeeshantech56@gmail.com" ? "super_admin" : "user",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            await setDoc(ref, initial, { merge: true });
            setProfile(initial);
          }
        } catch (e) {
          console.error("Error reading profile:", e);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { user, profile, loading };
}
