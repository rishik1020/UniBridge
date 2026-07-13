import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Shield,
  MessageSquare,
  ArrowRight,
  BookOpen,
  Bus,
  Building2,
  Wrench,
  Lock,
  Menu,
  X,
  Sparkles,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/Reveal";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how" },
  { label: "FAQ", href: "#faq" },
];

const Index = () => {
  const { user, role } = useAuth();
  const dest = user
    ? role === "admin"
      ? "/admin"
      : role === "department"
      ? "/department"
      : "/dashboard"
    : "/auth";

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background font-brand text-foreground">
      {/* NAVBAR */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/75 backdrop-blur-xl border-b border-border/60 shadow-card"
            : "bg-background/40 backdrop-blur-md border-b border-transparent"
        }`}
      >
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-card group-hover:shadow-glow transition-shadow">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-brand text-lg font-bold tracking-tight">
              UniBridge
            </span>
          </Link>

          {/* Center nav */}
          <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/60 transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Right actions */}
          <div className="hidden lg:flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link to="/admin-portal">
                <Lock className="h-3.5 w-3.5" />
                Admin Portal
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-full px-5 shadow-card hover:shadow-glow transition-shadow">
              <Link to="/auth">Login / Sign Up</Link>
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden h-10 w-10 grid place-items-center rounded-lg hover:bg-muted/60"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="lg:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl">
            <div className="container py-4 flex flex-col gap-1">
              {navLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60"
                >
                  {l.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-border/60">
                <Button asChild variant="outline" size="sm" className="rounded-full justify-center">
                  <Link to="/admin-portal">
                    <Lock className="h-3.5 w-3.5" /> Admin Portal
                  </Link>
                </Button>
                <Button asChild size="sm" className="rounded-full justify-center">
                  <Link to="/auth">Login / Sign Up</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section
        id="home"
        className="relative overflow-hidden pt-32 pb-24 lg:pt-40 lg:pb-32"
      >
        {/* Background layers */}
        <div className="absolute inset-0 bg-radial-soft pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none [background-image:linear-gradient(to_right,hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.4)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,black,transparent)]" />
        {/* Floating shapes */}
        <div className="absolute top-24 left-8 h-64 w-64 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-8 h-72 w-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-56 w-[40rem] rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            {/* Eyebrow */}
            <a
              href="#features"
              style={{ animationDelay: "0ms" }}
              className="animate-rise-in inline-flex items-center gap-2 rounded-full border border-border bg-card/70 backdrop-blur px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-card hover:shadow-elegant transition-shadow"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Built for modern universities
              <ChevronDown className="h-3 w-3" />
            </a>

            {/* Headline */}
            <h1 className="mt-8 font-brand text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-[-0.02em]">
              <span
                className="block animate-rise-in"
                style={{ animationDelay: "120ms" }}
              >
                One platform to manage
              </span>
              <span
                className="block animate-rise-in"
                style={{ animationDelay: "260ms" }}
              >
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                    every student concern
                  </span>
                </span>
              </span>
            </h1>

            {/* Subtext */}
            <p
              className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed animate-rise-in"
              style={{ animationDelay: "400ms" }}
            >
              Streamline complaints, track resolutions, and ensure
              accountability across departments — all in one calm, transparent
              workspace.
            </p>

            {/* CTAs */}
            <div
              className="mt-9 flex flex-wrap items-center justify-center gap-3 animate-rise-in"
              style={{ animationDelay: "540ms" }}
            >
              <Button
                asChild
                size="lg"
                className="group rounded-full px-7 bg-gradient-to-br from-primary via-primary to-primary-glow text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)] hover:shadow-[0_16px_36px_-10px_hsl(var(--primary)/0.6)] hover:scale-[1.04] transition-all duration-300 ease-in-out"
              >
                <Link to={dest}>
                  Get Started
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full px-7 bg-transparent border-border/70 text-foreground/80 hover:text-foreground hover:bg-card/60 hover:border-border hover:scale-[1.03] hover:shadow-card backdrop-blur transition-all duration-300 ease-in-out"
              >
                <a href="#how">Learn More</a>
              </Button>
            </div>

            {/* Trust line */}
            <div
              className="mt-12 flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-xs font-medium text-muted-foreground/70 animate-rise-in"
              style={{ animationDelay: "680ms" }}
            >
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-success/80" /> No setup fees
              </span>
              <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-border" />
              <span className="inline-flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-success/80" /> Secure by default
              </span>
              <span className="hidden sm:inline-block h-1 w-1 rounded-full bg-border" />
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-success/80" /> Real-time updates
              </span>
            </div>
          </div>

          {/* Stats strip */}
          <Reveal delay={100} className="mt-20 mx-auto max-w-3xl grid grid-cols-3 gap-4 sm:gap-8 rounded-2xl border border-border bg-card/60 backdrop-blur p-6 shadow-card">
            <Stat n="4" label="Categories" />
            <Stat n="4" label="Priority levels" />
            <Stat n="100%" label="Transparent" />
          </Reveal>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="container py-20 lg:py-28">
        <Reveal>
          <SectionHeader
            eyebrow="Features"
            title="Everything that matters, in one place"
            subtitle="Cover the four most common areas of campus life with structured workflows."
          />
        </Reveal>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Building2, title: "Hostel", desc: "Rooms, mess, facilities" },
            { icon: BookOpen, title: "Academics", desc: "Courses, exams, faculty" },
            { icon: Bus, title: "Transport", desc: "Buses, schedules, routes" },
            { icon: Wrench, title: "Infrastructure", desc: "Wifi, power, maintenance" },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 100}>
              <Category icon={c.icon} title={c.title} desc={c.desc} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative bg-soft py-20 lg:py-28 overflow-hidden">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="container relative">
          <Reveal>
            <SectionHeader
              eyebrow="How it works"
              title="Designed for trust"
              subtitle="Three steps from concern to resolution."
            />
          </Reveal>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { n: "01", icon: MessageSquare, title: "Raise", desc: "Submit a complaint with details and a photo." },
              { n: "02", icon: Shield, title: "Track", desc: "Watch the status update in real-time." },
              { n: "03", icon: GraduationCap, title: "Resolve", desc: "Administrators close the loop with notes." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 120}>
                <Step n={s.n} icon={s.icon} title={s.title} desc={s.desc} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container py-20 lg:py-28">
        <Reveal>
          <SectionHeader
            eyebrow="FAQ"
            title="Questions, answered"
            subtitle="Everything you need to know about UniBridge."
          />
        </Reveal>
        <Reveal delay={120} className="mt-10 max-w-2xl mx-auto">
          <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card/60 backdrop-blur shadow-card divide-y divide-border">
            <FaqItem value="q1" q="Who can use UniBridge?">
              Students, departments, and administrators of any university or college. Each role has a tailored workspace.
            </FaqItem>
            <FaqItem value="q2" q="How are complaints prioritized?">
              Admins assign a P1–P4 priority. P1 (Critical) gets a 24-hour SLA, scaling down to 5 days for P4 (Low).
            </FaqItem>
            <FaqItem value="q3" q="Can students rate the resolution?">
              Yes. Once an admin verifies a resolution, students can rate it 1–5 stars and leave optional feedback.
            </FaqItem>
            <FaqItem value="q4" q="Is my data secure?">
              All data is protected by row-level security. Only authorized roles see what they need.
            </FaqItem>
          </Accordion>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border">
        <div className="container py-10 flex flex-col sm:flex-row gap-3 items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-brand font-semibold text-foreground">UniBridge</span>
            <span className="text-muted-foreground/70">© {new Date().getFullYear()}</span>
          </div>
          <span>Built for the modern campus</span>
        </div>
      </footer>
    </div>
  );
};

/* ---------- Sub-components ---------- */

const SectionHeader = ({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) => (
  <div className="text-center max-w-2xl mx-auto">
    <span className="inline-block text-xs font-semibold tracking-widest uppercase text-accent">
      {eyebrow}
    </span>
    <h2 className="font-brand text-3xl lg:text-4xl font-bold tracking-tight mt-3">
      {title}
    </h2>
    <p className="text-muted-foreground mt-3">{subtitle}</p>
  </div>
);

const Stat = ({ n, label }: { n: string; label: string }) => (
  <div className="text-center">
    <p className="font-brand text-2xl sm:text-3xl font-bold text-primary">{n}</p>
    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mt-1">
      {label}
    </p>
  </div>
);

const Category = ({ icon: Icon, title, desc }: any) => (
  <div className="group rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-elegant hover:-translate-y-1 transition-all">
    <div className="h-11 w-11 rounded-xl bg-accent/10 grid place-items-center mb-4 group-hover:bg-accent/20 transition-colors">
      <Icon className="h-5 w-5 text-accent" />
    </div>
    <h3 className="font-brand text-lg font-semibold">{title}</h3>
    <p className="text-sm text-muted-foreground mt-1">{desc}</p>
  </div>
);

const Step = ({ n, icon: Icon, title, desc }: any) => (
  <div className="rounded-2xl bg-card border border-border p-8 shadow-card hover:shadow-elegant transition-shadow">
    <p className="font-brand text-sm font-semibold text-accent">{n}</p>
    <div className="h-12 w-12 rounded-xl bg-primary/5 grid place-items-center my-4">
      <Icon className="h-6 w-6 text-primary" />
    </div>
    <h3 className="font-brand text-xl font-semibold">{title}</h3>
    <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{desc}</p>
  </div>
);

const FaqItem = ({
  value,
  q,
  children,
}: {
  value: string;
  q: string;
  children: React.ReactNode;
}) => (
  <AccordionItem value={value} className="border-0 px-5">
    <AccordionTrigger className="text-left font-brand font-semibold text-base hover:no-underline py-5">
      {q}
    </AccordionTrigger>
    <AccordionContent className="text-muted-foreground pb-5">
      {children}
    </AccordionContent>
  </AccordionItem>
);

export default Index;
