import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/store/auth";
import { AuthLayout } from "./Login";

const ROLES = [
  { value: "student", label: "Studente" },
  { value: "teacher", label: "Docente" },
];

export default function Register() {
  const { register, loading } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "student",
    primary_subject: "",
  });

  const upd = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("La password deve avere almeno 8 caratteri");
      return;
    }
    try {
      await register(form);
      nav("/", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || "Registrazione non riuscita");
    }
  };

  return (
    <AuthLayout
      title="Crea il tuo account"
      subtitle={"Entra in edu c<3re in pochi secondi"}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            required
            value={form.full_name}
            onChange={upd("full_name")}
            placeholder="Mario Rossi"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={upd("email")}
            placeholder="nome@scuola.it"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pwd">Password</Label>
          <Input
            id="pwd"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={upd("password")}
            placeholder="Almeno 8 caratteri"
          />
        </div>
        <div className="space-y-2">
          <Label>Ruolo</Label>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    role: r.value,
                    primary_subject:
                      r.value === "student" ? "" : f.primary_subject,
                  }))
                }
                className={
                  "rounded-md border px-4 py-2 text-sm font-medium transition-colors " +
                  (form.role === r.value
                    ? "border-primary bg-primary/10 text-fg ring-1 ring-primary/30"
                    : "border-border bg-elevated/40 text-muted-fg hover:text-fg")
                }
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {form.role === "teacher" && (
          <div className="space-y-2">
            <Label htmlFor="subject">Materia principale</Label>
            <Input
              id="subject"
              required
              value={form.primary_subject}
              onChange={upd("primary_subject")}
              placeholder="Es. Matematica, Italiano, Storia…"
            />
          </div>
        )}

        <Button
          type="submit"
          variant="gradient"
          disabled={loading}
          className="w-full h-11"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserPlus className="size-4" />
          )}
          Crea account
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-fg">
        Hai già un account?{" "}
        <Link
          to="/auth/login"
          className="text-primary font-medium hover:underline"
        >
          Accedi
        </Link>
      </div>
    </AuthLayout>
  );
}
