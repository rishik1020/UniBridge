import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, FilePlus2, ListChecks, ShieldCheck, LogOut, GraduationCap, Building2, BarChart3, Flame, QrCode } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";

const studentNav = [
  { to: "/dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { to: "/complaints/new", label: "Raise Complaint", short: "Raise", icon: FilePlus2 },
  { to: "/complaints", label: "My Complaints", short: "Mine", icon: ListChecks },
  { to: "/trending", label: "Trending", short: "Trending", icon: Flame },
];

const adminNav = [
  { to: "/admin", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { to: "/admin/complaints", label: "All Complaints", short: "Tickets", icon: ShieldCheck },
  { to: "/admin/analytics", label: "Analytics", short: "Stats", icon: BarChart3 },
  { to: "/admin/qr", label: "QR Codes", short: "QR", icon: QrCode },
  { to: "/admin/departments", label: "Departments", short: "Depts", icon: Building2 },
];

const departmentNav = [
  { to: "/department", label: "Assigned Tasks", short: "Tasks", icon: Building2 },
];

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { role, department, user, signOut } = useAuth();
  const navigate = useNavigate();
  const items = role === "admin" ? adminNav : role === "department" ? departmentNav : studentNav;
  const showBottomNav = items.length > 1;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex w-full bg-soft">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="px-6 py-6 flex items-center gap-2 border-b border-sidebar-border">
          <div className="h-9 w-9 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg leading-none">Uni Bridge</p>
            <p className="text-xs opacity-60 mt-0.5 capitalize">
              {role === "department" && department ? `${department} dept` : `${role ?? ""} portal`}
            </p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )
              }
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs opacity-60 truncate mb-2">{user?.email}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-sidebar text-sidebar-foreground shadow-sm">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center">
              <GraduationCap className="h-4.5 w-4.5" />
            </div>
            <div className="leading-tight">
              <span className="font-display text-base block">Uni Bridge</span>
              <span className="text-[10px] opacity-60 capitalize block -mt-0.5">
                {role === "department" && department ? `${department} dept` : `${role ?? ""}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-sidebar-foreground hover:bg-sidebar-accent">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Desktop notification bell */}
        <div className="hidden md:flex justify-end px-8 pt-4 [&_button[aria-label='Notifications']]:text-foreground [&_button[aria-label='Notifications']]:hover:bg-muted">
          <NotificationBell />
        </div>

        <main
          className={cn(
            "flex-1 p-4 md:px-8 md:pb-8 md:pt-2 max-w-6xl w-full mx-auto animate-fade-in",
            showBottomNav ? "pb-24" : "pb-8"
          )}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      {showBottomNav && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur border-t border-border flex justify-around pb-[env(safe-area-inset-bottom)]">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn("grid place-items-center h-8 w-8 rounded-lg transition-colors", isActive && "bg-primary/10")}>
                    <it.icon className="h-5 w-5" />
                  </span>
                  <span className="leading-none">{it.short ?? it.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
};
