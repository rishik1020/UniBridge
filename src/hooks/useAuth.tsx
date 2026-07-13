import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "student" | "department" | null;
type Department = "hostel" | "academics" | "transport" | "infrastructure" | null;

interface AuthCtx {
  session: Session | null;
  user: User | null;
  role: Role;
  department: Department;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  role: null,
  department: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [department, setDepartment] = useState<Department>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // Drive everything off onAuthStateChange. supabase-js emits INITIAL_SESSION
    // only AFTER it has processed any OAuth code/token in the URL, so we never
    // release `loading` (and let ProtectedRoute bounce to /auth, dropping the
    // code) while a Google sign-in callback is still being exchanged.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Defer the DB call out of the auth callback (avoids the supabase-js
        // lock) and only finish loading once the role is known.
        setTimeout(() => {
          fetchRole(s.user!.id).finally(() => { if (active) setLoading(false); });
        }, 0);
      } else {
        setRole(null);
        setDepartment(null);
        setLoading(false);
      }
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role, department")
      .eq("user_id", userId);
    if (data && data.length > 0) {
      const adminRow = data.find((r: any) => r.role === "admin");
      const deptRow = data.find((r: any) => r.role === "department");
      if (adminRow) {
        setRole("admin");
        setDepartment(null);
      } else if (deptRow) {
        setRole("department");
        setDepartment((deptRow as any).department ?? null);
      } else {
        setRole("student");
        setDepartment(null);
      }
    } else {
      setRole("student");
      setDepartment(null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setDepartment(null);
  };

  return (
    <Ctx.Provider value={{ session, user, role, department, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
