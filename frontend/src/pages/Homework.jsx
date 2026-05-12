import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isAfter, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, Plus, Trash2, Loader2 } from "lucide-react";
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

export default function Homework() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const qc = useQueryClient();

  const { data: homework = [], isLoading } = useQuery({
    queryKey: ["homework"],
    queryFn: async () => (await api.get("/homework")).data.homework || [],
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/homework/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["homework"] });
      toast.success("Compito eliminato");
    },
  });

  const today = new Date();
  const upcoming = homework
    .filter((h) => isAfter(parseISO(h.due_date), today))
    .slice();
  const past = homework
    .filter((h) => !isAfter(parseISO(h.due_date), today))
    .slice();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="Compiti"
        subtitle="Compiti da studiare e completare"
        actions={isTeacher ? <NewHomeworkDialog /> : null}
      />

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-fg" />
        </div>
      ) : (
        <>
          <Section
            title="Imminenti"
            items={upcoming}
            isTeacher={isTeacher}
            onDelete={(id) => remove.mutate(id)}
          />
          <Section
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
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    class_id: "",
    title: "",
    description: "",
    subject: "",
    due_date: format(new Date(), "yyyy-MM-dd"),
    priority: 1,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => (await api.get("/classes")).data.classes || [],
    enabled: open,
  });

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
        due_date: format(new Date(), "yyyy-MM-dd"),
        priority: 1,
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
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject: e.target.value }))
                }
                placeholder="Matematica"
              />
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
              />
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
