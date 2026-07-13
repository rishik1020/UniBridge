import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, CheckCircle2, ListChecks, Building2, Star, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { StarRating } from "@/components/StarRating";
import { PriorityBadge } from "@/components/PriorityBadge";
import { PRIORITY_META, PRIORITY_ORDER, type Priority } from "@/lib/priority";
import { useComplaintsRealtime } from "@/hooks/useComplaintsRealtime";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ total: 0, pending: 0, assigned: 0, in_progress: 0, resolved: 0 });
  const [deptStats, setDeptStats] = useState<{ department: string; avg: number; count: number; lowCount: number }[]>([]);
  const [recentFeedback, setRecentFeedback] = useState<{ id: string; title: string; rating: number; feedback: string | null; department: string | null }[]>([]);
  const [priorityCounts, setPriorityCounts] = useState<Record<Priority, number>>({ P1: 0, P2: 0, P3: 0, P4: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
      const { data } = await supabase
        .from("complaints")
        .select("id,title,status,department,priority,rating,feedback,is_rated,rated_at")
        .order("created_at", { ascending: false });
      const arr = (data as any[]) ?? [];
      setStats({
        total: arr.length,
        pending: arr.filter(c => c.status === "pending").length,
        assigned: arr.filter(c => c.status === "assigned").length,
        in_progress: arr.filter(c => c.status === "in_progress").length,
        resolved: arr.filter(c => c.status === "resolved").length,
      });

      const open = arr.filter(c => c.status !== "resolved");
      const pc: Record<Priority, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
      open.forEach(c => { const p = (c.priority ?? "P3") as Priority; pc[p] = (pc[p] ?? 0) + 1; });
      setPriorityCounts(pc);

      const rated = arr.filter(c => c.is_rated && c.rating != null && c.department);
      const grouped: Record<string, number[]> = {};
      rated.forEach(c => {
        grouped[c.department] = grouped[c.department] || [];
        grouped[c.department].push(c.rating);
      });
      const ds = Object.entries(grouped).map(([department, ratings]) => ({
        department,
        avg: ratings.reduce((a, b) => a + b, 0) / ratings.length,
        count: ratings.length,
        lowCount: ratings.filter(r => r <= 2).length,
      })).sort((a, b) => b.avg - a.avg);
      setDeptStats(ds);

      setRecentFeedback(
        rated.filter(c => c.feedback)
          .slice(0, 5)
          .map(c => ({ id: c.id, title: c.title, rating: c.rating, feedback: c.feedback, department: c.department }))
      );
      setLoading(false);
  };

  useEffect(() => { load(); }, []);
  // Live-refresh overview stats as complaints move through the pipeline.
  useComplaintsRealtime(load, "admin-dashboard");

  return (
    <AppLayout>
      <h1 className="font-display text-3xl mb-1">Admin overview</h1>
      <p className="text-muted-foreground mb-8">Monitor and manage complaints across the campus.</p>

      {loading ? (
        <div className="p-12 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card icon={ListChecks} label="Total" value={stats.total} tone="primary" to="/admin/complaints" />
            <Card icon={Clock} label="Pending" value={stats.pending} tone="warning" to="/admin/complaints?status=pending" />
            <Card icon={Building2} label="Assigned" value={stats.assigned} tone="primary" to="/admin/complaints?status=assigned" />
            <Card icon={Loader2} label="In Progress" value={stats.in_progress} tone="info" to="/admin/complaints?status=in_progress" />
            <Card icon={CheckCircle2} label="Resolved" value={stats.resolved} tone="success" to="/admin/complaints?status=resolved" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mb-8">
            <div className="bg-card border border-border rounded-xl p-6 shadow-card lg:col-span-2">
              <h2 className="font-display text-lg mb-1 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" /> Priority breakdown
              </h2>
              <p className="text-xs text-muted-foreground mb-4">Open complaints by priority level (resolved excluded)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PRIORITY_ORDER.map(p => (
                  <Link
                    key={p}
                    to={`/admin/complaints?priority=${p}`}
                    className="border border-border rounded-lg p-4 hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <PriorityBadge priority={p} full />
                      <span className="font-display text-2xl tabular-nums">{priorityCounts[p]}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">SLA {PRIORITY_META[p].slaLabel}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-card">
              <h2 className="font-display text-lg mb-1 flex items-center gap-2">
                <Star className="h-5 w-5 text-warning" /> Department performance
              </h2>
              <p className="text-xs text-muted-foreground mb-4">Average student rating per department</p>
              {deptStats.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No ratings yet.</p>
              ) : (
                <ul className="space-y-3">
                  {deptStats.map(d => (
                    <li key={d.department} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium capitalize">{d.department}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.count} rating{d.count > 1 ? "s" : ""}
                          {d.lowCount > 0 && (
                            <span className="ml-2 inline-flex items-center gap-1 text-destructive">
                              <AlertTriangle className="h-3 w-3" /> {d.lowCount} low
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StarRating value={Math.round(d.avg)} readOnly size="sm" />
                        <span className="text-sm font-display tabular-nums">{d.avg.toFixed(1)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-card">
              <h2 className="font-display text-lg mb-1">Recent feedback</h2>
              <p className="text-xs text-muted-foreground mb-4">What students are saying</p>
              {recentFeedback.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No feedback yet.</p>
              ) : (
                <ul className="space-y-3">
                  {recentFeedback.map(f => (
                    <li key={f.id} className={"p-3 rounded-md border " + (f.rating <= 2 ? "bg-destructive/5 border-destructive/20" : "bg-muted/40 border-border")}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-xs font-medium capitalize text-muted-foreground">{f.department}</p>
                        <StarRating value={f.rating} readOnly size="sm" />
                      </div>
                      <p className="text-sm font-medium truncate">{f.title}</p>
                      <p className="text-sm text-foreground/80 italic mt-1">"{f.feedback}"</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 shadow-card">
            <h2 className="font-display text-xl mb-2">Manage complaints</h2>
            <p className="text-muted-foreground text-sm mb-4">Triage complaints, route them to the right department, post updates, and resolve.</p>
            <div className="flex gap-4 flex-wrap">
              <Link to="/admin/complaints" className="text-primary font-medium hover:underline">Open complaint management →</Link>
              <Link to="/admin/departments" className="text-primary font-medium hover:underline">Manage departments →</Link>
              <Link to="/admin/users" className="text-primary font-medium hover:underline">Manage user passwords →</Link>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
};

const Card = ({ icon: Icon, label, value, tone, to }: any) => {
  const toneCls = {
    primary: "text-primary bg-primary/10",
    warning: "text-warning bg-warning/15",
    info: "text-info bg-info/15",
    success: "text-success bg-success/15",
  }[tone as string];
  const inner = (
    <>
      <div className={`h-9 w-9 rounded-lg grid place-items-center ${toneCls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="font-display text-3xl mt-3">{value}</p>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
    </>
  );
  const cls = "block bg-card border border-border rounded-xl p-5 shadow-card";
  return to ? (
    <Link to={to} className={`${cls} hover:border-primary/40 hover:shadow-elegant transition-all`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
};

export default AdminDashboard;
