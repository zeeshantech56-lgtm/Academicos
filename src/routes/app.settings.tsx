import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { meQuery } from "@/lib/data";

export const Route = createFileRoute("/app/settings")({ component: Settings });

function Settings() {
  const { data: me } = useQuery(meQuery);
  const qc = useQueryClient();
  const [f, setF] = useState({ full_name: "", institution: "", programme: "" });

  useEffect(() => {
    if (me?.profile) {
      setF({
        full_name: (me.profile as any).full_name ?? "",
        institution: (me.profile as any).institution ?? "",
        programme: (me.profile as any).programme ?? ""
      });
    }
  }, [me?.profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!me?.user) return;
    try {
      await setDoc(doc(db, "profiles", me.user.id), {
        ...f,
        updated_at: new Date().toISOString()
      }, { merge: true });
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold">Settings</h1>
      <form onSubmit={save} className="max-w-xl space-y-4 rounded-lg bg-background p-6">
        <h2 className="text-lg font-bold">Profile</h2>
        <div className="space-y-1.5"><Label>Email</Label><Input disabled value={me?.user?.email ?? ""} /></div>
        <div className="space-y-1.5"><Label>Full name</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Institution</Label><Input placeholder="e.g. IIM Calcutta" value={f.institution} onChange={(e) => setF({ ...f, institution: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Programme</Label><Input placeholder="e.g. MBA 2026–28" value={f.programme} onChange={(e) => setF({ ...f, programme: e.target.value })} /></div>
        <Button type="submit">Save profile</Button>
      </form>
      <div className="max-w-xl rounded-lg bg-background p-6">
        <h2 className="text-lg font-bold">Access Tier</h2>
        <p className="mt-2 text-sm">Status: <span className="font-semibold text-emerald-600">Full Access Active</span> (All features unlocked, no subscription required)</p>
        <p className="mt-2 text-sm text-muted-foreground">You have unrestricted access to all current and upcoming academic management tools.</p>
      </div>
    </div>
  );
}
