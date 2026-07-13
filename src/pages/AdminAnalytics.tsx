import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie, Legend, AreaChart, Area,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useComplaintsRealtime } from "@/hooks/useComplaintsRealtime";
import { PRIORITY_META, PRIORITY_ORDER, type Priority } from "@/lib/priority";
import {
  Loader2, ListChecks, CheckCircle2, AlertTriangle, RotateCcw, Star, MapPin, BarChart3,
} from "lucide-react";

interface Row {
  id: string;
  parent_id: string | null;
  category: string;
  department: string | null;
  status: "pending" | "assigned" | "in_progress" | "resolved";
  priority: Priority;
  created_at: string;
  updated_at: string;
  rating: number | null;
  is_rated: boolean;
  room_number: string | null;
}

const C = {
  primary: "hsl(222 60% 16%)",
  accent: "hsl(38 80% 52%)",
  success: "hsl(152 55% 36%)",
  warning: "hsl(42 90% 50%)",
  info: "hsl(215 75% 48%)",
  destructive: "hsl(0 72% 48%)",
  p2: "hsl(24 85% 52%)",
  grey: "hsl(222 15% 55%)",
  grid: "hsl(222 20% 90%)",
  axis: "hsl(222 15% 45%)",
};

const CATS = ["hostel", "academics", "transport", "infrastructure"] as const;
const CAT_LABEL: Record<string, string> = { hostel: "Hostel", academics: "Academics", transport: "Transport", infrastructure: "Infrastructure" };
const CAT_COLOR: Record<string, string> = { hostel: C.primary, academics: C.info, transport: C.warning, infrastructure: C.accent };
const STATUS_DEFS: [Row["status"], string, string][] = [
  ["pending", "Pending", C.warning], ["assigned", "Assigned", C.info],
  ["in_progress", "In Progress", C.accent], ["resolved", "Resolved", C.success],
];
const PRIO_COLOR: Record<Priority, string> = { P1: C.destructive, P2: C.p2, P3: C.info, P4: C.grey };

const tooltipStyle = { background: "hsl(0 0% 100%)", border: "1px solid hsl(222 20% 88%)", borderRadius: 8, fontSize: 12 } as const;
const axisTick = { fontSize: 11, fill: C.axis } as const;

const ChartCard = ({ title, subtitle, icon: Icon, children }: { title: string; subtitle?: string; icon?: any; children: React.ReactNode }) => (
  <div className="bg-card border border-border rounded-xl p-5 shadow-card">
    <h2 className="font-display text-lg flex items-center gap-2">{Icon && <Icon className="h-5 w-5 text-primary" />}{title}</h2>
    {subtitle && <p className="text-xs text-muted-foreground mt-0.5 mb-3">{subtitle}</p>}
    <div className={subtitle ? "" : "mt-3"}>{children}</div>
  </div>
);

const AdminAnalytics = () => {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("complaints")
      .select("id,parent_id,category,department,status,priority,created_at,updated_at,rating,is_rated,room_number");
    setItems((data as any[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useComplaintsRealtime(load, "admin-analytics");

  const a = useMemo(() => {
    const total = items.length;
    const resolved = items.filter(c => c.status === "resolved").length;
    const followUps = items.filter(c => c.parent_id).length;
    const now = Date.now();
    const overdue = items.filter(c =>
      c.status !== "resolved" &&
      now > new Date(c.created_at).getTime() + (PRIORITY_META[c.priority]?.slaHours ?? 72) * 3_600_000
    ).length;

    const category = CATS.map(cat => ({ name: CAT_LABEL[cat], value: items.filter(c => c.category === cat).length, fill: CAT_COLOR[cat] }));
    const status = STATUS_DEFS.map(([k, name, fill]) => ({ name, value: items.filter(c => c.status === k).length, fill })).filter(s => s.value > 0);
    const priority = PRIORITY_ORDER.map(p => ({ name: p, value: items.filter(c => c.priority === p).length, fill: PRIO_COLOR[p] }));

    // Trend by day
    const dayMap = new Map<string, number>();
    for (const c of items) {
      const key = new Date(c.created_at).toISOString().slice(0, 10);
      dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
    }
    const trend = Array.from(dayMap.entries()).sort((x, y) => x[0].localeCompare(y[0]))
      .map(([date, count]) => ({ date, count, label: new Date(date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) }));

    // Top problem locations
    const locMap = new Map<string, number>();
    for (const c of items) {
      const r = (c.room_number ?? "").trim();
      if (r) locMap.set(r, (locMap.get(r) ?? 0) + 1);
    }
    const locations = Array.from(locMap.entries()).map(([room, count]) => ({ room, count })).sort((x, y) => y.count - x.count).slice(0, 8);
    const locMax = locations[0]?.count ?? 1;

    // Department ratings
    const rated = items.filter(c => c.is_rated && c.rating != null && c.department);
    const g: Record<string, number[]> = {};
    rated.forEach(c => { (g[c.department as string] ??= []).push(c.rating as number); });
    const deptRatings = Object.entries(g).map(([department, rs]) => ({
      department: CAT_LABEL[department] ?? department,
      avg: +(rs.reduce((s, n) => s + n, 0) / rs.length).toFixed(2),
      count: rs.length,
    })).sort((x, y) => y.avg - x.avg);
    const lowRatings = rated.filter(c => (c.rating as number) <= 2).length;

    return {
      total, resolved, followUps, overdue,
      resolutionRate: total ? Math.round(resolved / total * 100) : 0,
      reopenRate: total ? Math.round(followUps / total * 100) : 0,
      lowRatings,
      category, status, priority, trend, locations, locMax, deptRatings,
    };
  }, [items]);

  const kpis = [
    { label: "Total complaints", value: a.total, icon: ListChecks, tone: "text-primary bg-primary/10" },
    { label: "Resolution rate", value: `${a.resolutionRate}%`, icon: CheckCircle2, tone: "text-success bg-success/10" },
    { label: "Overdue (SLA breach)", value: a.overdue, icon: AlertTriangle, tone: "text-destructive bg-destructive/10" },
    { label: "Reopen rate", value: `${a.reopenRate}%`, icon: RotateCcw, tone: "text-warning bg-warning/10" },
    { label: "Low ratings (1–2★)", value: a.lowRatings, icon: Star, tone: "text-accent bg-accent/10" },
  ];

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl flex items-center gap-2"><BarChart3 className="h-7 w-7 text-primary" /> Analytics</h1>
        <p className="text-muted-foreground mt-1">Where the issues concentrate — categories, locations, trends, and quality.</p>
      </div>

      {loading ? (
        <div className="p-20 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : a.total === 0 ? (
        <div className="p-16 text-center bg-card border border-border rounded-xl text-muted-foreground">No complaints yet — analytics will appear as complaints come in.</div>
      ) : (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {kpis.map(k => (
              <div key={k.label} className="bg-card border border-border rounded-xl p-4 shadow-card">
                <div className={`h-9 w-9 rounded-lg grid place-items-center ${k.tone}`}><k.icon className="h-4 w-4" /></div>
                <p className="font-display text-2xl mt-3 tabular-nums">{k.value}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Trend — full width */}
          <ChartCard title="Complaints over time" subtitle="Volume of complaints raised per day">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={a.trend} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.primary} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.primary} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: C.grid }} />
                <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: C.axis }} />
                <Area type="monotone" dataKey="count" name="Complaints" stroke={C.primary} strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Category + Status */}
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Complaints by category" subtitle="Which area of campus generates the most issues" icon={BarChart3}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={a.category} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={{ stroke: C.grid }} />
                  <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={28} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(222 20% 92% / 0.5)" }} />
                  <Bar dataKey="value" name="Complaints" radius={[6, 6, 0, 0]}>
                    {a.category.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Status mix" subtitle="Where complaints sit in the pipeline">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={a.status} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {a.status.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Priority + Locations */}
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Priority distribution" subtitle="Severity across all complaints">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={a.priority} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="name" tick={axisTick} tickLine={false} axisLine={{ stroke: C.grid }} />
                  <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={28} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(222 20% 92% / 0.5)" }} />
                  <Bar dataKey="value" name="Complaints" radius={[6, 6, 0, 0]}>
                    {a.priority.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top problem locations" subtitle="Rooms / blocks with the most complaints" icon={MapPin}>
              {a.locations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No location data yet.</p>
              ) : (
                <ul className="space-y-2.5 mt-1">
                  {a.locations.map((l, i) => (
                    <li key={l.room} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-4 tabular-nums">{i + 1}</span>
                      <span className="text-sm font-medium w-28 truncate">{l.room}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(l.count / a.locMax) * 100}%` }} />
                      </div>
                      <span className="text-sm tabular-nums w-6 text-right">{l.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </ChartCard>
          </div>

          {/* Department quality */}
          <ChartCard title="Department performance" subtitle="Average student rating per department (issues that came back count against them)" icon={Star}>
            {a.deptRatings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No ratings yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(160, a.deptRatings.length * 56)}>
                <BarChart layout="vertical" data={a.deptRatings} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
                  <XAxis type="number" domain={[0, 5]} tick={axisTick} tickLine={false} axisLine={{ stroke: C.grid }} />
                  <YAxis type="category" dataKey="department" tick={axisTick} tickLine={false} axisLine={false} width={90} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(222 20% 92% / 0.5)" }} formatter={(v: any) => [`${v} ★`, "Avg rating"]} />
                  <Bar dataKey="avg" name="Avg rating" radius={[0, 6, 6, 0]} barSize={22}>
                    {a.deptRatings.map((d, i) => <Cell key={i} fill={d.avg <= 2.5 ? C.destructive : d.avg < 4 ? C.warning : C.success} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}
    </AppLayout>
  );
};

export default AdminAnalytics;
