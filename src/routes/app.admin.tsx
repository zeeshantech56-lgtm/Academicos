import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { Users, Shield, CheckCircle, Database } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { meQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/admin")({ component: AdminPanel });

interface AdminUser {
  id: string;
  email: string;
  full_name?: string;
  institution?: string;
  programme?: string;
  role: "super_admin" | "admin" | "user";
  created_at?: string;
}

function AdminPanel() {
  const { data: me } = useQuery(meQuery);
  const qc = useQueryClient();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const snap = await getDocs(collection(db, "profiles"));
        const list: AdminUser[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as AdminUser);
        });
        setUsers(list);
      } catch (err: any) {
        toast.error("Failed to fetch user directory: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  async function updateRole(userId: string, newRole: "super_admin" | "admin" | "user") {
    try {
      await updateDoc(doc(db, "profiles", userId), { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      toast.success("User role updated successfully");
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (err: any) {
      toast.error("Failed to update role: " + err.message);
    }
  }

  if (!me?.isAdmin) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-800">
        <Shield className="mx-auto h-8 w-8 mb-2 text-red-600" />
        <h2 className="text-xl font-bold">Admin Privileges Required</h2>
        <p className="mt-2 text-sm">You do not have administrative access to this console.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold">System Administration</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage user accounts, assign system roles, and oversee platform access.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-background p-5 border">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-extrabold">{users.length}</p>
              <p className="text-xs text-muted-foreground">Registered Users</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-background p-5 border">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-extrabold">{users.filter((u) => u.role !== "user").length}</p>
              <p className="text-xs text-muted-foreground">Administrators</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-background p-5 border">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-extrabold">Firestore</p>
              <p className="text-xs text-muted-foreground">Connected Cloud Database</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-background">
        <div className="border-b px-6 py-4">
          <h2 className="font-bold text-lg">User Directory</h2>
          <p className="text-xs text-muted-foreground">View and adjust user privileges across the platform.</p>
        </div>
        {loading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No registered users in the database yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-surface text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Institution & Programme</th>
                  <th className="px-6 py-3">Current Role</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface/50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">{u.full_name || "Unnamed Student"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      <p className="text-foreground">{u.institution || "—"}</p>
                      <p>{u.programme || "—"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        u.role === "super_admin" ? "bg-purple-100 text-purple-800" :
                        u.role === "admin" ? "bg-blue-100 text-blue-800" : "bg-zinc-100 text-zinc-800"
                      }`}>
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Select value={u.role} onValueChange={(val: any) => updateRole(u.id, val)}>
                        <SelectTrigger className="w-[140px] ml-auto h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
