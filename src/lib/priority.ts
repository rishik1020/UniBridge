export type Priority = "P1" | "P2" | "P3" | "P4";

export const PRIORITY_ORDER: Priority[] = ["P1", "P2", "P3", "P4"];

export const PRIORITY_META: Record<Priority, {
  label: string;
  full: string;
  /** Tailwind classes for a colored badge (semantic tokens) */
  badge: string;
  /** SLA in hours */
  slaHours: number;
  /** Human SLA */
  slaLabel: string;
}> = {
  P1: {
    label: "P1",
    full: "P1 Critical",
    badge: "bg-destructive/15 text-destructive border-destructive/30",
    slaHours: 24,
    slaLabel: "24 hours",
  },
  P2: {
    label: "P2",
    full: "P2 High",
    badge: "bg-warning/15 text-warning border-warning/30",
    slaHours: 48,
    slaLabel: "48 hours",
  },
  P3: {
    label: "P3",
    full: "P3 Medium",
    badge: "bg-info/15 text-info border-info/30",
    slaHours: 72,
    slaLabel: "72 hours",
  },
  P4: {
    label: "P4",
    full: "P4 Low",
    badge: "bg-success/15 text-success border-success/30",
    slaHours: 120,
    slaLabel: "5 days",
  },
};

/** Lower index = higher priority. P1 < P2 < P3 < P4 */
export const priorityRank = (p: Priority | null | undefined): number =>
  p ? PRIORITY_ORDER.indexOf(p) : PRIORITY_ORDER.length;
