import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UpdateRow {
  id: string;
  complaint_id: string;
  author_id: string;
  author_role: "student" | "admin" | "department";
  message: string;
  created_at: string;
}

const roleStyles: Record<string, string> = {
  student: "bg-secondary text-secondary-foreground",
  admin: "bg-primary/15 text-primary",
  department: "bg-info/15 text-info",
};

export const ComplaintThread = ({ complaintId }: { complaintId: string }) => {
  const { user, role } = useAuth();
  const [items, setItems] = useState<UpdateRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, { name: string }>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [posting, setPosting] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("complaint_updates")
      .select("*")
      .eq("complaint_id", complaintId)
      .order("created_at", { ascending: true });
    const list = ((data as any[]) ?? []) as UpdateRow[];
    setItems(list);
    const ids = Array.from(new Set(list.map(u => u.author_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,name").in("id", ids);
      const map: Record<string, { name: string }> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = { name: p.name }; });
      setAuthors(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`updates-${complaintId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "complaint_updates", filter: `complaint_id=eq.${complaintId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complaintId]);

  const send = async () => {
    if (!user || !role || !msg.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("complaint_updates").insert({
      complaint_id: complaintId,
      author_id: user.id,
      author_role: role,
      message: msg.trim(),
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setMsg("");
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageCircle className="h-4 w-4 text-muted-foreground" />
        Conversation
      </div>
      {loading ? (
        <div className="py-4 grid place-items-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No messages yet. Start the conversation below.</p>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {items.map(u => (
            <li key={u.id} className="bg-muted/40 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium", roleStyles[u.author_role])}>
                    {u.author_role}
                  </span>
                  <span className="text-xs font-medium">{authors[u.author_id]?.name ?? "User"}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(u.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{u.message}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2 items-end">
        <Textarea
          rows={2}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          maxLength={2000}
          placeholder="Write an update…"
          className="resize-none"
        />
        <Button size="sm" onClick={send} disabled={posting || !msg.trim()}>
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};