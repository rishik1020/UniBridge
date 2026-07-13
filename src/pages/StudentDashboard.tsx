import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilePlus2, Loader2, Inbox, MapPin, Save } from "lucide-react";
import { toast } from "sonner";
import { useComplaintsRealtime } from "@/hooks/useComplaintsRealtime";

interface Complaint {
  id: string;
  title: string;
  category: string;
  status: "pending" | "in_progress" | "resolved";
  created_at: string;
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomNumber, setRoomNumber] = useState("");
  const [savingRoom, setSavingRoom] = useState(false);

  const load = () => {
    if (!user) return;
    Promise.all([
      supabase.from("complaints").select("id,title,category,status,created_at")
        .eq("created_by", user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("room_number").eq("id", user.id).single(),
    ]).then(([{ data }, { data: profile }]) => {
      setComplaints((data as any) ?? []);
      if (profile?.room_number) setRoomNumber(profile.room_number);
      setLoading(false);
    });
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);
  // Live-refresh complaint statuses as departments/admins update them.
  useComplaintsRealtime(() => { if (user) load(); }, user?.id ?? "anon");

  const saveRoom = async () => {
    if (!user) return;
    setSavingRoom(true);
    const { error } = await supabase.from("profiles").update({ room_number: roomNumber.trim() || null } as any).eq("id", user.id);
    setSavingRoom(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Room / Location saved");
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl">Welcome back</h1>
          <p className="text-muted-foreground mt-1">Here's a snapshot of your complaints.</p>
        </div>
        <Button asChild><Link to="/complaints/new"><FilePlus2 className="h-4 w-4 mr-2" /> Raise complaint</Link></Button>
      </div>

      <div className="mb-6 bg-card border border-border rounded-xl p-5 shadow-card">
        <Label htmlFor="room" className="text-sm font-medium mb-2 block">Room / Location</Label>
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="room" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="e.g. Block A, Room 204" maxLength={100} className="pl-9" />
          </div>
          <Button size="sm" variant="outline" onClick={saveRoom} disabled={savingRoom}>
            {savingRoom ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1" /> Save</>}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">This will auto-fill when you raise a new complaint.</p>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h2 className="font-display text-lg">Recent complaints</h2>
          <Link to="/complaints" className="text-sm text-primary hover:underline">View all →</Link>
        </div>
        {loading ? (
          <div className="p-12 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : complaints.length === 0 ? (
          <div className="px-6 py-16 sm:py-20">
            <div className="mx-auto max-w-md flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div aria-hidden className="absolute inset-0 -z-10 blur-2xl opacity-60 bg-primary/15 rounded-full" />
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-muted to-background border border-border shadow-sm grid place-items-center">
                  <Inbox className="h-7 w-7 text-muted-foreground" />
                </div>
              </div>
              <h3 className="font-display text-xl sm:text-2xl tracking-tight">No issues reported yet</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                If you're facing any problem on campus, raise a complaint and track its progress in real time.
              </p>
              <Button asChild className="mt-6 transition-all duration-200 hover:scale-[1.03] hover:shadow-md">
                <Link to="/complaints/new">
                  <FilePlus2 className="h-4 w-4 mr-2" /> Report an Issue
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {complaints.slice(0, 5).map(c => (
              <li key={c.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-muted/40 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{c.category} · {new Date(c.created_at).toLocaleDateString()}</p>
                </div>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
};

export default StudentDashboard;
