import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { BookOpen, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export default function Lessons() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const qc = useQueryClient();

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: async () => (await api.get("/lessons")).data.lessons || [],
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/lessons/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      toast.success("Lezione rimossa");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookOpen}
        title="Lezioni"
        subtitle="Argomenti trattati in classe · registro elettronico"
        actions={isTeacher ? <NewLessonDialog /> : null}
      />

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-fg" />
        </div>
      ) : lessons.length === 0 ? (
        <EmptyState
          title="Nessuna lezione registrata"
          description="I docenti possono registrare qui gli argomenti trattati."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {lessons.map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="group rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl p-5 shadow-card hover:ring-1 hover:ring-primary/30 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Badge variant="default">{l.class_name}</Badge>
                  <h3 className="mt-2 font-semibold tracking-tight">
                    {l.title}
                  </h3>
                  {l.topic && (
                    <p className="mt-1 text-sm text-muted-fg">{l.topic}</p>
                  )}
                  {l.notes && (
                    <p className="mt-2 text-xs text-muted-fg/80 line-clamp-3">
                      {l.notes}
                    </p>
                  )}
                </div>
                {isTeacher && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100 text-muted-fg hover:text-danger"
                    onClick={() => remove.mutate(l.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-fg">
                <span>{l.teacher_name || ""}</span>
                <span className="font-mono">
                  {format(parseISO(l.taught_on), "d MMM yyyy", { locale: it })}{" "}
                  · {l.duration_min}min
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewLessonDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    class_id: "",
    title: "",
    topic: "",
    notes: "",
    taught_on: format(new Date(), "yyyy-MM-dd"),
    duration_min: 60,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data.classes || [],
    enabled: open,
  });

  const create = useMutation({
    mutationFn: (payload) => api.post("/lessons", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Lezione registrata");
      setOpen(false);
      setForm({
        class_id: "",
        title: "",
        topic: "",
        notes: "",
        taught_on: format(new Date(), "yyyy-MM-dd"),
        duration_min: 60,
      });
    },
    onError: (e) => toast.error(e.response?.data?.error || "Impossibile"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="size-4" /> Nuova lezione
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registra lezione</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(form);
          }}
          className="space-y-3"
        >
          <div className="space-y-1.5">
            <Label>Classe</Label>
            <select
              required
              value={form.class_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, class_id: e.target.value }))
              }
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
            <Label>Titolo</Label>
            <Input
              required
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Argomento</Label>
            <Input
              value={form.topic}
              onChange={(e) =>
                setForm((f) => ({ ...f, topic: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                required
                value={form.taught_on}
                onChange={(e) =>
                  setForm((f) => ({ ...f, taught_on: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Durata (min)</Label>
              <Input
                type="number"
                min={5}
                max={240}
                value={form.duration_min}
                onChange={(e) =>
                  setForm((f) => ({ ...f, duration_min: +e.target.value }))
                }
              />
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
              Salva
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
