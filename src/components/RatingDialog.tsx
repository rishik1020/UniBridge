import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/StarRating";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  rating: z.number().int().min(1, "Please select a rating").max(5),
  feedback: z.string().trim().max(1000, "Feedback must be 1000 characters or less").optional(),
});

interface RatingDialogProps {
  complaintId: string | null;
  complaintTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

export const RatingDialog = ({ complaintId, complaintTitle, open, onOpenChange, onSubmitted }: RatingDialogProps) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setRating(0); setFeedback(""); };

  const submit = async () => {
    if (!complaintId) return;
    const parsed = schema.safeParse({ rating, feedback: feedback || undefined });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("complaints")
      .update({
        rating: parsed.data.rating,
        feedback: parsed.data.feedback ?? null,
        is_rated: true,
        rated_at: new Date().toISOString(),
      })
      .eq("id", complaintId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks for your feedback!");
    reset();
    onSubmitted?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Rate the resolution</DialogTitle>
          <DialogDescription>
            {complaintTitle ? `How well was "${complaintTitle}" handled?` : "How well was your complaint handled?"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="flex flex-col items-center gap-2">
            <StarRating value={rating} onChange={setRating} size="lg" />
            <p className="text-xs text-muted-foreground h-4">
              {rating > 0 ? ["Poor", "Fair", "Good", "Great", "Excellent"][rating - 1] : "Tap a star to rate"}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback">Feedback <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="feedback"
              rows={4}
              maxLength={1000}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What worked well? What could be better?"
            />
            <p className="text-[11px] text-muted-foreground text-right">{feedback.length}/1000</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>Maybe later</Button>
          <Button onClick={submit} disabled={saving || rating === 0}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit rating
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};