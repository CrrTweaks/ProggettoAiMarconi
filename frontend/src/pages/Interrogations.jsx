import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isAfter } from "date-fns";
import { it as itLocale } from "date-fns/locale";
import { motion } from "framer-motion";
import { GraduationCap, Plus, Trash2, Loader2, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  getNonSchoolReason,
  isSchoolDay,
  nextSchoolDay,
} from "@/lib/schoolCalendar";
import ClassFilter from "@/components/shared/ClassFilter";
import {
  useTeacherSubjects,
  buildSubjectMap,
} from "@/hooks/useTeacherSubjects";

export default function Interrogations() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const qc = useQueryClient();
  const [selectedClass, setSelectedClass] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["interrogations", selectedClass],
    queryFn: async () => {
      const params = {};
      if (selectedClass) params.class_id = selectedClass;
      return (
        (await api.get("/interrogations", { params })).data.interrogations || []
      );
    },
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/interrogations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interrogations"] });
      toast.success("Rimossa");
    },
  });

  const byClass = items.reduce((acc, it) => {
    const cName = it.class_name || "Sconosciuta";
    if (!acc[cName]) acc[cName] = [];
    acc[cName].push(it);
    return acc;
  }, {});

  const sortedClasses = Object.keys(byClass).sort();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={GraduationCap}
        title="Interrogazioni"
        subtitle="Verifiche orali · pianificate e valutate"
        actions={
          isTeacher ? (
            <div className="flex items-center gap-2">
              <SuggestFreeDayDialog />
              <NewInterrogationDialog />
            </div>
          ) : null
        }
      />
      <ClassFilter value={selectedClass} onChange={setSelectedClass} />
      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-fg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nessuna interrogazione"
          description="Appariranno qui una volta programmate."
        />
      ) : (
        <div className="space-y-8">
          {sortedClasses.map((cName) => {
            const classItems = byClass[cName];
            return (
              <div key={cName} className="space-y-5 rounded-2xl border border-border/40 bg-panel/30 p-5 md:p-6 backdrop-blur-md shadow-sm">
                <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                  <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20 shadow-inner">
                    <Users className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">{cName}</h2>
                </div>
                <div className="grid gap-3 pt-2">
                  {classItems.map((it) => (
                    <motion.div
                      key={it.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "group flex items-center gap-4 rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl p-4 shadow-card",
                        "hover:ring-1 hover:ring-amber-400/30 transition-all",
                      )}
                    >
                      <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20">
                        <GraduationCap className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="warning">
                            {it.subject || "Verifica orale"}
                          </Badge>
                          {it.grade != null && (
                            <Badge variant="success">Voto: {it.grade}</Badge>
                          )}
                        </div>
                        <div className="mt-1 truncate font-semibold">
                          {it.topic || "Argomento da definire"}
                        </div>
                        <div className="text-xs text-muted-fg">
                          {it.class_name} · {it.student_name || "Per tutta la classe"} ·
                          con {it.teacher_name || "—"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm text-amber-300">
                          {format(parseISO(it.scheduled_for), "d MMM HH:mm", {
                            locale: itLocale,
                          })}
                        </div>
                        <div className="text-[11px] text-muted-fg">
                          {isAfter(parseISO(it.scheduled_for), new Date())
                            ? "imminente"
                            : "passato"}
                        </div>
                      </div>
                      {isTeacher && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="opacity-0 group-hover:opacity-100 text-muted-fg hover:text-danger"
                          onClick={() => remove.mutate(it.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SuggestFreeDayDialog() {
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState("");
  const [weekStart, setWeekStart] = useState(
    format(nextSchoolDay(new Date()), "yyyy-MM-dd"),
  );
  const [hint, setHint] = useState(null);
  const [loading, setLoading] = useState(false);
  const weekStartReason = getNonSchoolReason(weekStart);

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    enabled: open,
    queryFn: async () => (await api.get("/classes")).data.classes || [],
  });

  const ask = async () => {
    if (!classId) return toast.warning("Seleziona prima una classe");
    setLoading(true);
    setHint(null);
    try {
      const { data } = await api.post("/ai/suggest/exam-day", {
        class_id: classId,
        week_start: weekStart,
      });
      setHint(data);
      toast.success("Suggerimento AI pronto");
    } catch (e) {
      toast.error(e.response?.data?.error || "AI non disponibile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setWeekStart(format(nextSchoolDay(new Date()), "yyyy-MM-dd"));
        }
        if (!v) {
          setHint(null);
          setClassId("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles className="size-4" /> Suggerisci giorno libero
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pianificatore AI · giorno migliore</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-fg">
            L’AI analizza il carico della settimana (compiti, verifiche,
            interrogazioni) e propone il giorno più leggero per programmare una
            nuova interrogazione.
          </p>
          <div className="space-y-1.5">
            <Label>Classe</Label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-elevated/40 px-3 text-sm"
            >
              <option value="" disabled>
                Seleziona classe…
              </option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Inizio settimana</Label>
            <Input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              aria-invalid={!!weekStartReason}
              className={cn(weekStartReason && "border-danger ring-danger/30")}
            />
            {weekStartReason && (
              <p className="text-xs text-danger">⚠ {weekStartReason}</p>
            )}
          </div>
          <Button
            type="button"
            variant="gradient"
            className="w-full"
            onClick={ask}
            disabled={loading || !!weekStartReason}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {loading ? "Sto analizzando…" : "Chiedi all’AI"}
          </Button>
          {hint && (
            <div className="rounded-lg border border-border/60 bg-elevated/40 p-3 text-sm">
              <div className="font-semibold text-primary">
                {hint.best_day
                  ? format(parseISO(hint.best_day), "EEEE d MMMM yyyy", {
                      locale: itLocale,
                    })
                  : "—"}
              </div>
              {hint.reasoning && (
                <div className="mt-1 text-xs text-muted-fg">
                  {hint.reasoning}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewInterrogationDialog() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    class_id: "",
    student_id: "",
    subject: "",
    topic: "",
    scheduled_for: format(
      nextSchoolDay(new Date(Date.now() + 7 * 86400_000)),
      "yyyy-MM-dd'T'HH:mm",
    ),
    teacher_id: "",
  });

  const dateReason = getNonSchoolReason(form.scheduled_for);

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    enabled: open,
    queryFn: async () => (await api.get("/classes")).data.classes || [],
  });

  const { data: teacherSubjects = [] } = useTeacherSubjects();
  const subjectMap = buildSubjectMap(teacherSubjects);

  const { data: allTeachers = [] } = useQuery({
    queryKey: ["teachers-list"],
    queryFn: async () =>
      (await api.get("/users", { params: { role: "teacher" } })).data.users ||
      [],
    enabled: open && isAdmin,
  });

  const handleClassChange = (classId) => {
    const subj = isAdmin ? "" : subjectMap[classId] || "";
    setForm((f) => ({
      ...f,
      class_id: classId,
      student_id: "",
      subject: subj,
    }));
  };

  const { data: classDetail } = useQuery({
    queryKey: ["class-detail", form.class_id],
    enabled: !!form.class_id,
    queryFn: async () => (await api.get(`/classes/${form.class_id}`)).data,
  });

  const create = useMutation({
    mutationFn: (payload) => api.post("/interrogations", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interrogations"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Interrogazione programmata");
      setOpen(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || "Impossibile"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="size-4" /> Nuova interrogazione
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pianifica interrogazione</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isSchoolDay(form.scheduled_for)) {
              toast.error(
                `Non puoi programmare interrogazioni in questo giorno: ${getNonSchoolReason(form.scheduled_for)}`,
              );
              return;
            }
            const payload = { ...form };
            if (!payload.student_id) delete payload.student_id;
            if (!payload.subject) delete payload.subject;
            if (!payload.topic) delete payload.topic;
            create.mutate(payload);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label>Classe</Label>
            <select
              required
              value={form.class_id}
              onChange={(e) => handleClassChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-elevated/40 px-3 text-sm"
            >
              <option value="" disabled>
                Seleziona…
              </option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Studente (opzionale · per tutta la classe se vuoto)</Label>
            <select
              value={form.student_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, student_id: e.target.value }))
              }
              className="flex h-10 w-full rounded-md border border-border bg-elevated/40 px-3 text-sm"
            >
              <option value="">— Per tutta la classe —</option>
              {(classDetail?.members || [])
                .filter((m) => m.role === "student")
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Materia</Label>
              <Input
                value={form.subject}
                readOnly={!isAdmin && !!subjectMap[form.class_id]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject: e.target.value }))
                }
                className={cn(
                  !isAdmin &&
                    !!subjectMap[form.class_id] &&
                    "bg-elevated/60 text-muted-fg cursor-not-allowed",
                )}
              />
              {!isAdmin && !!subjectMap[form.class_id] && (
                <p className="text-[10px] text-muted-fg">
                  Materia assegnata per questa classe
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Data e ora</Label>
              <Input
                type="datetime-local"
                required
                value={form.scheduled_for}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scheduled_for: e.target.value }))
                }
                aria-invalid={!!dateReason}
                className={cn(dateReason && "border-danger ring-danger/30")}
              />
              {dateReason && (
                <p className="text-xs text-danger">⚠ {dateReason}</p>
              )}
            </div>
          </div>
          {isAdmin && (
            <div className="space-y-1.5">
              <Label>Docente</Label>
              <select
                value={form.teacher_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, teacher_id: e.target.value }))
                }
                className="flex h-10 w-full rounded-md border border-border bg-elevated/40 px-3 text-sm"
              >
                <option value="">— Seleziona docente —</option>
                {allTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Argomento</Label>
            <Textarea
              rows={2}
              value={form.topic}
              onChange={(e) =>
                setForm((f) => ({ ...f, topic: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={create.isPending || !!dateReason}
            >
              {create.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Pianifica
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
