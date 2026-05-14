import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Bell, Check, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["notifications-page"],
    queryFn: async () =>
      (await api.get("/notifications")).data.notifications || [],
  });

  const markRead = useMutation({
    mutationFn: (id) => api.post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications-page"] }),
  });

  const markAll = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-page"] });
      toast.success("Tutte segnate come lette");
    },
  });

  const unread = items.filter((n) => !n.read_at);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bell}
        title="Notifiche"
        subtitle={`${unread.length} non lette · ${items.length} totali`}
        actions={
          unread.length > 0 ? (
            <Button variant="outline" onClick={() => markAll.mutate()}>
              <Check className="size-4" /> Segna come lette tutte
            </Button>
          ) : null
        }
      />

      {isLoading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-fg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Tutto in regola"
          description="Nessuna notifica da mostrare."
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {items.map((n) => (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 transition-colors",
                  n.read_at
                    ? "border-border/40 bg-panel/40 opacity-70"
                    : "border-primary/30 bg-panel/60 backdrop-blur-xl shadow-card",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 size-2.5 shrink-0 rounded-full",
                    n.read_at
                      ? "bg-muted-fg/30"
                      : "bg-primary animate-pulse-soft",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={typeVariant(n.type)}>
                      {typeLabel(n.type)}
                    </Badge>
                    <span className="text-[11px] text-muted-fg">
                      {formatDistanceToNow(parseISO(n.created_at), {
                        addSuffix: true,
                        locale: it,
                      })}
                    </span>
                  </div>
                  <div className="mt-1 font-medium">{n.title}</div>
                  {n.body && (
                    <div className="mt-0.5 text-sm text-muted-fg">{n.body}</div>
                  )}
                </div>
                {!n.read_at && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => markRead.mutate(n.id)}
                  >
                    <Check className="size-4" />
                  </Button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

const typeVariant = (t) =>
  ({
    homework: "default",
    exam: "accent",
    interrogation: "warning",
    message: "secondary",
    system: "secondary",
    ai: "accent",
  })[t] || "secondary";

const typeLabel = (t) =>
  ({
    homework: "Compiti",
    exam: "Verifica scritta",
    interrogation: "Interrogazione",
    lesson: "Lezione",
    absence: "Assenza",
    message: "Messaggio",
    system: "Sistema",
    ai: "AI",
  })[t] || t;
