import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock, Loader2 } from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ClassFilter from "@/components/shared/ClassFilter";

const WEEKDAYS = [
  "Domenica",
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
];

export default function Schedule() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const isAdmin = user?.role === "admin";
  const [selectedClass, setSelectedClass] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["schedules", selectedClass ? "class" : "me", selectedClass],
    queryFn: async () => {
      if (selectedClass) {
        return (await api.get(`/schedules/class/${selectedClass}`)).data;
      }
      return (await api.get("/schedules/me")).data;
    },
  });

  const schedules = data?.schedules || [];
  const classInfo = data?.class;

  if (isLoading) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-fg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Clock}
        title="Orario settimanale"
        subtitle={
          selectedClass
            ? "Orario completo della classe selezionata"
            : isTeacher
              ? "Le tue lezioni programmate"
              : classInfo
                ? `Classe: ${classInfo.name}`
                : "Nessuna classe associata"
        }
      />

      {(isAdmin || isTeacher) && (
        <ClassFilter value={selectedClass} onChange={setSelectedClass} hideAll />
      )}

      {schedules.length === 0 ? (
        <EmptyState
          title={selectedClass ? "Nessun orario per questa classe" : "Nessuna lezione in orario"}
          description={selectedClass ? "L'orario per questa classe non è stato ancora configurato." : isAdmin ? "Seleziona una classe dal filtro in alto per visualizzarne l'orario completo." : "Contatta la segreteria se pensi ci sia un errore."}
        />
      ) : selectedClass ? (
        <StudentView schedules={schedules} />
      ) : isTeacher ? (
        <TeacherView schedules={schedules} />
      ) : (
        <StudentView schedules={schedules} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   VISTA STUDENTE — tabella orario della classe
   ════════════════════════════════════════════════════════════════ */
function StudentView({ schedules }) {
  const slots = [...new Set(schedules.map((s) => s.start_time))].sort();
  const days = [1, 2, 3, 4, 5];

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-panel/40 backdrop-blur-xl">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 border-b border-r border-border/60 bg-panel/90 p-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-fg">
              Ora
            </th>
            {days.map((d) => (
              <th
                key={d}
                className="border-b border-border/60 bg-panel/80 p-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-fg"
              >
                {WEEKDAYS[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, slotIdx) => (
            <tr key={slot}>
              <td className="sticky left-0 z-10 border-b border-r border-border/60 bg-panel/90 p-3 font-mono text-xs font-medium text-muted-fg">
                {slot}
              </td>
              {days.map((day) => {
                const lesson = schedules.find(
                  (s) => s.weekday === day && s.start_time === slot,
                );
                return (
                  <td
                    key={day}
                    className={cn(
                      "border-b border-border/60 p-2 align-top",
                      slotIdx % 2 === 0 ? "bg-elevated/20" : "bg-transparent",
                    )}
                  >
                    {lesson ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-lg bg-primary/10 p-2.5 ring-1 ring-primary/20"
                      >
                        <div className="font-semibold text-fg">
                          {lesson.subject}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-fg">
                          <span>{lesson.room}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-fg/80">
                          {lesson.teacher_name}
                        </div>
                      </motion.div>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   VISTA DOCENTE — ore raggruppate per giorno
   ════════════════════════════════════════════════════════════════ */
function TeacherView({ schedules }) {
  const days = [1, 2, 3, 4, 5];
  const byDay = days.map((day) => ({
    day,
    label: WEEKDAYS[day],
    items: schedules
      .filter((s) => s.weekday === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
  }));

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {byDay.map(({ day, label, items }, i) => (
        <motion.div
          key={day}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-xl border border-border/60 bg-panel/60 p-4 backdrop-blur-xl"
        >
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-fg">
            {label}
          </h3>
          {items.length === 0 ? (
            <p className="text-sm text-muted-fg/70">Nessuna lezione</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg bg-elevated/40 p-3 ring-1 ring-border/40"
                >
                  <div className="shrink-0 text-center">
                    <div className="font-mono text-xs font-bold text-fg">
                      {item.start_time}
                    </div>
                    <div className="font-mono text-[10px] text-muted-fg">
                      {item.end_time}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {item.subject}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-fg">
                      <Badge variant="outline" className="text-[10px]">
                        {item.class_name}
                      </Badge>
                      <span>{item.room}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
