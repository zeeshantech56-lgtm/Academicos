import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  BookOpen, 
  ClipboardList, 
  LayoutDashboard, 
  Layers, 
  LogOut, 
  Menu, 
  Plug, 
  Settings, 
  X, 
  Calendar, 
  ShieldCheck 
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/site/Logo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => ({ 
    meta: [
      { title: "Dashboard — Academic OS" }, 
      { name: "description", content: "Your academic workspace." }, 
      { property: "og:title", content: "Dashboard — Academic OS" }, 
      { property: "og:description", content: "Your academic workspace." }
    ] 
  }),
  component: AppLayout,
});

const BASE_NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/calendar", label: "Schedule", icon: Calendar },
  { to: "/app/subjects", label: "Subjects", icon: Layers },
  { to: "/app/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/app/readings", label: "Readings", icon: BookOpen },
  { to: "/app/integrations", label: "Integrations", icon: Plug },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

function AppLayout() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => { 
    if (!loading && !user) navigate({ to: "/auth" }); 
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading workspace...</div>;
  }

  const isAdmin = profile?.role === "super_admin" || profile?.role === "admin";
  const navItems = [
    ...BASE_NAV,
    ...(isAdmin ? [{ to: "/app/admin", label: "Admin Panel", icon: ShieldCheck }] : []),
  ];

  const sidebar = (
    <aside className="flex h-full w-64 flex-col bg-sidebar p-5 text-sidebar-foreground">
      <Logo inverse />
      <nav className="mt-10 flex flex-1 flex-col gap-1">
        {navItems.map((n) => (
          <Link 
            key={n.to} 
            to={n.to} 
            onClick={() => setOpen(false)} 
            activeOptions={{ exact: "exact" in n ? (n as any).exact : false }}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-foreground border-l-2 border-sidebar-primary" }}
          >
            <n.icon className="h-4 w-4" />{n.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-sidebar-accent/50 pt-4">
        {profile?.full_name && (
          <p className="truncate px-3 text-xs font-semibold text-sidebar-foreground/80">{profile.full_name}</p>
        )}
        <p className="truncate px-3 text-xs text-sidebar-foreground/50">{user.email}</p>
        <button 
          onClick={async () => { 
            await signOut(auth); 
            navigate({ to: "/" }); 
          }} 
          className="mt-3 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-surface">
      <div className="sticky top-0 hidden h-screen lg:block">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="h-full">{sidebar}</div>
          <button className="flex-1 bg-foreground/40" onClick={() => setOpen(false)} aria-label="Close">
            <X className="ml-4 text-primary-foreground" />
          </button>
        </div>
      )}
      <div className="flex-1">
        <div className="flex h-14 items-center border-b bg-background px-4 lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Menu"><Menu /></button>
          <div className="ml-4"><Logo /></div>
        </div>
        <main className={cn("mx-auto max-w-6xl p-5 md:p-10")}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
