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
import { initials } from "@/lib/utils";

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
  const qc = useQueryClient();
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data.classes || [],
  });

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
        subtitle="Gestisci le tue classi scolastiche e i membri"
        actions={<NewClassDialog />}
      />

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-fg" />
        </div>
      ) : classes.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nessuna classe"
          description="Crea la tua prima classe per iniziare."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((c, i) => (
            <ClassCard
              key={c.id}
              cls={c}
              idx={i}
              onDelete={() => remove.mutate(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassCard({ cls, idx, onDelete }) {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
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
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isTeacher && (
              <MembersDialog
                classId={cls.id}
                className={cls.name}
                members={detail?.members || []}
              />
            )}
            {isTeacher && (
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
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
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
              <Stat icon={BookOpen} value="—" label="lezioni" />
            </div>
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

function MembersDialog({ classId, className, members }) {
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
          title="Gestisci membri"
        >
          <UserPlus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gestisci membri · {className}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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

          <div className="space-y-2">
            <Label>Membri attuali ({members.length})</Label>
            {members.length === 0 ? (
              <div className="rounded-md border border-border/40 bg-elevated/40 p-3 text-sm text-muted-fg">
                Nessun membro. Aggiungine uno dalla ricerca qui sopra.
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
                        {m.email} · {m.role}
                      </div>
                    </div>
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
