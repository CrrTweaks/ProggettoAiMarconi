import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  parseISO,
  addMonths,
  subMonths,
} from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Sparkles,
} from "lucide-react";

import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import { cn } from "@/lib/utils";

const TYPE_STYLES = {
  homework: "bg-primary/15 text-primary",
  exam: "bg-accent/15 text-accent",
  interrogation: "bg-amber-500/15 text-amber-300",
  lesson: "bg-emerald-500/15 text-emerald-300",
  event: "bg-elevated text-muted-fg",
};

export default function Calendar() {
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHint, setAiHint] = useState(null);

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data.classes || [],
  });

  const askAI = async () => {
    if (!classes.length) {
      toast.warning("Devi prima creare o iscriverti a una classe");
      return;
    }
    setAiLoading(true);
    try {
      const week = format(
        startOfWeek(selected, { weekStartsOn: 1 }),
        "yyyy-MM-dd",
      );
      const { data } = await api.post("/ai/suggest/exam-day", {
        class_id: classes[0].id,
        week_start: week,
      });
      setAiHint(data);
      const dayLabel = data.best_day
        ? format(parseISO(data.best_day), "EEEE d MMMM", { locale: it })
        : "—";
      toast.success(`Giorno consigliato: ${dayLabel}`);
    } catch (e) {
      toast.error(e.response?.data?.error || "AI non disponibile");
    } finally {
      setAiLoading(false);
    }
  };

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [cursor],
  );

  const { data: events = [] } = useQuery({
    queryKey: ["calendar", format(monthStart, "yyyy-MM")],
    queryFn: async () => {
      const { data } = await api.get("/calendar/events", {
        params: {
          from: format(gridStart, "yyyy-MM-dd"),
          to: format(gridEnd, "yyyy-MM-dd"),
        },
      });
      return data.events || [];
    },
  });

  const eventsByDay = useMemo(() => {
    const m = new Map();
    for (const e of events) {
      const k = format(parseISO(e.start_at), "yyyy-MM-dd");
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(e);
    }
    return m;
  }, [events]);

  const dayEvents = eventsByDay.get(format(selected, "yyyy-MM-dd")) || [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarIcon}
        title="Calendario"
        subtitle="Orario scolastico, verifiche, compiti e suggerimenti AI"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCursor((d) => subMonths(d, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-[10rem] text-center font-semibold tracking-tight">
              {format(cursor, "LLLL yyyy", { locale: it })}
            </div>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCursor((d) => addMonths(d, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCursor(new Date());
                setSelected(new Date());
              }}
            >
              Oggi
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Grid */}
        <div className="rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl shadow-card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border/40 text-[11px] font-semibold uppercase tracking-widest text-muted-fg">
            {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
              <div key={d} className="px-3 py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const k = format(day, "yyyy-MM-dd");
              const dayEv = eventsByDay.get(k) || [];
              const isCur = isSameMonth(day, cursor);
              const isSel = isSameDay(day, selected);
              const isToday = isSameDay(day, new Date());
              return (
                <button
                  key={k}
                  onClick={() => setSelected(day)}
                  className={cn(
                    "relative min-h-[96px] border-b border-r border-border/30 p-2 text-left transition-colors",
                    !isCur && "bg-bg/40 text-muted-fg",
                    isCur && "hover:bg-elevated/40",
                    isSel && "ring-1 ring-primary/40 bg-primary/5",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-between text-xs font-medium",
                      isToday && "text-primary",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-6 place-items-center rounded-full",
                        isToday && "bg-primary text-primary-fg",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {dayEv.length > 3 && (
                      <span className="text-[10px] text-muted-fg">
                        +{dayEv.length - 3}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayEv.slice(0, 3).map((ev) => (
                      <div
                        key={`${ev.type}-${ev.id}`}
                        className={cn(
                          "truncate rounded-sm px-1.5 py-0.5 text-[10px] font-medium",
                          TYPE_STYLES[ev.type] || TYPE_STYLES.event,
                        )}
                        title={ev.title}
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day panel */}
        <aside className="rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl shadow-card overflow-hidden">
          <div className="border-b border-border/40 p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-fg">
              Giorno selezionato
            </div>
            <div className="mt-1 text-2xl font-bold tracking-tight">
              {format(selected, "EEEE d LLLL", { locale: it })}
            </div>
            <div className="text-sm text-muted-fg">
              {dayEvents.length} evento{dayEvents.length !== 1 ? "i" : ""}
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-3 scrollbar-thin">
            <AnimatePresence initial={false}>
              {dayEvents.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-fg"
                >
                  Niente di programmato 🎉
                </motion.div>
              )}
              {dayEvents.map((ev) => (
                <motion.div
                  key={`${ev.type}-${ev.id}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-2 rounded-lg border border-border/60 bg-elevated/30 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="secondary"
                      className={cn("capitalize", TYPE_STYLES[ev.type])}
                    >
                      {ev.type}
                    </Badge>
                    <span className="text-xs font-mono text-muted-fg">
                      {format(parseISO(ev.start_at), "HH:mm")}
                    </span>
                  </div>
                  <div className="mt-2 font-semibold leading-tight">
                    {ev.title}
                  </div>
                  {ev.body && (
                    <div className="mt-1 text-xs text-muted-fg line-clamp-3">
                      {ev.body}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <div className="space-y-2 border-t border-border/40 p-3">
            <Button
              variant="gradient"
              className="w-full"
              onClick={askAI}
              disabled={aiLoading}
            >
              <Sparkles className="size-4" />
              {aiLoading ? "Sto pensando…" : "AI · suggerisci un giorno libero"}
            </Button>
            {aiHint && (
              <div className="rounded-md border border-border/40 bg-elevated/40 p-2 text-xs">
                <div className="font-semibold text-primary">
                  Giorno consigliato:{" "}
                  {aiHint.best_day
                    ? format(parseISO(aiHint.best_day), "EEEE d MMMM yyyy", {
                        locale: it,
                      })
                    : "—"}
                </div>
                {aiHint.reasoning && (
                  <div className="mt-1 text-muted-fg">{aiHint.reasoning}</div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
