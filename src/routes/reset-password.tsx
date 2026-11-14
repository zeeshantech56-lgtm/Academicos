import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { confirmPasswordReset } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/site/Logo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Update password — Academic OS" }] }),
  component: ResetPage,
});

function ResetPage() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const searchParams = new URLSearchParams(window.location.search);
    const oobCode = searchParams.get("oobCode");

    if (!oobCode) {
      toast.error("Password reset code missing or expired. Please request a new link.");
      setBusy(false);
      return;
    }

    try {
      await confirmPasswordReset(auth, oobCode, pw);
      toast.success("Password updated successfully. You can now log in.");
      navigate({ to: "/auth" });
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <Logo />
        <h1 className="text-2xl font-extrabold">Set a new password</h1>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pw">New password</Label>
            <Input id="pw" type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          <Button type="submit" variant="cta" className="w-full" disabled={busy}>
            Save new password
          </Button>
        </form>
        <p className="text-sm text-muted-foreground">
          <Link to="/auth" className="hover:text-primary">← Back to log in</Link>
        </p>
      </div>
    </div>
  );
}
