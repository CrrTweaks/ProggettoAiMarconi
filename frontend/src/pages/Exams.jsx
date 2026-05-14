import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isAfter } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { FileText, Plus, Trash2, Loader2, Sparkles } from "lucide-react";
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

export default function Exams() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const qc = useQueryClient();

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["exams"],
    queryFn: async () => (await api.get("/exams")).data.exams || [],
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/exams/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams"] });
      toast.success("Verifica eliminata");
    },
  });

  const today = new Date();
  const upcoming = exams.filter((e) =>
    isAfter(parseISO(e.scheduled_for), today),
  );
  const past = exams.filter((e) => !isAfter(parseISO(e.scheduled_for), today));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FileText}
        title="Verifiche scritte"
        subtitle="Verifiche e valutazioni programmate"
        actions={isTeacher ? <NewExamDialog /> : null}
      />
      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-fg" />
        </div>
      ) : (
        <>
          <Group
            title="Imminenti"
            items={upcoming}
            isTeacher={isTeacher}
            onDelete={(id) => remove.mutate(id)}
          />
          <Group
            title="Passati"
            items={past}
            isTeacher={isTeacher}
            onDelete={(id) => remove.mutate(id)}
            dim
          />
        </>
      )}
    </div>
  );
}

function Group({ title, items, isTeacher, onDelete, dim }) {
  if (items.length === 0)
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-fg">
          {title}
        </h2>
        <EmptyState title={`Nessuna verifica ${title.toLowerCase()}`} />
      </section>
    );
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-fg">
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((e, i) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className={cn(
              "group rounded-xl border border-border/60 bg-gradient-to-br from-panel to-elevated/30 p-4 shadow-card backdrop-blur-xl",
              "hover:ring-1 hover:ring-accent/30 transition-all",
              dim && "opacity-70",
            )}
          >
            <div className="flex items-start justify-between">
              <Badge variant="accent">{e.subject || "Verifica scritta"}</Badge>
              {isTeacher && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 text-muted-fg hover:text-danger"
                  onClick={() => onDelete(e.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
            <div className="mt-2 font-semibold tracking-tight">{e.title}</div>
            {e.description && (
              <div className="mt-1 text-xs text-muted-fg line-clamp-2">
                {e.description}
              </div>
            )}
            {Array.isArray(e.topics) && e.topics.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {e.topics.slice(0, 5).map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-border bg-elevated/60 px-2 py-0.5 text-[10px] text-muted-fg"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-fg">{e.class_name}</span>
              <span className="font-mono text-accent">
                {format(parseISO(e.scheduled_for), "d MMM HH:mm", {
                  locale: it,
                })}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function NewExamDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [aiHint, setAiHint] = useState(null);
  const [form, setForm] = useState({
    class_id: "",
    title: "",
    subject: "",
    description: "",
    scheduled_for: format(
      new Date(Date.now() + 7 * 86400_000),
      "yyyy-MM-dd'T'HH:mm",
    ),
    duration_min: 60,
    topics: "",
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    enabled: open,
    queryFn: async () => (await api.get("/classes")).data.classes || [],
  });

  const create = useMutation({
    mutationFn: (payload) => api.post("/exams", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      toast.success("Verifica programmata");
      setOpen(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || "Impossibile"),
  });

  const askAI = async () => {
    if (!form.class_id) return toast.warning("Seleziona prima una classe");
    try {
      const week = format(new Date(), "yyyy-MM-dd");
      const { data } = await api.post("/ai/suggest/exam-day", {
        class_id: form.class_id,
        week_start: week,
      });
      setAiHint(data);
      toast.success("Suggerimento AI pronto");
    } catch {
      toast.error("AI non disponibile");
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      topics: form.topics
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    create.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus className="size-4" /> Nuova verifica
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Pianifica verifica scritta</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
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
                Seleziona…
              </option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
              <Label>Materia</Label>
              <Input
                value={form.subject}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Programmato per</Label>
              <Input
                type="datetime-local"
                required
                value={form.scheduled_for}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scheduled_for: e.target.value }))
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
            <Label>Argomenti (separati da virgola)</Label>
            <Input
              value={form.topics}
              placeholder="Algebra, Geometria, Trigonometria"
              onChange={(e) =>
                setForm((f) => ({ ...f, topics: e.target.value }))
              }
            />
          </div>

          <div className="rounded-lg border border-border/60 bg-elevated/30 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4 text-accent" /> Assistente
                programmazione AI
              </div>
              <Button type="button" size="sm" variant="outline" onClick={askAI}>
                Suggerisci giorno migliore
              </Button>
            </div>
            {aiHint && (
              <div className="mt-2 text-xs text-muted-fg">
                <span className="text-fg font-mono">{aiHint.best_day}</span> ·
                score {aiHint.score?.toFixed(1)} ·
                <span className="ml-1">{aiHint.reasoning}</span>
              </div>
            )}
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
