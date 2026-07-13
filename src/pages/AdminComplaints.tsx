import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { ComplaintThread } from "@/components/ComplaintThread";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Building2, AlertTriangle, MapPin, Hash } from "lucide-react";
import { StarRating } from "@/components/StarRating";
import { PriorityBadge } from "@/components/PriorityBadge";
import { PRIORITY_META, PRIORITY_ORDER, priorityRank, type Priority } from "@/lib/priority";
import { useComplaintsRealtime } from "@/hooks/useComplaintsRealtime";

interface Complaint {
  id: string;
  ticket_number: string | null;
  parent_id: string | null;
  title: string;
  description: string;
  category: string;
  department: string | null;
  image_url: string | null;
  status: "pending" | "assigned" | "in_progress" | "resolved";
  priority: Priority;
  admin_notes: string | null;
  created_by: string;
  created_at: string;
  rating: number | null;
  feedback: string | null;
  is_rated: boolean;
  room_number: string | null;
  is_anonymous: boolean;
  upvotes: number;
}

interface Profile { id: string; name: string; email: string; }

const AdminComplaints = () => {
  const [searchParams] = useSearchParams();
  const initialPriority = (() => {
    const p = searchParams.get("priority");
    return p && (PRIORITY_ORDER as readonly string[]).includes(p) ? p : "all";
  })();
  const initialStatus = (() => {
    const s = searchParams.get("status");
    return s && ["pending", "assigned", "in_progress", "resolved"].includes(s) ? s : "all";
  })();
  const [items, setItems] = useState<Complaint[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>(initialPriority);
  const [sortByPriority, setSortByPriority] = useState<boolean>(true);
  const [editing, setEditing] = useState<Complaint | null>(null);
  const [viewing, setViewing] = useState<Complaint | null>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const [editDepartment, setEditDepartment] = useState<string>("none");
  const [editPriority, setEditPriority] = useState<Priority>("P3");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("complaints").select("*").order("created_at", { ascending: false });
    const list = (data as any[]) ?? [];
    setItems(list);
    const ids = Array.from(new Set(list.map(c => c.created_by)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,name,email").in("id", ids);
      const map: Record<string, Profile> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  // Live-refresh when departments/students change complaint status.
  useComplaintsRealtime(load, "admin-complaints");

  const filtered = useMemo(() => items.filter(c =>
    (statusFilter === "all" || c.status === statusFilter) &&
    (categoryFilter === "all" || c.category === categoryFilter) &&
    (priorityFilter === "all" || c.priority === priorityFilter)
  ).sort((a, b) => {
    if (sortByPriority) {
      const diff = priorityRank(a.priority) - priorityRank(b.priority);
      if (diff !== 0) return diff;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }), [items, statusFilter, categoryFilter, priorityFilter, sortByPriority]);

  const openEdit = (c: Complaint) => {
    setEditing(c);
    setEditStatus(c.status);
    setEditDepartment(c.department ?? "none");
    setEditPriority((c.priority ?? "P3") as Priority);
    setEditNotes(c.admin_notes ?? "");
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const dept = editDepartment === "none" ? null : (editDepartment as any);
    // If a department is being assigned and complaint is still pending, auto-promote to "assigned".
    let status = editStatus;
    if (dept && status === "pending") status = "assigned";
    const { error } = await supabase.from("complaints").update({
      status: status as any,
      department: dept,
      priority: editPriority as any,
      admin_notes: editNotes || null,
    }).eq("id", editing.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    setEditing(null);
    load();
  };

  return (
    <AppLayout>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl">All complaints</h1>
          <p className="text-muted-foreground mt-1">Triage, update, and resolve.</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="hostel">Hostel</SelectItem>
              <SelectItem value="academics">Academics</SelectItem>
              <SelectItem value="transport">Transport</SelectItem>
              <SelectItem value="infrastructure">Infrastructure</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITY_ORDER.map(p => (
                <SelectItem key={p} value={p}>{PRIORITY_META[p].full}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={sortByPriority ? "default" : "outline"}
            size="sm"
            onClick={() => setSortByPriority(s => !s)}
            title="Toggle sort by priority"
          >
            {sortByPriority ? "Sorted: Priority" : "Sort: Newest"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center bg-card border border-border rounded-xl text-muted-foreground">No complaints match your filters.</div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
          <ul className="divide-y divide-border">
            {filtered.map(c => {
              const p = profiles[c.created_by];
              return (
                <li
                  key={c.id}
                  className="p-5 flex flex-col md:flex-row gap-4 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => setViewing(c)}
                >
                  {c.image_url && <img src={c.image_url} alt="" className="h-24 w-24 md:w-28 rounded-md object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                            <Hash className="h-2.5 w-2.5 inline -mt-0.5" />{c.ticket_number ?? c.id.slice(0, 8)}
                          </span>
                          {c.parent_id && (
                            <span className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">Follow-up</span>
                          )}
                          <PriorityBadge priority={c.priority} />
                          <h3 className="font-display text-lg leading-snug">{c.title}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {c.category} · by {c.is_anonymous ? "Anonymous" : (p?.name ?? "Student")} · {new Date(c.created_at).toLocaleDateString()}
                          {c.upvotes > 0 && <span className="normal-case"> · ▲ {c.upvotes}</span>}
                        </p>
                        {c.room_number && (
                          <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {c.room_number}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{c.description}</p>
                    {c.department && (
                      <p className="text-xs text-primary mt-2 inline-flex items-center gap-1 capitalize">
                        <Building2 className="h-3 w-3" /> Routed to {c.department}
                      </p>
                    )}
                    {c.admin_notes && (
                      <p className="text-xs text-foreground/80 bg-secondary rounded px-2 py-1 mt-2 inline-block">
                        Note: {c.admin_notes}
                      </p>
                    )}
                    {c.is_rated && c.rating != null && (
                      <div className={"mt-2 inline-flex items-center gap-2 rounded px-2 py-1 " + (c.rating <= 2 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
                        {c.rating <= 2 && <AlertTriangle className="h-3 w-3" />}
                        <StarRating value={c.rating} readOnly size="sm" />
                        {c.feedback && <span className="text-xs italic text-foreground/80">"{c.feedback}"</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>Manage</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Detail view (read-only) */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 flex-wrap">
              {viewing && (
                <>
                  <span className="text-[11px] font-mono font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                    <Hash className="h-2.5 w-2.5 inline -mt-0.5" />{viewing.ticket_number ?? viewing.id.slice(0, 8)}
                  </span>
                  {viewing.parent_id && (
                    <span className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">Follow-up</span>
                  )}
                  <PriorityBadge priority={viewing.priority} />
                  <span>{viewing.title}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={viewing.status} />
                <span className="text-xs text-muted-foreground capitalize">
                  {viewing.category} · by {viewing.is_anonymous ? "Anonymous" : (profiles[viewing.created_by]?.name ?? "Student")}
                  {!viewing.is_anonymous && profiles[viewing.created_by]?.email ? ` (${profiles[viewing.created_by]?.email})` : ""} · {new Date(viewing.created_at).toLocaleString()}
                </span>
              </div>
              {viewing.room_number && (
                <p className="text-sm text-muted-foreground inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {viewing.room_number}
                </p>
              )}
              <p className="text-sm whitespace-pre-wrap">{viewing.description}</p>
              {viewing.image_url && (
                <img src={viewing.image_url} alt="" className="rounded-md max-h-72 w-full object-cover border border-border" />
              )}
              {viewing.department && (
                <p className="text-sm text-primary inline-flex items-center gap-1 capitalize">
                  <Building2 className="h-4 w-4" /> Routed to {viewing.department} department
                </p>
              )}
              {viewing.admin_notes && (
                <div className="p-3 bg-secondary rounded-md text-sm">
                  <span className="font-medium">Admin note:</span> {viewing.admin_notes}
                </div>
              )}
              {viewing.is_rated && viewing.rating != null && (
                <div className={"inline-flex items-center gap-2 rounded px-2 py-1 " + (viewing.rating <= 2 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
                  {viewing.rating <= 2 && <AlertTriangle className="h-3.5 w-3.5" />}
                  <StarRating value={viewing.rating} readOnly size="sm" />
                  {viewing.feedback && <span className="text-xs italic text-foreground/80">"{viewing.feedback}"</span>}
                </div>
              )}
              <div className="border-t border-border pt-4">
                <ComplaintThread complaintId={viewing.id} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setViewing(null)}>Close</Button>
            <Button onClick={() => { if (viewing) { const c = viewing; setViewing(null); openEdit(c); } }}>Manage</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="font-display">Manage complaint</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <PriorityBadge priority={editing.priority} full />
                  <p className="font-medium">{editing.title}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{editing.description}</p>
                {editing.room_number && (
                  <p className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {editing.room_number}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={editPriority} onValueChange={(v) => setEditPriority(v as Priority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_ORDER.map(p => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_META[p].full} · SLA {PRIORITY_META[p].slaLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Route to department</Label>
                <Select value={editDepartment} onValueChange={setEditDepartment}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not routed</SelectItem>
                    <SelectItem value="hostel">Hostel</SelectItem>
                    <SelectItem value="academics">Academics</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Routing a pending complaint will mark it as <span className="font-medium">Assigned</span> for the department.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Internal note</Label>
                <Textarea rows={4} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} maxLength={1000} placeholder="Add context for the student or your team" />
              </div>
              <div className="border-t border-border pt-4">
                <ComplaintThread complaintId={editing.id} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AdminComplaints;
