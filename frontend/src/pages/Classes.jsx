import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  BookOpen,
  Calendar,
  GraduationCap,
  UserPlus,
  Search,
  X,
  ClipboardList,
  FileText,
  Eye,
  Clock,
} from "lucide-react";
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
import { initials, roleLabel } from "@/lib/utils";

const COLORS = [
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export default function Classes() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const qc = useQueryClient();
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data.classes || [],
  });

  const { data: mySubjects = [] } = useQuery({
    queryKey: ["me", "subjects"],
    queryFn: async () => (await api.get("/users/me/subjects")).data.subjects || [],
    enabled: isTeacher,
    staleTime: 5 * 60 * 1000,
  });

  const subjectMap = Object.fromEntries(
    mySubjects.map((s) => [s.class_id, s.subject]),
  );

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/classes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Classe eliminata");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Classi"
        subtitle={
          isAdmin
            ? "Gestisci le classi scolastiche e i membri"
            : "Le tue classi assegnate · panoramica"
        }
        actions={isAdmin ? <NewClassDialog /> : null}
      />

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-fg" />
        </div>
      ) : classes.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nessuna classe"
          description={
            isAdmin
              ? "Crea la tua prima classe per iniziare."
              : "Non sei ancora assegnato a nessuna classe. Contatta l'amministratore per essere aggiunto."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((c, i) => (
            <ClassCard
              key={c.id}
              cls={c}
              idx={i}
              mySubject={subjectMap[c.id]}
              onDelete={() => remove.mutate(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassCard({ cls, idx, mySubject, onDelete }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const { data: detail } = useQuery({
    queryKey: ["class-detail", cls.id],
    queryFn: async () => (await api.get(`/classes/${cls.id}`)).data,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="group relative overflow-hidden rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl shadow-card"
    >
      <div
        className="absolute inset-x-0 top-0 h-1.5"
        style={{
          background: `linear-gradient(90deg, ${cls.color || "#3b82f6"}, transparent)`,
        }}
      />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-fg">
              {cls.school_year}
            </div>
            <h3 className="mt-1 text-lg font-bold tracking-tight">
              {cls.name}
            </h3>
            {cls.subject && (
              <Badge variant="default" className="mt-2">
                {cls.subject}
              </Badge>
            )}
            {isTeacher && mySubject && (
              <Badge variant="outline" className="mt-1.5 text-[10px] border-primary/30 text-primary">
                Insegna: {mySubject}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <MembersDialog
              classId={cls.id}
              className={cls.name}
              members={detail?.members || []}
              readOnly={!isAdmin}
            />
            <ScheduleDialog
              classId={cls.id}
              className={cls.name}
              readOnly={!isAdmin}
            />
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-fg hover:text-danger"
                onClick={onDelete}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {cls.description && (
          <p className="mt-2 text-sm text-muted-fg line-clamp-2">
            {cls.description}
          </p>
        )}

        {detail && (
          <>
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              <Stat
                icon={Users}
                value={detail.members?.length || 0}
                label="membri"
              />
              <Stat
                icon={Calendar}
                value={detail.schedule?.length || 0}
                label="slot"
              />
              <Stat
                icon={ClipboardList}
                value={detail.counts?.homework_count ?? "—"}
                label="compiti"
              />
              <Stat
                icon={FileText}
                value={detail.counts?.exams_count ?? "—"}
                label="verifiche"
              />
            </div>

            {/* Scorciatoie rapide per docenti e admin */}
            {detail.counts && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <QuickLink
                  icon={ClipboardList}
                  label="Compiti"
                  count={detail.counts.homework_count}
                  href={`/homework?class_id=${cls.id}`}
                />
                <QuickLink
                  icon={BookOpen}
                  label="Lezioni"
                  count={detail.counts.lessons_count}
                  href={`/lessons?class_id=${cls.id}`}
                />
                <QuickLink
                  icon={FileText}
                  label="Verifiche"
                  count={detail.counts.exams_count}
                  href={`/exams?class_id=${cls.id}`}
                />
                <QuickLink
                  icon={GraduationCap}
                  label="Interrogazioni"
                  count={detail.counts.interrogations_count}
                  href={`/interrogations?class_id=${cls.id}`}
                />
              </div>
            )}

            {/* Membri sempre visibili */}
            <div className="mt-4 flex -space-x-2">
              {(detail.members || []).slice(0, 6).map((m) => (
                <div
                  key={m.id}
                  title={m.full_name}
                  className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-primary/40 to-accent/40 ring-2 ring-bg text-[10px] font-bold"
                >
                  {initials(m.full_name)}
                </div>
              ))}
              {(detail.members?.length || 0) > 6 && (
                <div className="grid size-7 place-items-center rounded-full bg-elevated text-[10px] font-bold ring-2 ring-bg">
                  +{detail.members.length - 6}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function MembersDialog({ classId, className, members, readOnly }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const { data: searchResults = [], isFetching } = useQuery({
    queryKey: ["users-search", q],
    queryFn: async () =>
      (await api.get("/users", { params: { q, role: "student" } })).data
        .users || [],
    enabled: open && q.trim().length >= 2,
  });

  const memberIds = new Set(members.map((m) => m.id));
  const candidates = searchResults.filter((u) => !memberIds.has(u.id));

  const add = useMutation({
    mutationFn: (userId) =>
      api.post(`/classes/${classId}/members`, {
        user_id: userId,
        role: "student",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class-detail", classId] });
      qc.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Studente aggiunto");
      setQ("");
    },
    onError: (e) =>
      toast.error(e.response?.data?.error || "Impossibile aggiungere"),
  });

  const remove = useMutation({
    mutationFn: (userId) => api.delete(`/classes/${classId}/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class-detail", classId] });
      qc.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Studente rimosso");
    },
    onError: (e) =>
      toast.error(e.response?.data?.error || "Impossibile rimuovere"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-fg hover:text-primary"
          title={readOnly ? "Visualizza membri" : "Gestisci membri"}
        >
          {readOnly ? <Eye className="size-4" /> : <UserPlus className="size-4" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {readOnly ? "Membri della classe" : `Gestisci membri · ${className}`}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!readOnly && (
            <div className="space-y-2">
              <Label>Cerca uno studente</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-fg" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nome o email (min 2 caratteri)"
                  className="pl-9"
                />
              </div>
              {q.trim().length >= 2 && (
                <div className="max-h-48 overflow-y-auto rounded-md border border-border/40 bg-elevated/40">
                {isFetching ? (
                  <div className="grid place-items-center p-4">
                    <Loader2 className="size-4 animate-spin text-muted-fg" />
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="p-3 text-sm text-muted-fg">
                    Nessun risultato.
                  </div>
                ) : (
                  candidates.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => add.mutate(u.id)}
                      disabled={add.isPending}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-elevated/80 transition"
                    >
                      <div>
                        <div className="font-medium">{u.full_name}</div>
                        <div className="text-xs text-muted-fg">{u.email}</div>
                      </div>
                      <Plus className="size-4 text-primary" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          )}

          <div className="space-y-2">
            <Label>Membri attuali ({members.length})</Label>
            {members.length === 0 ? (
              <div className="rounded-md border border-border/40 bg-elevated/40 p-3 text-sm text-muted-fg">
                {readOnly
                  ? "Nessun membro in questa classe."
                  : "Nessun membro. Aggiungine uno dalla ricerca qui sopra."}
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-md border border-border/40 divide-y divide-border/40">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {m.full_name}
                      </div>
                      <div className="text-xs text-muted-fg truncate">
                        {m.email} · {roleLabel(m.role)}
                      </div>
                    </div>
                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-fg hover:text-danger"
                        onClick={() => remove.mutate(m.id)}
                        disabled={remove.isPending}
                        title="Rimuovi"
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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

const WEEKDAYS = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica",
];

function ScheduleDialog({ classId, className, readOnly }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    weekday: "0",
    start_time: "08:00",
    end_time: "09:00",
    subject: "",
    room: "",
    teacher_id: "",
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ["schedules", classId],
    queryFn: async () => (await api.get(`/schedules/class/${classId}`)).data.schedules || [],
    enabled: open,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-list"],
    queryFn: async () => (await api.get("/users", { params: { role: "teacher" } })).data.users || [],
    enabled: open && !readOnly,
  });

  const add = useMutation({
    mutationFn: (payload) => api.post("/schedules", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules", classId] });
      qc.invalidateQueries({ queryKey: ["class-detail", classId] });
      toast.success("Slot aggiunto");
      setForm({
        weekday: "0",
        start_time: "08:00",
        end_time: "09:00",
        subject: "",
        room: "",
        teacher_id: "",
      });
    },
    onError: (e) => toast.error(e.response?.data?.error || "Impossibile aggiungere"),
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/schedules/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules", classId] });
      qc.invalidateQueries({ queryKey: ["class-detail", classId] });
      toast.success("Slot rimosso");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-fg hover:text-primary"
          title="Orario"
        >
          <Clock className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Orario · {className}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {schedules.length === 0 ? (
            <div className="rounded-md border border-border/40 bg-elevated/40 p-3 text-sm text-muted-fg">
              Nessuno slot orario configurato.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto rounded-md border border-border/40 divide-y divide-border/40">
              {schedules.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {s.subject}
                    </div>
                    <div className="text-xs text-muted-fg truncate">
                      {s.teacher_name || "Nessun docente assegnato"}
                      {s.room && ` · Aula ${s.room}`}
                      {(s.start_time && s.start_time !== "00:00:00" && s.start_time !== "00:00") && ` · ${s.start_time?.slice(0, 5)}–${s.end_time?.slice(0, 5)}`}
                    </div>
                  </div>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-fg hover:text-danger"
                      onClick={() => remove.mutate(s.id)}
                      disabled={remove.isPending}
                      title="Rimuovi"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!readOnly && (
            <div className="space-y-2 rounded-lg border border-border/60 bg-elevated/30 p-3">
              <div className="text-sm font-medium">Nuova assegnazione</div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Materia</Label>
                  <Input
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    placeholder="Matematica"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Docente</Label>
                  <select
                    value={form.teacher_id}
                    onChange={(e) => setForm((f) => ({ ...f, teacher_id: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-border bg-elevated/40 px-2 text-sm"
                  >
                    <option value="">— Nessun docente —</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={!form.subject || add.isPending}
                onClick={() =>
                  add.mutate({
                    class_id: classId,
                    subject: form.subject,
                    teacher_id: form.teacher_id || undefined,
                  })
                }
              >
                {add.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Assegna docente
              </Button>
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

function QuickLink({ icon: Icon, label, count, href }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-elevated/40 px-2.5 py-1 text-[11px] text-muted-fg transition hover:bg-elevated/70 hover:text-fg"
    >
      <Icon className="size-3" />
      <span>{label}</span>
      <span className="font-bold text-fg">{count ?? 0}</span>
    </a>
  );
}

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="rounded-md bg-elevated/40 p-2">
      <Icon className="size-3.5 text-muted-fg mx-auto" />
      <div className="text-sm font-bold mt-1">{value}</div>
      <div className="text-[10px] text-muted-fg uppercase tracking-widest">
        {label}
      </div>
    </div>
  );
}

function NewClassDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    school_year: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    subject: "",
    description: "",
    color: COLORS[0],
  });

  const create = useMutation({
    mutationFn: (payload) => api.post("/classes", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Classe creata");
      setOpen(false);
      setForm({
        name: "",
        school_year: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        subject: "",
        description: "",
        color: COLORS[0],
      });
    },
    onError: (e) => toast.error(e.response?.data?.error || "Impossibile"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="size-4" /> Nuova classe
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crea una classe</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(form);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="5A · Liceo Scientifico"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Anno scolastico</Label>
              <Input
                required
                value={form.school_year}
                onChange={(e) =>
                  setForm((f) => ({ ...f, school_year: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Materia</Label>
              <Input
                value={form.subject}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject: e.target.value }))
                }
                placeholder="Matematica"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descrizione</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Colore</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className="size-8 rounded-md ring-2 ring-offset-2 ring-offset-bg transition-transform hover:scale-110"
                  style={{
                    background: c,
                    boxShadow: form.color === c ? `0 0 0 2px ${c}` : "none",
                    ringColor: form.color === c ? c : "transparent",
                  }}
                />
              ))}
            </div>
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
              disabled={create.isPending}
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
