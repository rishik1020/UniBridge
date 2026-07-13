import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { KeyRound, Loader2, Search, Users } from "lucide-react";

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: "student" | "admin";
}

const AdminUsers = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [resetting, setResetting] = useState<AppUser | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-department", {
      body: { action: "list_resettable_users" },
    });
    if (error) { toast.error(error.message); setLoading(false); return; }
    setUsers(((data as any)?.users ?? []) as AppUser[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" /> User accounts
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manually reset passwords for students and administrators. Department logins are managed separately.
          </p>
        </div>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className="pl-8 w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No users found</CardTitle>
            <CardDescription>Try a different search.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((u) => (
            <Card key={u.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{u.name || "Unnamed"}</CardTitle>
                    <CardDescription className="truncate">{u.email}</CardDescription>
                  </div>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"} className="capitalize">
                    {u.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Button size="sm" variant="outline" onClick={() => setResetting(u)}>
                  <KeyRound className="h-3.5 w-3.5 mr-1.5" /> Reset password
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {resetting && (
        <ResetUserDialog user={resetting} onClose={() => setResetting(null)} />
      )}
    </AppLayout>
  );
};

const ResetUserDialog = ({ user, onClose }: { user: AppUser; onClose: () => void }) => {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("manage-department", {
      body: { action: "admin_reset_user_password", user_id: user.id, password },
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password reset. Share it securely with the user.");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password for {user.name || user.email}</DialogTitle>
          <DialogDescription>
            Set a temporary password and share it with the user. They can change it after signing in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>New password</Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Reset password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminUsers;
