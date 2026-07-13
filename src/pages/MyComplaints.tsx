import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { ComplaintThread } from "@/components/ComplaintThread";
import { ComplaintTimeline } from "@/components/ComplaintTimeline";
import { StarRating } from "@/components/StarRating";
import { RatingDialog } from "@/components/RatingDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FilePlus2, Loader2, Building2, MessageCircle, Star, MapPin, RotateCcw, Hash } from "lucide-react";
import { toast } from "sonner";
import { PriorityBadge } from "@/components/PriorityBadge";
import { PRIORITY_META, type Priority } from "@/lib/priority";
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
  created_at: string;
  rating: number | null;
  feedback: string | null;
  is_rated: boolean;
  room_number: string | null;
}

const MyComplaints = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Complaint | null>(null);
  const [rateOpen, setRateOpen] = useState<Complaint | null>(null);
  const [followUpFor, setFollowUpFor] = useState<Complaint | null>(null);
  const [followUpReason, setFollowUpReason] = useState("");
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  // Reopen a resolved issue as a linked follow-up ticket (001 → 001-a), with the
  // student's explanation of what remains unresolved attached for admin + dept.
  const submitFollowUp = async () => {
    if (!user || !followUpFor) return;
    const reason = followUpReason.trim();
    if (reason.length < 10) {
      toast.error("Please describe what still needs to be resolved (at least 10 characters).");
      return;
    }
    setSubmittingFollowUp(true);
    const c = followUpFor;
    const rootId = c.parent_id ?? c.id;
    const { data: created, error } = await supabase.from("complaints").insert({
      title: c.title,
      description: reason,
      category: c.category as any,
      room_number: c.room_number,
      image_url: c.image_url,
      priority: c.priority as any,
      created_by: user.id,
      parent_id: rootId,
    } as any).select("id").single();
    if (error) { setSubmittingFollowUp(false); toast.error(error.message); return; }
    // Also post the explanation into the conversation so admin + department see it inline.
    if (created?.id) {
      await supabase.from("complaint_updates").insert({
        complaint_id: created.id,
        author_id: user.id,
        author_role: "student",
        message: `Reopened — the issue is still unresolved. ${reason}`,
      } as any);
    }
    setSubmittingFollowUp(false);
    setFollowUpFor(null);
    setFollowUpReason("");
    toast.success("Follow-up ticket raised — an admin will re-triage it.");
    load();
  };

  const load = () => {
    if (!user) return;
    setLoading(true);
    supabase.from("complaints").select("*").eq("created_by", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => { setItems((data as any) ?? []); setLoading(false); });
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);
  // Live-refresh so students see status/notes update as departments work.
  useComplaintsRealtime(() => { if (user) load(); }, user?.id ?? "anon");

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl">My complaints</h1>
          <p className="text-muted-foreground mt-1">Track the status of every issue you've raised.</p>
        </div>
        <Button asChild><Link to="/complaints/new"><FilePlus2 className="h-4 w-4 mr-2" /> New</Link></Button>
      </div>

      {loading ? (
        <div className="p-12 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="p-16 text-center bg-card border border-border rounded-xl">
          <p className="text-muted-foreground mb-4">No complaints yet.</p>
          <Button asChild><Link to="/complaints/new">Raise your first complaint</Link></Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map(c => (
            <article key={c.id} className="bg-card border border-border rounded-xl shadow-card overflow-hidden hover:shadow-elegant transition-shadow flex flex-col">
              {c.image_url && (
                <img src={c.image_url} alt={c.title} className="w-full h-40 object-cover" />
              )}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] font-mono font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                    <Hash className="h-2.5 w-2.5 inline -mt-0.5" />{c.ticket_number ?? c.id.slice(0, 8)}
                  </span>
                  {c.parent_id && (
                    <span className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">Follow-up</span>
                  )}
                </div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-display text-lg leading-snug">{c.title}</h3>
                  <StatusBadge status={c.status} />
                </div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <PriorityBadge priority={c.priority} />
                  <p className="text-xs text-muted-foreground capitalize">
                    {c.category} · {new Date(c.created_at).toLocaleDateString()} · SLA {PRIORITY_META[(c.priority ?? "P3") as Priority].slaLabel}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">{c.description}</p>
                {c.department && (
                  <p className="text-xs text-primary mt-3 inline-flex items-center gap-1 capitalize">
                    <Building2 className="h-3 w-3" /> Handled by {c.department} dept
                  </p>
                )}
                {c.room_number && (
                  <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {c.room_number}
                  </p>
                )}
                {c.admin_notes && (
                  <div className="mt-4 p-3 bg-secondary rounded-md">
                    <p className="text-xs font-medium text-secondary-foreground mb-1">Admin note</p>
                    <p className="text-sm">{c.admin_notes}</p>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-border">
                  <ComplaintTimeline status={c.status} />
                </div>
                {c.status === "resolved" && (
                  <div className="mt-4 pt-3 border-t border-border">
                    {c.is_rated ? (
                      <div className="flex flex-col gap-2 bg-success/5 border border-success/20 rounded-md p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-success uppercase tracking-wider">Your rating</span>
                          <StarRating value={c.rating ?? 0} readOnly size="sm" />
                        </div>
                        {c.feedback && (
                          <p className="text-sm text-foreground/80 italic">"{c.feedback}"</p>
                        )}
                      </div>
                    ) : (
                      <Button variant="default" size="sm" className="w-full" onClick={() => setRateOpen(c)}>
                        <Star className="h-4 w-4 mr-2" /> Rate this resolution
                      </Button>
                    )}
                  </div>
                )}
                {c.status === "resolved" && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-muted-foreground"
                      onClick={() => { setFollowUpReason(""); setFollowUpFor(c); }}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Issue not resolved? Raise a follow-up
                    </Button>
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-border">
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => setOpen(c)}>
                    <MessageCircle className="h-4 w-4 mr-2" /> Conversation
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle className="font-display">{open?.title}</DialogTitle></DialogHeader>
          {open && <ComplaintThread complaintId={open.id} />}
        </DialogContent>
      </Dialog>

      <RatingDialog
        complaintId={rateOpen?.id ?? null}
        complaintTitle={rateOpen?.title}
        open={!!rateOpen}
        onOpenChange={(o) => !o && setRateOpen(null)}
        onSubmitted={load}
      />

      {/* Raise a follow-up — ask what still needs to be resolved */}
      <Dialog
        open={!!followUpFor}
        onOpenChange={(o) => { if (!o && !submittingFollowUp) { setFollowUpFor(null); setFollowUpReason(""); } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Reopen complaint</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="followup-reason">Please describe what still needs to be resolved</Label>
            <Textarea
              id="followup-reason"
              rows={4}
              maxLength={2000}
              value={followUpReason}
              onChange={(e) => setFollowUpReason(e.target.value)}
              placeholder="Explain what remains unresolved and what needs to be addressed — this helps the admin and the department understand what the previous fix missed."
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              This raises a linked follow-up ticket (e.g. 001-a) and shares your note with the admin and department.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" disabled={submittingFollowUp} onClick={() => { setFollowUpFor(null); setFollowUpReason(""); }}>
              Cancel
            </Button>
            <Button onClick={submitFollowUp} disabled={submittingFollowUp || followUpReason.trim().length < 10}>
              {submittingFollowUp ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Raise follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default MyComplaints;
