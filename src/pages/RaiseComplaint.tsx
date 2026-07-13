import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uuid } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, X, MapPin, Camera } from "lucide-react";

const schema = z.object({
  title: z.string().trim().min(4, "Title is too short").max(120),
  description: z.string().trim().min(10, "Please add more detail").max(2000),
  category: z.enum(["hostel", "academics", "transport", "infrastructure"]),
});

const RaiseComplaint = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Pre-fill from a scanned location QR: /complaints/new?loc=Block-A&cat=hostel
  const scannedLoc = params.get("loc");
  const scannedCat = params.get("cat");
  const VALID_CATS = ["hostel", "academics", "transport", "infrastructure"];
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(scannedCat && VALID_CATS.includes(scannedCat) ? scannedCat : "");
  const [roomNumber, setRoomNumber] = useState(scannedLoc ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onFile = (f: File | null) => {
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ title, description, category });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if (file && file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }

    setSubmitting(true);
    try {
      let image_url: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${uuid()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("complaint-images").upload(path, file);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("complaint-images").getPublicUrl(path);
        image_url = data.publicUrl;
      }
      const { error } = await supabase.from("complaints").insert({
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        image_url,
        created_by: user.id,
        room_number: roomNumber.trim() || null,
        is_public: isPublic,
        is_anonymous: isAnonymous,
      } as any);
      if (error) throw error;
      toast.success("Complaint submitted");
      navigate("/complaints");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl">Raise a complaint</h1>
        <p className="text-muted-foreground mt-1">Tell us what's happening. The more detail, the faster we can help.</p>
        {scannedLoc && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1.5">
            <MapPin className="h-3.5 w-3.5" /> Scanned location: {scannedLoc}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 sm:mt-8 space-y-6 bg-card border border-border rounded-xl p-5 sm:p-6 shadow-card">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hostel water supply down" maxLength={120} required />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Choose a category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hostel">Hostel</SelectItem>
                <SelectItem value="academics">Academics</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="infrastructure">Infrastructure</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="room">Room / Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="room" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="e.g. Block A, Room 204" maxLength={100} className="pl-9" />
            </div>
            <p className="text-xs text-muted-foreground">Enter the room or location related to this complaint.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Describe the issue, when it started, and any impact." maxLength={2000} required />
          </div>
          <div className="space-y-2">
            <Label>Photo (optional)</Label>
            {preview ? (
              <div className="relative inline-block">
                <img src={preview} alt="preview" className="h-40 rounded-lg border border-border object-cover" />
                <button type="button" onClick={() => onFile(null)}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground grid place-items-center">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col sm:flex-row items-center gap-3 border-2 border-dashed border-border rounded-lg px-4 py-7 cursor-pointer hover:border-primary transition-colors text-center sm:text-left">
                <Camera className="h-7 w-7 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">Tap to take a photo or upload from your gallery <span className="opacity-70">(max 5MB)</span></span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>
          <div className="space-y-3 pt-1 border-t border-border">
            <label className="flex items-start gap-3 cursor-pointer pt-3">
              <Checkbox checked={isPublic} onCheckedChange={(v) => setIsPublic(!!v)} className="mt-0.5" />
              <span className="text-sm leading-snug">
                <span className="font-medium">Show on the community board</span>
                <span className="block text-xs text-muted-foreground">Other students can see this and upvote if they're affected too — widely-reported issues get prioritized.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={isAnonymous} onCheckedChange={(v) => setIsAnonymous(!!v)} className="mt-0.5" />
              <span className="text-sm leading-snug">
                <span className="font-medium">Submit anonymously</span>
                <span className="block text-xs text-muted-foreground">Your name won't be shown to other students or the department. You can still track it in "My complaints".</span>
              </span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button type="submit" disabled={submitting} size="lg" className="w-full sm:w-auto">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Submit complaint
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate(-1)} className="w-full sm:w-auto">Cancel</Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default RaiseComplaint;
