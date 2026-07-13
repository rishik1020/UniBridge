import { Check, Clock, FileText, Sparkles, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "pending" | "assigned" | "in_progress" | "resolved";

const steps: { key: Status; label: string; icon: typeof FileText }[] = [
  { key: "pending", label: "Submitted", icon: FileText },
  { key: "assigned", label: "Assigned", icon: UserCheck },
  { key: "in_progress", label: "In Progress", icon: Clock },
  { key: "resolved", label: "Completed", icon: Sparkles },
];

const order: Record<Status, number> = {
  pending: 0,
  assigned: 1,
  in_progress: 2,
  resolved: 3,
};

export const ComplaintTimeline = ({ status }: { status: Status }) => {
  const current = order[status];
  return (
    <ol className="flex items-stretch gap-2 w-full">
      {steps.map((s, i) => {
        const reached = i <= current;
        const isCurrent = i === current;
        const Icon = reached ? Check : s.icon;
        return (
          <li key={s.key} className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-7 w-7 rounded-full grid place-items-center flex-shrink-0 transition-colors",
                  reached
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                  isCurrent && "ring-2 ring-primary/30"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 rounded-full",
                    i < current ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
            <p
              className={cn(
                "text-[11px] mt-1.5 font-medium",
                reached ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {s.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
};