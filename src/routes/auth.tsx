import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signInWithPopup,
  updateProfile
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/site/Logo";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ mode: z.enum(["login", "signup", "forgot"]).optional() }),
  head: () => ({
    meta: [
      { title: "Log in or sign up — Academic OS" },
      { name: "description", content: "Access your Academic OS workspace." },
      { property: "og:title", content: "Log in — Academic OS" },
      { property: "og:description", content: "Access your Academic OS workspace." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initial } = Route.useSearch();
  const [mode, setMode] = useState(initial ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { 
    if (user) navigate({ to: "/app" }); 
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        if (name && userCred.user) {
          await updateProfile(userCred.user, { displayName: name });
        }
        toast.success("Account created successfully!");
        navigate({ to: "/app" });
      } else if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Logged in successfully!");
        navigate({ to: "/app" });
      } else {
        await sendPasswordResetEmail(auth, email);
        setSent("If an account exists, a reset link has been sent to your email.");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed");
    } finally { 
      setBusy(false); 
    }
  }

  async function google() {
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Logged in with Google!");
      navigate({ to: "/app" });
    } catch (err: any) {
      toast.error(err.message || "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground grid-lines lg:flex lg:flex-col lg:justify-between">
        <Logo inverse />
        <div className="absolute -bottom-32 -right-32 h-[420px] w-[420px] rounded-full border-[56px] border-cta" />
        <div className="absolute right-40 top-40 h-24 w-24 bg-periwinkle" />
        <h2 className="relative max-w-md text-5xl font-extrabold leading-tight">Your semester, finally in one place.</h2>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden"><Logo /></div>
          <h1 className="mt-8 text-3xl font-extrabold">{mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset password" : "Welcome back"}</h1>
          {sent ? (
            <p className="mt-6 rounded-md bg-surface p-4 text-sm">{sent}</p>
          ) : (
            <>
              {mode !== "forgot" && (
                <>
                  <button type="button" onClick={google} disabled={busy} className="mt-8 flex h-11 w-full items-center justify-center gap-2.5 rounded-md border border-[#747775] bg-[#FFFFFF] px-3 text-sm font-medium text-[#1F1F1F] hover:bg-slate-50 transition-colors">
                    <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
                    Continue with Google
                  </button>
                  <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
                </>
              )}
              <form onSubmit={submit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5"><Label htmlFor="name">Full name</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
                )}
                <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                {mode !== "forgot" && (
                  <div className="space-y-1.5"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                )}
                <Button type="submit" variant="cta" size="xl" className="w-full" disabled={busy}>
                  {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Log in"}
                </Button>
              </form>
            </>
          )}
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            {mode === "login" && (<>
              <p>New here? <button className="font-semibold text-primary" onClick={() => { setMode("signup"); setSent(null); }}>Create an account</button></p>
              <p><button className="text-primary" onClick={() => { setMode("forgot"); setSent(null); }}>Forgot password?</button></p>
            </>)}
            {mode !== "login" && <p>Have an account? <button className="font-semibold text-primary" onClick={() => { setMode("login"); setSent(null); }}>Log in</button></p>}
            <p><Link to="/" className="hover:text-primary">← Back to home</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
