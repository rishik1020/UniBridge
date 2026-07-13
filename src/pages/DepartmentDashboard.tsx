import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ComplaintThread } from "@/components/ComplaintThread";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2, Building2, ArrowRight, CheckCircle2, Clock, Inbox, Star,
  MapPin, AlertTriangle, TrendingUp, Timer, Activity, Filter, Hash,
} from "lucide-react";
import { useComplaintsRealtime } from "@/hooks/useComplaintsRealtime";
import { StarRating } from "@/components/StarRating";
import { PriorityBadge } from "@/components/PriorityBadge";
import { StatusBadge, type Status } from "@/components/StatusBadge";
import { priorityRank, PRIORITY_META, type Priority } from "@/lib/priority";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, differenceInHours, differenceInMinutes, isToday } from "date-fns";

interface Complaint {
  id: string;
  ticket_number: string | null;
  parent_id: string | null;
  title: string;
  description: string;
  category: string;
  department: string | null;
  image_url: string | null;
  status: Status;
  priority: Priority;
  admin_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  rating: number | null;
  feedback: string | null;
  is_rated: boolean;
  room_number: string | null;
  is_anonymous: boolean;
}

interface Profile { id: string; name: string; email: string; }

/* ── SLA helpers ── */
function slaRemaining(c: Complaint) {
  const slaH = PRIORITY_META[c.priority]?.slaHours ?? 72;
  const deadline = new Date(c.created_at).getTime() + slaH * 3600_000;
  const now = Date.now();
  const diffMin = Math.round((deadline - now) / 60_000);
  const overdue = diffMin < 0;
  const absMin = Math.abs(diffMin);
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return { overdue, label, diffMin };
}

/* ── Avg resolution time ── */
function avgResolutionHours(items: Complaint[]): string {
  const resolved = items.filter(c => c.status === "resolved");
  if (!resolved.length) return "—";
  const total = resolved.reduce((acc, c) => {
    return acc + differenceInHours(new Date(c.updated_at), new Date(c.created_at));
  }, 0);
  const avg = total / resolved.length;
  return avg < 1 ? "< 1h" : `${Math.round(avg)}h`;
}

const DepartmentDashboard = () => {
  const { department, user } = useAuth();
  const [items, setItems] = useState<Complaint[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Complaint | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmComplete, setConfirmComplete] = useState<Complaint | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showActivity, setShowActivity] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("complaints")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data as any[]) ?? [];
    setItems(list);
    const ids = Array.from(new Set(list.map((c: any) => c.created_by)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,name,email").in("id", ids);
      const map: Record<string, Profile> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Live-sync with the complaints table (realtime + refetch on tab focus).
  useComplaintsRealtime(() => { if (user) load(); }, user?.id ?? "anon");

  /* ── Derived data ── */
  const sorted = useMemo(() => {
    const byPriority = (a: Complaint, b: Complaint) => {
      const diff = priorityRank(a.priority) - priorityRank(b.priority);
      return diff !== 0 ? diff : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    };
    let list = [...items];
    if (filterPriority !== "all") list = list.filter(c => c.priority === filterPriority);
    if (filterStatus !== "all") list = list.filter(c => c.status === filterStatus);
    return list.sort(byPriority);
  }, [items, filterPriority, filterStatus]);

  const stats = useMemo(() => {
    const p1 = items.filter(c => c.priority === "P1" && c.status !== "resolved").length;
    const p2 = items.filter(c => c.priority === "P2" && c.status !== "resolved").length;
    const inProgress = items.filter(c => c.status === "in_progress").length;
    const completedToday = items.filter(c => c.status === "resolved" && isToday(new Date(c.updated_at))).length;
    return { p1, p2, inProgress, completedToday };
  }, [items]);

  const performance = useMemo(() => {
    const rated = items.filter(c => c.is_rated && c.rating != null);
    const avg = rated.length ? rated.reduce((a, c) => a + (c.rating ?? 0), 0) / rated.length : 0;
    const completed = items.filter(c => c.status === "resolved").length;
    return { avg, count: rated.length, completed, avgResolution: avgResolutionHours(items) };
  }, [items]);

  const recentActivity = useMemo(() => {
    return [...items]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 15);
  }, [items]);

  const transition = async (c: Complaint, next: Status) => {
    setSavingId(c.id);
    const { error } = await supabase.from("complaints")
      .update({ status: next as any })
      .eq("id", c.id);
    setSavingId(null);
    if (error) { toast.error(error.message); return; }
    // Optimistically reflect the change immediately; realtime/focus refetch keeps
    // every other panel (admin + student) in sync.
    setItems(prev => prev.map(x =>
      x.id === c.id ? { ...x, status: next, updated_at: new Date().toISOString() } : x
    ));
    setOpen(prev => (prev && prev.id === c.id ? { ...prev, status: next } : prev));
    toast.success(next === "resolved" ? "Task completed" : "Task started");
  };

  // Department task state machine: Start (assigned → in progress),
  // Complete (in progress → resolved). Resolved is FINAL — if the issue recurs,
  // the student raises a follow-up ticket (001-a) rather than reopening.
  const nextAction = (c: Complaint): { label: string; next: Status; icon: typeof ArrowRight } | null => {
    if (c.status === "assigned" || c.status === "pending") return { label: "Start task", next: "in_progress", icon: ArrowRight };
    if (c.status === "in_progress") return { label: "Complete task", next: "resolved", icon: CheckCircle2 };
    return null;
  };

  // Completing a task requires a re-confirm/finalize step; other transitions apply directly.
  const handleAction = (c: Complaint, action: { next: Status }) => {
    if (action.next === "resolved") {
      setResolutionNote("");
      setConfirmComplete(c);
    } else {
      transition(c, action.next);
      setOpen(prev => (prev && prev.id === c.id ? null : prev));
    }
  };

  const finalizeComplete = async () => {
    if (!confirmComplete) return;
    const c = confirmComplete;
    const note = resolutionNote.trim();
    setFinalizing(true);
    // Optional closing note goes into the shared conversation thread.
    if (note && user) {
      await supabase.from("complaint_updates").insert({
        complaint_id: c.id,
        author_id: user.id,
        author_role: "department",
        message: note,
      } as any);
    }
    const { error } = await supabase.from("complaints")
      .update({ status: "resolved" as any })
      .eq("id", c.id);
    setFinalizing(false);
    if (error) { toast.error(error.message); return; }
    setItems(prev => prev.map(x =>
      x.id === c.id ? { ...x, status: "resolved", updated_at: new Date().toISOString() } : x
    ));
    setOpen(prev => (prev && prev.id === c.id ? null : prev));
    setConfirmComplete(null);
    setResolutionNote("");
    toast.success("Task completed and finalized");
  };

  const summaryCards = [
    { label: "P1 Tasks", value: stats.p1, icon: AlertTriangle, tone: "text-destructive bg-destructive/10 border-destructive/20" },
    { label: "P2 Tasks", value: stats.p2, icon: Clock, tone: "text-warning bg-warning/10 border-warning/20" },
    { label: "In Progress", value: stats.inProgress, icon: TrendingUp, tone: "text-info bg-info/10 border-info/20" },
    { label: "Completed Today", value: stats.completedToday, icon: CheckCircle2, tone: "text-success bg-success/10 border-success/20" },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            <span className="capitalize">{department ?? "Department"}</span> Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage, track, and resolve assigned tasks efficiently.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowActivity(prev => !prev)}>
          <Activity className="h-4 w-4 mr-1.5" /> Activity
        </Button>
      </div>

      {loading ? (
        <div className="p-20 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="flex gap-6">
          {/* Main content */}
          <div className={cn("flex-1 min-w-0 space-y-6", showActivity && "lg:mr-0")}>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {summaryCards.map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="bg-card border border-border rounded-xl p-4 shadow-card">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-10 w-10 rounded-lg grid place-items-center border", card.tone)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{card.label}</p>
                        <p className="font-display text-2xl tabular-nums">{card.value}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Performance widget */}
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-xl p-4 shadow-card flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center border border-primary/20">
                  <Timer className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Resolution</p>
                  <p className="font-display text-xl tabular-nums">{performance.avgResolution}</p>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 shadow-card flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 text-success grid place-items-center border border-success/20">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Completed</p>
                  <p className="font-display text-xl tabular-nums">{performance.completed}</p>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 shadow-card flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 text-warning grid place-items-center border border-warning/20">
                  <Star className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <div className="flex items-center gap-1.5">
                    <p className="font-display text-xl tabular-nums">{performance.count > 0 ? performance.avg.toFixed(1) : "—"}</p>
                    {performance.count > 0 && <StarRating value={Math.round(performance.avg)} readOnly size="sm" />}
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" /> Filters
              </div>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="P1">P1 Critical</SelectItem>
                  <SelectItem value="P2">P2 High</SelectItem>
                  <SelectItem value="P3">P3 Medium</SelectItem>
                  <SelectItem value="P4">P4 Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              {(filterPriority !== "all" || filterStatus !== "all") && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterPriority("all"); setFilterStatus("all"); }}>
                  Clear
                </Button>
              )}
              <span className="ml-auto text-xs text-muted-foreground">{sorted.length} task{sorted.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Task cards */}
            {sorted.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-12 text-center shadow-card">
                <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No tasks match your filters.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sorted.map(c => {
                  const p = profiles[c.created_by];
                  const action = nextAction(c);
                  const sla = c.status !== "resolved" ? slaRemaining(c) : null;
                  return (
                    <article
                      key={c.id}
                      className={cn(
                        "bg-card border rounded-xl p-4 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer shadow-card",
                        sla?.overdue ? "border-destructive/40 bg-destructive/5" : "border-border"
                      )}
                      onClick={() => setOpen(c)}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Top row: ID + priority + status */}
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="text-[10px] font-mono font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                              <Hash className="h-2.5 w-2.5 inline -mt-0.5" />{c.ticket_number ?? c.id.slice(0, 8)}
                            </span>
                            {c.parent_id && (
                              <span className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">Follow-up</span>
                            )}
                            <PriorityBadge priority={c.priority} size="sm" />
                            <StatusBadge status={c.status} />
                            {sla && (
                              <span className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                                sla.overdue
                                  ? "bg-destructive/15 text-destructive border-destructive/30"
                                  : "bg-muted text-muted-foreground border-border"
                              )}>
                                <Timer className="h-2.5 w-2.5" />
                                {sla.overdue ? `Overdue ${sla.label}` : sla.label}
                              </span>
                            )}
                          </div>
                          {/* Title */}
                          <h3 className="font-medium text-sm leading-snug line-clamp-1">{c.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.description}</p>
                          {/* Meta row */}
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
                            <span>{c.is_anonymous ? "Anonymous" : (p?.name ?? "Student")}</span>
                            <span>{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                            {c.room_number && (
                              <span className="inline-flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" /> {c.room_number}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Quick action button */}
                        {action && (
                          <Button
                            size="sm"
                            variant={c.status === "in_progress" ? "default" : "outline"}
                            className="shrink-0 h-8 text-xs"
                            disabled={savingId === c.id}
                            onClick={(e) => { e.stopPropagation(); handleAction(c, action); }}
                          >
                            {savingId === c.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <><action.icon className="h-3.5 w-3.5 mr-1.5" /> {action.label}</>
                            }
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activity panel */}
          {showActivity && (
            <aside className="hidden lg:block w-80 shrink-0">
              <div className="bg-card border border-border rounded-xl shadow-card sticky top-4">
                <header className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-sm">Recent Activity</h2>
                </header>
                <div className="max-h-[70vh] overflow-y-auto p-3 space-y-2">
                  {recentActivity.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">No activity yet.</p>
                  ) : recentActivity.map(c => (
                    <button
                      key={c.id}
                      className="w-full text-left bg-muted/40 rounded-lg p-3 hover:bg-muted/70 transition-colors"
                      onClick={() => setOpen(c)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <PriorityBadge priority={c.priority} size="sm" />
                        <StatusBadge status={c.status} />
                      </div>
                      <p className="text-xs font-medium line-clamp-1">{c.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Updated {formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 flex-wrap">
              {open && <PriorityBadge priority={open.priority} full />}
              <span>{open?.title}</span>
            </DialogTitle>
          </DialogHeader>
          {open && (() => {
            const sla = open.status !== "resolved" ? slaRemaining(open) : null;
            return (
              <div className="space-y-5">
                {/* Meta */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                    <Hash className="h-2.5 w-2.5 inline -mt-0.5" />{open.ticket_number ?? open.id.slice(0, 8)}
                  </span>
                  {open.parent_id && (
                    <span className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">Follow-up</span>
                  )}
                  <StatusBadge status={open.status} />
                  {sla && (
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                      sla.overdue
                        ? "bg-destructive/15 text-destructive border-destructive/30"
                        : "bg-muted text-muted-foreground border-border"
                    )}>
                      <Timer className="h-2.5 w-2.5" />
                      {sla.overdue ? `Overdue by ${sla.label}` : `${sla.label} remaining`}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground capitalize mb-2">
                    {open.category} · raised {formatDistanceToNow(new Date(open.created_at), { addSuffix: true })}
                    {open.is_anonymous ? " by Anonymous" : (profiles[open.created_by] ? ` by ${profiles[open.created_by].name}` : "")}
                  </p>
                  {open.room_number && (
                    <p className="text-xs text-muted-foreground mb-2 inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {open.room_number}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">{open.description}</p>
                  {open.image_url && <img src={open.image_url} alt="" className="mt-3 rounded-md max-h-56 object-cover" />}
                  {open.admin_notes && (
                    <div className="mt-3 p-3 bg-secondary rounded-md text-sm">
                      <span className="font-medium">Admin note:</span> {open.admin_notes}
                    </div>
                  )}
                </div>
                {/* Conversation / Notes */}
                <div className="border-t border-border pt-4">
                  <ComplaintThread complaintId={open.id} />
                </div>
              </div>
            );
          })()}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setOpen(null)}>Close</Button>
            {open && nextAction(open) && (
              <Button
                onClick={() => handleAction(open, nextAction(open)!)}
                disabled={savingId === open.id}
              >
                {savingId === open.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {(() => { const A = nextAction(open)!; return <><A.icon className="h-4 w-4 mr-2" /> {A.label}</>; })()}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalize / re-confirm completion */}
      <Dialog
        open={!!confirmComplete}
        onOpenChange={(o) => { if (!o && !finalizing) { setConfirmComplete(null); setResolutionNote(""); } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" /> Finalize &amp; resolve?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You're about to mark{" "}
              <span className="font-medium text-foreground">"{confirmComplete?.title}"</span>{" "}
              as resolved. This notifies the student to rate the resolution and updates the admin.
              You can reopen it later with <span className="font-medium">Resume task</span>.
            </p>
            <div className="space-y-2">
              <Label className="text-sm">Closing note <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                rows={3}
                maxLength={2000}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="What was done to resolve this? (shared in the conversation)"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" disabled={finalizing} onClick={() => { setConfirmComplete(null); setResolutionNote(""); }}>
              Cancel
            </Button>
            <Button onClick={finalizeComplete} disabled={finalizing}>
              {finalizing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirm &amp; finalize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default DepartmentDashboard;