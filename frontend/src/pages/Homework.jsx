import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isAfter, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Plus, Trash2, Loader2, Users } from "lucide-react";
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

export default function Homework() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const qc = useQueryClient();
  const [selectedClass, setSelectedClass] = useState("");

  const { data: homework = [], isLoading } = useQuery({
    queryKey: ["homework", selectedClass],
    queryFn: async () => {
      const params = {};
      if (selectedClass) params.class_id = selectedClass;
      return (await api.get("/homework", { params })).data.homework || [];
    },
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/homework/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["homework"] });
      toast.success("Compito eliminato");
    },
  });

  const today = new Date();
  
  const byClass = homework.reduce((acc, h) => {
    const cName = h.class_name || "Sconosciuta";
    if (!acc[cName]) acc[cName] = [];
    acc[cName].push(h);
    return acc;
  }, {});

  const sortedClasses = Object.keys(byClass).sort();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="Compiti"
        subtitle="Compiti da studiare e completare"
        actions={isTeacher ? <NewHomeworkDialog /> : null}
      />

      <ClassFilter value={selectedClass} onChange={setSelectedClass} />

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-fg" />
        </div>
      ) : homework.length === 0 ? (
        <EmptyState
          title="Nessun compito"
          description="Niente qui per ora."
        />
      ) : (
        <div className="space-y-8">
          {sortedClasses.map((cName) => {
            const items = byClass[cName];
            const cUpcoming = items.filter((h) => isAfter(parseISO(h.due_date), today));
            const cPast = items.filter((h) => !isAfter(parseISO(h.due_date), today));

            return (
              <div key={cName} className="space-y-5 rounded-2xl border border-border/40 bg-panel/30 p-5 md:p-6 backdrop-blur-md shadow-sm">
                <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                  <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 shadow-inner">
                    <Users className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">{cName}</h2>
                </div>
                <div className="space-y-6 pt-2">
                  {cUpcoming.length > 0 && (
                    <Section
                      title="Imminenti"
                      items={cUpcoming}
                      isTeacher={isTeacher}
                      onDelete={(id) => remove.mutate(id)}
                    />
                  )}
                  {cPast.length > 0 && (
                    <Section
                      title="Passati"
                      items={cPast}
                      isTeacher={isTeacher}
                      onDelete={(id) => remove.mutate(id)}
                      dim
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Section({ title, items, isTeacher, onDelete, dim }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-fg">
        {title}
      </h2>
      {items.length === 0 ? (
        <EmptyState
          title={`Nessun compito ${title.toLowerCase()}`}
          description="Niente qui per ora."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {items.map((h) => (
              <motion.div
                key={h.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "group rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl p-4 shadow-card",
                  "hover:ring-1 hover:ring-primary/30 transition-all",
                  dim && "opacity-70",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Badge
                      variant={
                        h.priority === 3
                          ? "danger"
                          : h.priority === 2
                            ? "warning"
                            : "default"
                      }
                    >
                      {h.subject || h.class_name}
                    </Badge>
                    <div className="mt-2 font-semibold leading-tight">
                      {h.title}
                    </div>
                    {h.description && (
                      <div className="mt-1 text-xs text-muted-fg line-clamp-3">
                        {h.description}
                      </div>
                    )}
                  </div>
                  {isTeacher && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100 text-muted-fg hover:text-danger"
                      onClick={() => onDelete(h.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-fg">{h.class_name}</span>
                  <span className="font-mono text-primary">
                    {format(parseISO(h.due_date), "d MMM yyyy", { locale: it })}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

function NewHomeworkDialog() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    class_id: "",
    title: "",
    description: "",
    subject: "",
    due_date: format(nextSchoolDay(new Date()), "yyyy-MM-dd"),
    priority: 1,
    assigned_by: "",
  });

  const dueReason = getNonSchoolReason(form.due_date);

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data.classes || [],
    enabled: open,
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
    setForm((f) => ({ ...f, class_id: classId, subject: subj }));
  };

  const create = useMutation({
    mutationFn: (payload) => api.post("/homework", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["homework"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Compito creato");
      setOpen(false);
      setForm({
        class_id: "",
        title: "",
        description: "",
        subject: "",
        due_date: format(nextSchoolDay(new Date()), "yyyy-MM-dd"),
        priority: 1,
        assigned_by: "",
      });
    },
    onError: (e) =>
      toast.error(e.response?.data?.error || "Impossibile creare"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="size-4" /> Nuovo compito
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crea compito</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isSchoolDay(form.due_date)) {
              toast.error(
                `Non puoi assegnare compiti in questo giorno: ${getNonSchoolReason(form.due_date)}`,
              );
              return;
            }
            create.mutate(form);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label>Classe</Label>
            <select
              required
              value={form.class_id}
              onChange={(e) => handleClassChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-elevated/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/60"
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
            <Label>Titolo</Label>
            <Input
              required
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />
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
                placeholder="Matematica"
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
              <Label>Data di scadenza</Label>
              <Input
                type="date"
                required
                value={form.due_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, due_date: e.target.value }))
                }
                aria-invalid={!!dueReason}
                className={cn(dueReason && "border-danger ring-danger/30")}
              />
              {dueReason && (
                <p className="text-xs text-danger">⚠ {dueReason}</p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrizione</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          {isAdmin && (
            <div className="space-y-1.5">
              <Label>Docente</Label>
              <select
                value={form.assigned_by}
                onChange={(e) =>
                  setForm((f) => ({ ...f, assigned_by: e.target.value }))
                }
                className="flex h-10 w-full rounded-md border border-border bg-elevated/40 px-3 text-sm outline-none focus:ring-2 focus:ring-ring/60"
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
            <Label>Priorità</Label>
            <div className="flex gap-2">
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, priority: p }))}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm transition-colors",
                    form.priority === p
                      ? "border-primary bg-primary/10 text-fg ring-1 ring-primary/30"
                      : "border-border bg-elevated/40 text-muted-fg",
                  )}
                >
                  {p === 1 ? "Bassa" : p === 2 ? "Media" : "Alta"}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
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
              disabled={create.isPending || !!dueReason}
            >
              {create.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Crea
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
