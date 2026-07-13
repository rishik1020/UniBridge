import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { GraduationCap, Loader2, Shield, Building2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { PasswordChecklist, PASSWORD_REGEX } from "@/components/PasswordChecklist";

const COLLEGES = ["Woxsen University"] as const;

type Portal = "student" | "admin" | "department";

const PORTAL_META: Record<Portal, { title: string; subtitle: string; icon: any; badge: string }> = {
  student: {
    title: "Welcome back",
    subtitle: "Sign in to continue to Uni Bridge.",
    icon: GraduationCap,
    badge: "Student access",
  },
  admin: {
    title: "Admin sign in",
    subtitle: "Restricted to administrators of Uni Bridge.",
    icon: Shield,
    badge: "Admin portal",
  },
  department: {
    title: "Department sign in",
    subtitle: "Sign in with the email and password issued by your administrator.",
    icon: Building2,
    badge: "Department portal",
  },
};

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().max(72).regex(PASSWORD_REGEX, "Password must be 8+ chars with uppercase, lowercase, number, and special character (@$!%*?&)"),
  college: z.enum(COLLEGES, { errorMap: () => ({ message: "Please select your college" }) }),
});
const loginSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Password required"),
});
const forgotSchema = z.object({
  email: z.string().trim().email("Please enter a valid email").max(255),
});

const Auth = () => {
  const [params] = useSearchParams();
  const portalParam = params.get("portal");
  const portal: Portal =
    portalParam === "admin" || portalParam === "department" ? portalParam : "student";
  const isStaffPortal = portal !== "student";
  const isDeptPortal = portal === "department";

  const [mode, setMode] = useState<"login" | "signup">(
    !isStaffPortal && params.get("mode") === "signup" ? "signup" : "login"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [college, setCollege] = useState<typeof COLLEGES[number]>("Woxsen University");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  // True only when the user just submitted the sign-in form on this page, so we
  // can tell an actual wrong-portal login attempt apart from an already-signed-in
  // user merely visiting a staff portal URL.
  const attemptedLogin = useRef(false);

  useEffect(() => {
    if (isStaffPortal && mode === "signup") setMode("login");
  }, [isStaffPortal, mode]);

  useEffect(() => {
    // Wait until auth has settled AND the role has resolved, otherwise `role` is
    // briefly null right after sign-in and everyone would be sent to /dashboard.
    if (authLoading || !user || !role) return;
    const home = role === "admin" ? "/admin" : role === "department" ? "/department" : "/dashboard";
    if (portal !== "student" && role !== portal) {
      // Only tear down the session if they actively tried to log into the wrong
      // portal here; a user signed in elsewhere is just redirected to their home.
      if (attemptedLogin.current) {
        attemptedLogin.current = false;
        toast.error(`This account doesn't have access to the ${portal} portal.`);
        supabase.auth.signOut();
        return;
      }
    }
    navigate(home, { replace: true });
  }, [user, role, authLoading, navigate, portal]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    attemptedLogin.current = true;
    setLoading(true);
    try {
      if (mode === "signup" && !isStaffPortal) {
        const parsed = signupSchema.safeParse({ name, email, password, college });
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { name: parsed.data.name, college: parsed.data.college },
          },
        });
        if (error) {
          // Do not reveal whether the email is already registered (prevents
          // account enumeration). Keep the guidance generic for everyone.
          toast.error("We couldn't create your account. If you already have one, please sign in instead.");
          return;
        }
        if (data.session) {
          // Email confirmation is off: the user is signed in right away and the
          // auth effect redirects them to their dashboard.
          toast.success("Account created. Welcome to Uni Bridge.");
        } else {
          // No session yet. Try to sign in immediately — if the project
          // auto-confirms accounts this logs the student straight in for a
          // seamless one-step flow. If email confirmation is still required,
          // fall back to the sign-in view with a clear message instead of
          // stranding the user on the signup form.
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: parsed.data.email,
            password: parsed.data.password,
          });
          if (!signInErr) {
            toast.success("Account created. Welcome to Uni Bridge.");
          } else {
            toast.success("Account created. Confirm your email, then sign in below.");
            setMode("login");
            setPassword("");
          }
        }
      } else if (isDeptPortal) {
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email, password: parsed.data.password,
        });
        // Single generic message — never reveal which field was wrong, whether
        // the account exists, or whether the email is unconfirmed.
        if (error) { toast.error("Incorrect email or password"); return; }
        toast.success("Signed in");
      } else {
        const parsed = loginSchema.safeParse({ email, password });
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email, password: parsed.data.password,
        });
        if (error) { toast.error("Incorrect email or password"); return; }
        toast.success("Signed in");
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: { prompt: "select_account" },
      },
    });
    // On success the browser is redirected to Google, so this only runs on error.
    if (error) { toast.error(error.message); setLoading(false); }
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = forgotSchema.safeParse({ email: forgotEmail });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setForgotSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotSending(false);
    // Always show the same neutral message whether or not the email exists, so
    // this flow can't be used to enumerate registered accounts. Log for debugging.
    if (error) console.error("resetPasswordForEmail:", error.message);
    toast.success("If that email is registered, a reset link is on its way.");
    setForgotOpen(false);
    setForgotEmail("");
  };

  const meta = PORTAL_META[portal];
  const PortalIcon = meta.icon;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-hero text-primary-foreground p-12 flex-col justify-between">
        <Link to="/" className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6" />
          <span className="font-display text-xl">Uni Bridge</span>
        </Link>
        <div className="space-y-4 max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 backdrop-blur px-3 py-1 text-xs font-medium">
            <PortalIcon className="h-3.5 w-3.5" /> {meta.badge}
          </span>
          <h2 className="font-display text-4xl leading-tight">
            {portal === "student"
              ? "A calmer way to make your campus better."
              : portal === "admin"
              ? "Oversee every complaint, end to end."
              : "Resolve what your department owns."}
          </h2>
          <p className="opacity-80">
            {portal === "student"
              ? "Submit complaints, attach evidence, and track resolution — without the email chains."
              : portal === "admin"
              ? "Route incoming issues, monitor department progress, and verify completion."
              : "See only what's assigned to you, post updates, and close the loop."}
          </p>
        </div>
        <p className="text-xs opacity-60">© {new Date().getFullYear()} Uni Bridge</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <div className="lg:hidden flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="font-display text-lg">Uni Bridge</span>
            </div>
            {isStaffPortal && (
              <Link
                to="/admin-portal"
                className="ml-auto inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Admin portal
              </Link>
            )}
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium mb-3">
              <PortalIcon className="h-3.5 w-3.5" /> {meta.badge}
            </span>
            <h1 className="font-display text-3xl">
              {mode === "signup" ? "Create your account" : meta.title}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {mode === "signup" ? "Start tracking campus issues in minutes." : meta.subtitle}
            </p>
          </div>
          {!isStaffPortal && (
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                disabled={loading}
                onClick={signInWithGoogle}
              >
                <GoogleIcon className="h-4 w-4 mr-2" />
                Continue with Google
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">or continue with email</span>
                </div>
              </div>
            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && !isStaffPortal && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Patel" required />
              </div>
            )}
            {mode === "signup" && !isStaffPortal && (
              <div className="space-y-2">
                <Label htmlFor="college">College</Label>
                <Select value={college} onValueChange={(v) => setCollege(v as typeof COLLEGES[number])}>
                  <SelectTrigger id="college">
                    <SelectValue placeholder="Select your college" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLEGES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mode === "signup" && !isStaffPortal && <PasswordChecklist password={password} />}
              {mode === "login" && (
                <div className="flex justify-end pt-1">
                  {isDeptPortal ? (
                    <span className="text-xs text-muted-foreground">
                      Forgot password? Contact your administrator.
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline font-medium"
                      onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              )}
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === "signup" ? "Create account" : `Sign in${isStaffPortal ? ` as ${portal}` : ""}`}
            </Button>
          </form>
          {!isStaffPortal ? (
            <p className="text-sm text-muted-foreground text-center">
              {mode === "signup" ? "Already have an account?" : "New to Uni Bridge?"}{" "}
              <button type="button" className="text-primary font-medium hover:underline"
                onClick={() => setMode(mode === "signup" ? "login" : "signup")}>
                {mode === "signup" ? "Sign in" : "Create one"}
              </button>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              Don't have a staff account? Contact your administrator.
            </p>
          )}
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Enter the email associated with your account. We'll send you a secure link to set a new password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={sendReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@university.edu"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setForgotOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={forgotSending}>
                {forgotSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Send reset link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
  </svg>
);

export default Auth;
