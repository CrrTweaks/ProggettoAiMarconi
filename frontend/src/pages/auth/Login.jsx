import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, LogIn, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/store/auth";

export default function Login() {
  const { login, loading } = useAuth();
  const nav = useNavigate();
  const { state } = useLocation();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(email, pwd);
      nav(state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || "Accesso non riuscito");
    }
  };

  return (
    <AuthLayout title="Bentornato" subtitle={"Accedi a edu c<3re"}>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@scuola.it"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="pwd">Password</Label>
            <Link to="#" className="text-xs text-primary hover:underline">
              Password dimenticata?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="pwd"
              type={show ? "text" : "password"}
              required
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 grid size-7 place-items-center text-muted-fg hover:text-fg rounded-md"
            >
              {show ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="gradient"
          disabled={loading}
          className="w-full h-11"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogIn className="size-4" />
          )}
          Accedi
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-fg">
        Non hai un account?{" "}
        <Link
          to="/auth/register"
          className="text-primary font-medium hover:underline"
        >
          Registrati
        </Link>
      </div>

      <div className="mt-6 rounded-md border border-border/60 bg-elevated/40 p-3 text-xs text-muted-fg">
        <div className="font-semibold text-fg mb-1">Account demo</div>
        <div className="grid gap-0.5 font-mono">
          <div>admin@school.test · Admin123!</div>
          <div>rossi@school.test · Teacher123!</div>
          <div>conti@school.test · Student123!</div>
        </div>
      </div>
    </AuthLayout>
  );
}

export function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden grid-bg">
      {/* Sfere luminose */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 size-[40rem] rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 size-[40rem] rounded-full bg-accent/20 blur-3xl"
      />

      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Sinistra: pannello brand */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:flex flex-col justify-between p-12"
        >
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="edu c<3re" className="h-24 w-auto object-contain" />
          </Link>

          <div className="space-y-4 max-w-md">
            <h2 className="text-3xl font-bold leading-tight">
              Dove <span className="text-gradient">l'apprendimento</span>{" "}
              incontra <span className="text-gradient">l'intelligenza</span>.
            </h2>
            <p className="text-muted-fg">
              Calendario scolastico intelligente, registro elettronico, tutor AI
              locale, PDF RAG, mappe concettuali e voce — tutto in un'unica
              piattaforma curata nei minimi dettagli.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-4">
              {[
                ["AI Locale", "via Ollama"],
                ["PDF RAG", "pgvector + LangChain"],
                ["Mappe Concettuali", "generate dall'AI"],
                ["Voce", "Riconoscimento e sintesi"],
              ].map(([t, s]) => (
                <div
                  key={t}
                  className="rounded-lg border border-border/60 bg-panel/40 p-3 backdrop-blur"
                >
                  <div className="text-sm font-semibold">{t}</div>
                  <div className="text-xs text-muted-fg">{s}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-fg">
            © 2026 edu c{"<"}3re · Realizzato con React, FastAPI e Ollama
          </div>
        </motion.div>

        {/* Destra: card autenticazione */}
        <div className="flex items-center justify-center p-6 sm:p-12">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md glass-strong rounded-2xl p-8 shadow-2xl ring-1 ring-white/5"
          >
            <div className="mb-6 lg:hidden flex items-center">
              <img src="/logo.png" alt="edu c<3re" className="h-16 w-auto object-contain" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-fg">{subtitle}</p>
            )}
            <div className="mt-6">{children}</div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
