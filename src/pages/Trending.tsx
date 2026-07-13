import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge, type Status } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useComplaintsRealtime } from "@/hooks/useComplaintsRealtime";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, ChevronUp, Flame, MapPin, FilePlus2, Hash, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Priority } from "@/lib/priority";

interface Item {
  id: string;
  ticket_number: string | null;
  title: string;
  description: string;
  category: string;
  status: Status;
  priority: Priority;
  room_number: string | null;
  upvotes: number;
  is_anonymous: boolean;
  created_by: string;
  created_at: string;
}

const Trending = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // `complaint_votes` and the new complaint columns aren't in the generated
  // Supabase types yet; cast to keep this file compiling (matches app style).
  const sb = supabase as any;

  const load = async () => {
    const [{ data }, votesRes] = await Promise.all([
      sb.from("complaints")
        .select("id,ticket_number,title,description,category,status,priority,room_number,upvotes,is_anonymous,created_by,created_at")
        .eq("is_public", true)
        .neq("status", "resolved")
        .order("upvotes", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(60),
      user ? sb.from("complaint_votes").select("complaint_id").eq("user_id", user.id) : Promise.resolve({ data: [] as any[] }),
    ]);
    setItems((data as any[]) ?? []);
    setVoted(new Set(((votesRes as any).data ?? []).map((v: any) => v.complaint_id)));
    setLoading(false);
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user?.id]);
  useComplaintsRealtime(() => { if (user) load(); }, user?.id ?? "anon");

  const toggleVote = async (item: Item) => {
    if (!user || busy) return;
    setBusy(item.id);
    const hasVoted = voted.has(item.id);
    // optimistic
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, upvotes: Math.max(0, i.upvotes + (hasVoted ? -1 : 1)) } : i));
    setVoted(prev => { const n = new Set(prev); hasVoted ? n.delete(item.id) : n.add(item.id); return n; });

    const { error } = hasVoted
      ? await sb.from("complaint_votes").delete().eq("complaint_id", item.id).eq("user_id", user.id)
      : await sb.from("complaint_votes").insert({ complaint_id: item.id, user_id: user.id });

    if (error) {
      // revert on failure
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, upvotes: Math.max(0, i.upvotes + (hasVoted ? 1 : -1)) } : i));
      setVoted(prev => { const n = new Set(prev); hasVoted ? n.add(item.id) : n.delete(item.id); return n; });
    }
    setBusy(null);
  };

  const maxVotes = useMemo(() => Math.max(1, ...items.map(i => i.upvotes)), [items]);

  return (
    <AppLayout>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2"><Flame className="h-7 w-7 text-accent" /> Trending issues</h1>
          <p className="text-muted-foreground mt-1 text-sm">Facing the same problem? Upvote it — the more reports, the faster it gets prioritized.</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link to="/complaints/new"><FilePlus2 className="h-4 w-4 mr-1.5" /> Raise new</Link></Button>
      </div>

      {loading ? (
        <div className="p-20 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center shadow-card">
          <Inbox className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No public issues yet. When students post to the community board, they'll show up here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c, idx) => {
            const hot = idx < 3 && c.upvotes >= 2;
            const hasVoted = voted.has(c.id);
            return (
              <article key={c.id} className="bg-card border border-border rounded-xl p-4 shadow-card flex gap-4">
                {/* Upvote */}
                <button
                  type="button"
                  onClick={() => toggleVote(c)}
                  disabled={busy === c.id}
                  aria-label={hasVoted ? "Remove upvote" : "Upvote"}
                  className={cn(
                    "shrink-0 w-14 rounded-lg border flex flex-col items-center justify-center py-2 transition-colors",
                    hasVoted ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                  )}
                >
                  {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronUp className={cn("h-5 w-5", hasVoted && "fill-current")} />}
                  <span className="font-display text-lg leading-none tabular-nums">{c.upvotes}</span>
                </button>

                {/* Body */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {c.ticket_number && (
                      <span className="text-[10px] font-mono font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">
                        <Hash className="h-2.5 w-2.5 inline -mt-0.5" />{c.ticket_number}
                      </span>
                    )}
                    <PriorityBadge priority={c.priority} size="sm" />
                    <StatusBadge status={c.status} />
                    {hot && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent"><Flame className="h-3 w-3" /> Hot</span>}
                  </div>
                  <h3 className="font-display text-lg leading-snug">{c.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{c.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap capitalize">
                    <span>{c.category}</span>
                    <span className="normal-case">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                    {c.room_number && <span className="inline-flex items-center gap-0.5 normal-case"><MapPin className="h-3 w-3" /> {c.room_number}</span>}
                    <span className="normal-case">{c.is_anonymous ? "Anonymous" : "Student"}</span>
                  </div>
                  {/* intensity bar */}
                  <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(c.upvotes / maxVotes) * 100}%` }} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

export default Trending;
