import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, KeyRound, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

type Category = "hostel" | "academics" | "transport" | "infrastructure";
const CATEGORIES: Category[] = ["hostel", "academics", "transport", "infrastructure"];

interface Department {
  id: string;
  category: Category;
  name: string;
  description: string | null;
  login_email: string;
  user_id: string;
  created_at: string;
}

const AdminDepartments = () => {
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [resetting, setResetting] = useState<Department | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setDepts((data ?? []) as Department[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (d: Department) => {
    if (!confirm(`Delete department "${d.name}"? Their login will stop working immediately.`)) return;
    const { error } = await supabase.functions.invoke("manage-department", {
      body: { action: "delete", id: d.id },
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Department deleted");
    load();
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" /> Departments
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Create and manage department logins. Departments sign in with the username and password you set here.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" /> New department</Button>
          </DialogTrigger>
          <CreateDialog onCreated={() => { setCreateOpen(false); load(); }} />
        </Dialog>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : depts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No departments yet</CardTitle>
            <CardDescription>Create your first department login to start routing complaints.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {depts.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{d.name}</CardTitle>
                    <CardDescription className="mt-1 capitalize">
                      {d.category} · {d.login_email}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="capitalize">{d.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setEditing(d)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setResetting(d)}>
                    <KeyRound className="h-3.5 w-3.5 mr-1.5" /> Reset password
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(d)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <EditDialog dept={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
      {resetting && (
        <ResetDialog dept={resetting} onClose={() => setResetting(null)} />
      )}
    </AppLayout>
  );
};

const CreateDialog = ({ onCreated }: { onCreated: () => void }) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("hostel");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Please enter a valid email address"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("manage-department", {
      body: { action: "create", name, category, description: description || null, email, password },
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Department created");
    onCreated();
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create department</DialogTitle>
        <DialogDescription>The department will sign in with this username and password.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label>Department name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Hostel Office" required />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div className="space-y-2">
          <Label>Login email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="department@university.edu"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create department
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

const EditDialog = ({ dept, onClose, onSaved }: { dept: Department; onClose: () => void; onSaved: () => void }) => {
  const [name, setName] = useState(dept.name);
  const [category, setCategory] = useState<Category>(dept.category);
  const [description, setDescription] = useState(dept.description ?? "");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("manage-department", {
      body: { action: "update", id: dept.id, name, category, description: description || null },
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Department updated");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit department</DialogTitle>
          <DialogDescription>Email: {dept.login_email} (cannot be changed)</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Department name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ResetDialog = ({ dept, onClose }: { dept: Department; onClose: () => void }) => {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("manage-department", {
      body: { action: "reset_password", id: dept.id, password },
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password reset");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password for {dept.name}</DialogTitle>
          <DialogDescription>Share the new password securely with the department.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>New password</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Reset password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminDepartments;
