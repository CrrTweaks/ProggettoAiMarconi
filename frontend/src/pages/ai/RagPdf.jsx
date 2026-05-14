import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Upload,
  FileText,
  Trash2,
  Loader2,
  Sparkles,
  Send,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { api, aiApi } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { cn, formatDate } from "@/lib/utils";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function RagPdf() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["ai-rag-docs"],
    queryFn: async () =>
      (await api.get("/ai/rag/documents")).data.documents || [],
  });

  const onDrop = async (files) => {
    if (!files.length) return;
    setUploading(true);
    setProgress(5);
    for (const f of files) {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("user_id", user.id);
      try {
        await aiApi.post("/rag/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (e.total) setProgress(Math.round((e.loaded / e.total) * 70));
          },
        });
        setProgress(90);
      } catch (e) {
        toast.error(
          `Caricamento fallito: ${e.response?.data?.detail || e.message}`,
        );
      }
    }
    setProgress(100);
    qc.invalidateQueries({ queryKey: ["ai-rag-docs"] });
    toast.success("PDF indicizzati");
    setTimeout(() => {
      setUploading(false);
      setProgress(0);
    }, 600);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
  });

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/ai/rag/documents/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-rag-docs"] });
      toast.success("Documento eliminato");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Brain}
        title="PDF · RAG"
        subtitle="Carica PDF, indicizzali con embedding, poi interrogali con l'AI"
      />

      {/* Zona di caricamento */}
      <motion.div
        {...getRootProps()}
        whileHover={{ scale: 1.005 }}
        className={cn(
          "cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border/60 bg-panel/40",
        )}
      >
        <input {...getInputProps()} />
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-gradient-to-br from-primary/30 to-accent/30 ring-1 ring-primary/20">
          <Upload className="size-6 text-primary" />
        </div>
        <div className="mt-3 text-base font-semibold">
          {isDragActive
            ? "Trascina qui i tuoi PDF"
            : "Trascina PDF o clicca per caricare"}
        </div>
        <div className="text-xs text-muted-fg">
          Multi-file · max 25 MB ciascuno
        </div>
        <AnimatePresence>
          {uploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 mx-auto max-w-md"
            >
              <Progress value={progress} />
              <div className="mt-1 text-xs text-muted-fg">
                Indicizzazione · {progress}%
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6">
        {/* Elenco documenti */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-fg">
            I tuoi documenti · {docs.length}
          </h2>
          {isLoading ? (
            <div className="grid place-items-center py-20">
              <Loader2 className="size-6 animate-spin text-muted-fg" />
            </div>
          ) : docs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nessun PDF"
              description="Carica alcuni PDF per abilitare l'AI RAG."
            />
          ) : (
            <div className="space-y-2">
              {docs.map((d) => (
                <motion.div
                  key={d.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border bg-panel/60 backdrop-blur-xl p-4 transition-colors",
                    selectedDocs.includes(d.id)
                      ? "border-primary/50 ring-1 ring-primary/30"
                      : "border-border/60 hover:border-primary/30",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedDocs.includes(d.id)}
                    onChange={(e) =>
                      setSelectedDocs((s) =>
                        e.target.checked
                          ? [...s, d.id]
                          : s.filter((x) => x !== d.id),
                      )
                    }
                    className="size-4 accent-primary"
                  />
                  <div className="grid size-10 place-items-center rounded-md bg-elevated text-primary">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{d.filename}</div>
                    <div className="text-xs text-muted-fg flex gap-2">
                      <span>{d.pages} pagine</span>·
                      <span>{(d.size_bytes / 1024 / 1024).toFixed(2)} MB</span>·
                      <span>{formatDate(d.created_at)}</span>
                    </div>
                  </div>
                  <Badge variant={d.status === "ready" ? "success" : "warning"}>
                    {d.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100 text-muted-fg hover:text-danger"
                    onClick={() => remove.mutate(d.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Interrogazione rapida */}
        <RagAsk docIds={selectedDocs} userId={user?.id} />
      </div>
    </div>
  );
}

function RagAsk({ docIds, userId }) {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!q.trim() || !userId) return;
    setLoading(true);
    setAnswer(null);
    setSources([]);
    try {
      const { data } = await aiApi.post("/rag/query", {
        user_id: userId,
        query: q,
        top_k: 5,
        document_ids: docIds.length ? docIds : undefined,
      });
      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Interrogazione RAG fallita");
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl shadow-card overflow-hidden">
      <div className="border-b border-border/40 p-4">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="size-4 text-accent" /> Chiedi ai tuoi PDF
        </div>
        <div className="mt-1 text-xs text-muted-fg">
          {docIds.length === 0
            ? "Interrogazione di TUTTI i tuoi documenti"
            : `Limitato a ${docIds.length} documento${docIds.length !== 1 ? "i" : ""} selezionato${docIds.length !== 1 ? "i" : ""}`}
        </div>
      </div>
      <div className="p-4">
        <div className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Qual è la formula per…?"
          />
          <Button
            onClick={ask}
            disabled={loading || !q.trim()}
            variant="gradient"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>

        <ScrollArea className="mt-4 max-h-[60vh]">
          {!answer && !loading && (
            <div className="text-xs text-muted-fg flex items-center gap-1.5">
              <Search className="size-3.5" /> Suggerimento: sii specifico per
              risposte migliori.
            </div>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-fg pt-2">
              <Loader2 className="size-3 animate-spin" /> Ricerca nel corpus…
            </div>
          )}
          {answer && (
            <div className="space-y-3">
              <div className="rounded-lg bg-elevated/50 p-3 text-sm">
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {answer}
                  </ReactMarkdown>
                </div>
              </div>
              {sources.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-muted-fg mb-2">
                    Fonti
                  </div>
                  <div className="space-y-2">
                    {sources.map((s) => (
                      <div
                        key={s.chunk_id}
                        className="rounded-md border border-border/60 bg-bg/40 p-2 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="secondary">pag. {s.page}</Badge>
                          <span className="font-mono text-muted-fg">
                            {(s.similarity * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-muted-fg line-clamp-3">
                          {s.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </aside>
  );
}
