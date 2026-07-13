import { cn } from "@/lib/utils";

export type Status = "pending" | "assigned" | "in_progress" | "resolved";

const map: Record<Status, { label: string; cls: string; dot: string }> = {
  pending: { label: "Pending", cls: "bg-warning/15 text-warning-foreground border-warning/40", dot: "bg-warning" },
  assigned: { label: "Assigned", cls: "bg-primary/10 text-primary border-primary/40", dot: "bg-primary" },
  in_progress: { label: "In Progress", cls: "bg-info/15 text-info border-info/40", dot: "bg-info" },
  resolved: { label: "Resolved", cls: "bg-success/15 text-success border-success/40", dot: "bg-success" },
};

export const StatusBadge = ({ status }: { status: Status }) => {
  const s = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", s.cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
};
