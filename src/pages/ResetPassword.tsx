import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GraduationCap, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { PasswordChecklist, PASSWORD_REGEX } from "@/components/PasswordChecklist";

const schema = z.object({
  password: z.string().max(72).regex(PASSWORD_REGEX, "Password must be 8+ chars with uppercase, lowercase, number, and special character (@$!%*?&)"),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, {
  message: "Passwords do not match",
  path: ["confirm"],
});

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase delivers the recovery session via URL hash. The client picks it
    // up automatically, but we listen so we know when it has landed.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setHasSession(!!session);
    });
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setSubmitting(false);
    if (error) {
      console.error("updateUser(password):", error.message);
      toast.error("Couldn't update your password. The reset link may have expired — request a new one.");
      return;
    }
    setDone(true);
    toast.success("Password updated. You can now sign in.");
    // Sign out the recovery session so the next sign-in uses the new password.
    await supabase.auth.signOut();
    setTimeout(() => navigate("/auth", { replace: true }), 1500);
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-display text-xl">Uni Bridge</span>
        </Link>
        <div className="bg-card border border-border rounded-xl shadow-card p-8">
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium mb-3">
              <KeyRound className="h-3.5 w-3.5" /> Password reset
            </span>
            <h1 className="font-display text-2xl">Set a new password</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Choose a strong password you'll remember.
            </p>
          </div>

          {!ready ? (
            <div className="grid place-items-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : done ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
              <p className="text-sm text-muted-foreground">Password updated. Redirecting to sign in…</p>
            </div>
          ) : !hasSession ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This reset link is invalid or has expired. Request a new one from the sign-in page.
              </p>
              <Button asChild className="w-full">
                <Link to="/auth">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
                <PasswordChecklist password={password} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
