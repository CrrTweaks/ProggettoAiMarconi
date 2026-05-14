import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  format,
  isSameDay,
  isAfter,
  parseISO,
  startOfWeek,
  addDays,
} from "date-fns";
import { it } from "date-fns/locale";
import {
  ClipboardList,
  FileText,
  GraduationCap,
  BookOpen,
  Sparkles,
  Calendar,
  TrendingUp,
  Brain,
  Network,
  ArrowRight,
  Clock,
} from "lucide-react";

import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { useUI } from "@/store/ui";

import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();
  const { toggleAIPanel } = useUI();

  const { data: events } = useQuery({
    queryKey: ["calendar-events-week"],
    queryFn: async () => {
      const today = new Date();
      const weekFrom = format(
        startOfWeek(today, { weekStartsOn: 1 }),
        "yyyy-MM-dd",
      );
      const weekTo = format(
        addDays(startOfWeek(today, { weekStartsOn: 1 }), 13),
        "yyyy-MM-dd",
      );
      const { data } = await api.get("/calendar/events", {
        params: { from: weekFrom, to: weekTo },
      });
      return data.events || [];
    },
  });

  const { data: homework } = useQuery({
    queryKey: ["homework"],
    queryFn: async () => (await api.get("/homework")).data.homework || [],
  });

  const { data: exams } = useQuery({
    queryKey: ["exams"],
    queryFn: async () => (await api.get("/exams")).data.exams || [],
  });

  const { data: lessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => (await api.get("/lessons")).data.lessons || [],
  });

  const { data: interrogations } = useQuery({
    queryKey: ["interrogations"],
    queryFn: async () =>
      (await api.get("/interrogations")).data.interrogations || [],
  });

  const today = new Date();
  const upcomingExams = (exams || [])
    .filter((e) => isAfter(parseISO(e.scheduled_for), today))
    .slice(0, 3);
  const dueHomework = (homework || [])
    .filter((h) => isAfter(parseISO(h.due_date), addDays(today, -1)))
    .slice(0, 5);
  const todayEvents = (events || []).filter((e) =>
    isSameDay(parseISO(e.start_at), today),
  );

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Sparkles}
        title={`Ciao, ${user?.full_name?.split(" ")[0] || "là"} 👋`}
        subtitle={
          isTeacher
            ? "Gestisci le tue classi, pianifica verifiche e chiedi all'assistente AI."
            : "Mantieni il controllo dei tuoi studi con il tuo tutor AI."
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/calendar">
                <Calendar className="size-4" /> Apri calendario
              </Link>
            </Button>
            <Button variant="gradient" onClick={toggleAIPanel}>
              <Sparkles className="size-4" /> Chiedi all'AI
            </Button>
          </>
        }
      />

      {/* Statistiche */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          label="Compiti in sospeso"
          value={(dueHomework || []).length}
          hint="da consegnare nei prossimi giorni"
          accent="primary"
          delay={0}
        />
        <StatCard
          icon={FileText}
          label="Verifiche scritte imminenti"
          value={(upcomingExams || []).length}
          hint="programmati in futuro"
          accent="accent"
          delay={0.05}
        />
        <StatCard
          icon={GraduationCap}
          label="Interrogazioni"
          value={(interrogations || []).length}
          hint="questo trimestre"
          accent="warning"
          delay={0.1}
        />
        <StatCard
          icon={BookOpen}
          label="Lezioni svolte"
          value={(lessons || []).length}
          hint="registrate sul registro"
          accent="success"
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Oggi */}
        <Card
          title="Agenda di oggi"
          icon={Clock}
          action={
            <Link
              to="/calendar"
              className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
            >
              Vedi tutto <ArrowRight className="size-3" />
            </Link>
          }
        >
          {todayEvents.length === 0 ? (
            <EmptyState
              title="Niente per oggi"
              description="Goditi il tuo tempo libero 🎉"
            />
          ) : (
            <ul className="space-y-2">
              {todayEvents.map((ev) => (
                <EventRow key={`${ev.type}-${ev.id}`} event={ev} />
              ))}
            </ul>
          )}
        </Card>

        {/* Compiti in arrivo */}
        <Card
          title="Compiti"
          icon={ClipboardList}
          action={
            <Link
              to="/homework"
              className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
            >
              Tutti i compiti <ArrowRight className="size-3" />
            </Link>
          }
        >
          {dueHomework.length === 0 ? (
            <EmptyState
              title="Tutto in regola"
              description="Nessun compito da consegnare a breve."
            />
          ) : (
            <ul className="space-y-2">
              {dueHomework.map((h) => (
                <li
                  key={h.id}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-elevated/30 p-3"
                >
                  <div
                    className={cn(
                      "mt-1 size-2.5 rounded-full",
                      h.priority === 3
                        ? "bg-rose-400"
                        : h.priority === 2
                          ? "bg-amber-400"
                          : "bg-primary",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {h.title}
                    </div>
                    <div className="text-xs text-muted-fg">
                      {h.subject || h.class_name}
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {format(parseISO(h.due_date), "d MMM", { locale: it })}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Azioni rapide AI */}
        <Card title="Strumenti AI" icon={Sparkles} highlight>
          <div className="space-y-2">
            <ToolLink
              to="/ai/chat"
              icon={Sparkles}
              label="Tutor AI"
              desc="Chiedi qualsiasi cosa, ottieni spiegazioni istantanee"
            />
            <ToolLink
              to="/ai/rag"
              icon={Brain}
              label="PDF / RAG"
              desc="Carica PDF e chatta con essi"
            />
            <ToolLink
              to="/ai/concept-maps"
              icon={Network}
              label="Mappa Concetti"
              desc="Genera automaticamente da qualsiasi argomento"
            />
            <ToolLink
              to="/ai/voice"
              icon={TrendingUp}
              label="AI Vocale"
              desc="Parla con il tuo tutor AI"
            />
          </div>
        </Card>
      </div>

      {/* Verifiche e interrogazioni imminenti */}
      <Card
        title="Verifiche e interrogazioni imminenti"
        icon={FileText}
        action={
          <Link
            to="/exams"
            className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
          >
            Vedi tutte le verifiche <ArrowRight className="size-3" />
          </Link>
        }
      >
        {upcomingExams.length === 0 ? (
          <EmptyState
            title="Nessuna verifica programmata"
            description="Quando i docenti aggiungono verifiche, appariranno qui."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingExams.map((e) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-border/60 bg-gradient-to-br from-panel to-elevated/40 p-4 hover:ring-1 hover:ring-primary/30 transition-all"
              >
                <Badge variant="accent">
                  {e.subject || "Verifica scritta"}
                </Badge>
                <div className="mt-2 font-semibold tracking-tight">
                  {e.title}
                </div>
                {e.description && (
                  <div className="text-xs text-muted-fg line-clamp-2 mt-1">
                    {e.description}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-fg">{e.class_name}</span>
                  <span className="font-mono text-primary">
                    {format(parseISO(e.scheduled_for), "d MMM HH:mm", {
                      locale: it,
                    })}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Card({ title, icon: Icon, action, children, highlight }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border bg-panel/60 backdrop-blur-xl shadow-card overflow-hidden",
        highlight
          ? "border-primary/30 ring-1 ring-primary/20"
          : "border-border/60",
      )}
    >
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <Icon
              className={cn(
                "size-4",
                highlight ? "text-accent" : "text-muted-fg",
              )}
            />
          )}
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </motion.section>
  );
}

function EventRow({ event }) {
  const colors = {
    homework: "bg-primary/15 text-primary border-primary/20",
    exam: "bg-accent/15 text-accent border-accent/20",
    interrogation: "bg-amber-500/15 text-amber-300 border-amber-500/20",
    lesson: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
    event: "bg-elevated text-muted-fg border-border",
  };
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border/60 bg-elevated/30 p-3">
      <span
        className={cn(
          "rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase",
          colors[event.type],
        )}
      >
        {event.type}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{event.title}</div>
        {event.subject && (
          <div className="text-xs text-muted-fg">{event.subject}</div>
        )}
      </div>
      <span className="text-xs font-mono text-muted-fg">
        {format(parseISO(event.start_at), "HH:mm")}
      </span>
    </li>
  );
}

function ToolLink({ to, icon: Icon, label, desc }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-lg border border-border/60 bg-elevated/30 p-3 transition-all hover:border-primary/30 hover:bg-elevated/60"
    >
      <div className="grid size-9 place-items-center rounded-md bg-gradient-to-br from-primary/30 to-accent/30 text-fg ring-1 ring-primary/20">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-fg truncate">{desc}</div>
      </div>
      <ArrowRight className="size-4 text-muted-fg transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
