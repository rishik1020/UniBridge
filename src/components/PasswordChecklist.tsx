import { Check, X } from "lucide-react";

const rules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character (@$!%*?&)", test: (p: string) => /[@$!%*?&]/.test(p) },
];

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

export const PasswordChecklist = ({ password }: { password: string }) => {
  if (!password) return null;
  return (
    <ul className="space-y-1 mt-2">
      {rules.map((r) => {
        const pass = r.test(password);
        return (
          <li key={r.label} className={`flex items-center gap-1.5 text-xs ${pass ? "text-green-600" : "text-muted-foreground"}`}>
            {pass ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {r.label}
          </li>
        );
      })}
    </ul>
  );
};