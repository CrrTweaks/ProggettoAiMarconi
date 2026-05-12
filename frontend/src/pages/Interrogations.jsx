import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isAfter } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { GraduationCap, Plus, Trash2, Loader2 } from "lucide-react";
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

export default function Interrogations() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["interrogations"],
    queryFn: async () =>
      (await api.get("/interrogations")).data.interrogations || [],
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/interrogations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interrogations"] });
      toast.success("Rimossa");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={GraduationCap}
        title="Interrogazioni"
        subtitle="Esami orali · pianificati e valutati"
        actions={isTeacher ? <NewInterrogationDialog /> : null}
      />
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
        <div className="grid gap-3">
          {items.map((it) => (
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
                  <Badge variant="warning">{it.subject || "Esame orale"}</Badge>
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
                    locale: it,
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
      )}
    </div>
  );
}

function NewInterrogationDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    class_id: "",
    student_id: "",
    subject: "",
    topic: "",
    scheduled_for: format(
      new Date(Date.now() + 7 * 86400_000),
      "yyyy-MM-dd'T'HH:mm",
    ),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    enabled: open,
    queryFn: async () => (await api.get("/classes")).data.classes || [],
  });

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
            create.mutate({ ...form, student_id: form.student_id || null });
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label>Classe</Label>
            <select
              required
              value={form.class_id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  class_id: e.target.value,
                  student_id: "",
                }))
              }
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
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject: e.target.value }))
                }
              />
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
              />
            </div>
          </div>
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
              disabled={create.isPending}
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
