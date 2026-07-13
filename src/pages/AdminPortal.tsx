import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Shield, Building2, ArrowRight, ArrowLeft } from "lucide-react";

const AdminPortal = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="container flex items-center justify-between py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold">Uni Bridge</span>
        </Link>
        <Button asChild variant="ghost">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1.5" />Back home</Link>
        </Button>
      </header>

      <section className="container py-16 lg:py-24">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Staff access
          </span>
          <h1 className="font-display text-4xl lg:text-5xl">Admin Portal</h1>
          <p className="text-muted-foreground">
            Choose your role to continue. Student accounts should use the regular sign in.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <PortalCard
            to="/auth?portal=admin"
            icon={Shield}
            title="Admin Login"
            desc="Oversee every complaint, route them to the right department, and verify resolution."
            cta="Continue as Admin"
          />
          <PortalCard
            to="/auth?portal=department"
            icon={Building2}
            title="Department Login"
            desc="Access complaints assigned to your department, post updates, and mark them resolved."
            cta="Continue as Department"
          />
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10">
          Are you a student? <Link to="/auth" className="text-primary font-medium hover:underline">Sign in here</Link>
        </p>
      </section>
    </div>
  );
};

const PortalCard = ({ to, icon: Icon, title, desc, cta }: any) => (
  <Link
    to={to}
    className="group rounded-2xl border border-border bg-card p-8 shadow-card hover:shadow-elegant hover:-translate-y-1 transition-all flex flex-col"
  >
    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center mb-5">
      <Icon className="h-6 w-6" />
    </div>
    <h3 className="font-display text-2xl">{title}</h3>
    <p className="text-sm text-muted-foreground mt-2 flex-1">{desc}</p>
    <span className="mt-6 inline-flex items-center text-sm font-medium text-primary">
      {cta} <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </span>
  </Link>
);

export default AdminPortal;