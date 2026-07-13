import { cn } from "@/lib/utils";
import { PRIORITY_META, type Priority } from "@/lib/priority";
import { AlertTriangle } from "lucide-react";

interface Props {
  priority: Priority | null | undefined;
  className?: string;
  /** Show "P1 Critical" instead of just "P1" */
  full?: boolean;
  size?: "sm" | "md";
}

export const PriorityBadge = ({ priority, className, full = false, size = "md" }: Props) => {
  const p: Priority = (priority ?? "P3") as Priority;
  const meta = PRIORITY_META[p];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold tracking-wide",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        meta.badge,
        className
      )}
      title={`${meta.full} · SLA ${meta.slaLabel}`}
    >
      {p === "P1" && <AlertTriangle className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />}
      {full ? meta.full : meta.label}
    </span>
  );
};
