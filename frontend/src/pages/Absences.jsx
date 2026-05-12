import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { CalendarOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";

export default function Absences() {
  const { user } = useAuth();
  const { data: absences = [], isLoading } = useQuery({
    queryKey: ["absences"],
    queryFn: async () => (await api.get("/absences")).data.absences || [],
  });

  const total = absences.reduce((s, a) => s + (a.hours || 1), 0);
  const justified = absences
    .filter((a) => a.justified)
    .reduce((s, a) => s + (a.hours || 1), 0);
  const pending = total - justified;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarOff}
        title="Assenze"
        subtitle={
          user?.role === "student"
            ? "Il tuo registro presenze"
            : "Registro presenze classe"
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={CalendarOff}
          label="Ore totali"
          value={total}
          accent="primary"
        />
        <StatCard
          icon={CheckCircle2}
          label="Giustificate"
          value={justified}
          accent="success"
        />
        <StatCard
          icon={XCircle}
          label="Da giustificare"
          value={pending}
          accent="warning"
        />
      </div>

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-fg" />
        </div>
      ) : absences.length === 0 ? (
        <EmptyState
          title="Nessuna assenza"
          description="Presenza perfetta 🎯"
        />
      ) : (
        <div className="rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-elevated/50 text-xs uppercase tracking-widest text-muted-fg">
              <tr>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Studente</th>
                <th className="px-4 py-3 text-left">Classe</th>
                <th className="px-4 py-3 text-left">Ore</th>
                <th className="px-4 py-3 text-left">Stato</th>
                <th className="px-4 py-3 text-left">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {absences.map((a, i) => (
                <motion.tr
                  key={a.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-t border-border/40 hover:bg-elevated/30"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    {format(parseISO(a.date), "d MMM yyyy", { locale: it })}
                  </td>
                  <td className="px-4 py-3">{a.student_name}</td>
                  <td className="px-4 py-3 text-muted-fg">
                    {a.class_name || "—"}
                  </td>
                  <td className="px-4 py-3">{a.hours}</td>
                  <td className="px-4 py-3">
                    {a.justified ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="size-3.5" /> giustificata
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400">
                        <XCircle className="size-3.5" /> in attesa
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-fg">{a.reason || "—"}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
