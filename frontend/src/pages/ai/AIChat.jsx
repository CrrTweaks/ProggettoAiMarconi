import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Loader2,
  Mic,
  MicOff,
  Trash2,
  Plus,
  Brain,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { streamChat } from "@/lib/ai-stream";
import { aiApi } from "@/lib/api";
import { cn } from "@/lib/utils";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const MODELS = [
  { id: "llama3", label: "Llama 3" },
  { id: "mistral", label: "Mistral" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "codellama", label: "CodeLlama" },
];

export default function AIChat() {
  const qc = useQueryClient();
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("llama3");
  const [useRag, setUseRag] = useState(false);
  const [docIds, setDocIds] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const scrollRef = useRef(null);
  const recRef = useRef(null);

  // List chats
  const { data: chats = [] } = useQuery({
    queryKey: ["ai-chats"],
    queryFn: async () => (await api.get("/ai/chats")).data.chats || [],
  });

  // List user PDFs (for RAG)
  const { data: docs = [] } = useQuery({
    queryKey: ["ai-rag-docs"],
    queryFn: async () =>
      (await api.get("/ai/rag/documents")).data.documents || [],
  });

  // Load history when switching chat
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!chatId) {
        setMessages([]);
        return;
      }
      try {
        const { data } = await api.get(`/ai/chats/${chatId}/messages`);
        if (!cancelled) setMessages(data.messages || []);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  useEffect(() => {
    setTimeout(
      () => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }),
      50,
    );
  }, [messages.length, streaming]);

  const newChat = () => {
    setChatId(null);
    setMessages([]);
  };

  const deleteChat = async (id) => {
    try {
      await api.delete(`/ai/chats/${id}`);
      qc.invalidateQueries({ queryKey: ["ai-chats"] });
      if (chatId === id) newChat();
    } catch {
      toast.error("Impossibile eliminare");
    }
  };

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = { role: "user", content: input };
    setMessages((m) => [
      ...m,
      userMsg,
      { role: "assistant", content: "", sources: [] },
    ]);
    setInput("");
    setStreaming(true);
    try {
      await streamChat({
        chatId,
        model,
        useRag,
        documentIds: docIds,
        messages: [...messages, userMsg],
        onMeta: (meta) => {
          if (meta?.chat_id) setChatId(meta.chat_id);
          setMessages((m) => {
            const arr = [...m];
            arr[arr.length - 1] = {
              ...arr[arr.length - 1],
              sources: meta.sources || [],
            };
            return arr;
          });
        },
        onChunk: (chunk) => {
          setMessages((m) => {
            const arr = [...m];
            arr[arr.length - 1] = {
              ...arr[arr.length - 1],
              content: (arr[arr.length - 1].content || "") + chunk,
            };
            return arr;
          });
        },
        onDone: () => qc.invalidateQueries({ queryKey: ["ai-chats"] }),
      });
    } catch (e) {
      setMessages((m) => {
        const arr = [...m];
        arr[arr.length - 1] = {
          role: "assistant",
          content: `⚠️ ${e.message || "Errore AI"}`,
        };
        return arr;
      });
    } finally {
      setStreaming(false);
    }
  };

  // ── Voice input via MediaRecorder + AI /voice/transcribe ──
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        // Convert to wav-ish via FormData; FastAPI accepts the raw blob.
        const fd = new FormData();
        fd.append("file", blob, "rec.webm");
        fd.append("lang", "it-IT");
        try {
          const { data } = await aiApi.post("/voice/transcribe", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          if (data?.text) setInput((v) => (v ? v + " " : "") + data.text);
          else toast("Nessun parlato rilevato");
        } catch {
          toast.error("Trascrizione fallita");
        }
      };
      mr.start();
      recRef.current = mr;
      setRecording(true);
    } catch {
      toast.error("Microfono non disponibile");
    }
  };

  const stopRecording = () => {
    recRef.current?.stop();
    setRecording(false);
  };

  // TTS read-aloud
  const speak = async (text) => {
    try {
      const res = await aiApi.post(
        "/voice/tts",
        { text, lang: "it" },
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(res.data);
      const audio = new Audio(url);
      audio.play();
    } catch {
      toast.error("TTS fallito");
    }
  };

  return (
    <div className="grid h-[calc(100vh-9rem)] grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      {/* Sidebar (chats) */}
      <aside className="hidden lg:flex flex-col rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl overflow-hidden">
        <div className="p-3 border-b border-border/40">
          <Button variant="gradient" className="w-full" onClick={newChat}>
            <Plus className="size-4" /> Nuova chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {chats.length === 0 && (
              <div className="p-4 text-xs text-muted-fg text-center">
                Nessuna conversazione
              </div>
            )}
            {chats.map((c) => (
              <div
                key={c.id}
                onClick={() => setChatId(c.id)}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors",
                  chatId === c.id
                    ? "bg-primary/10 ring-1 ring-primary/30"
                    : "hover:bg-elevated/60",
                )}
              >
                <Sparkles className="size-3.5 text-primary shrink-0" />
                <div className="min-w-0 flex-1 truncate">
                  {c.title || "Senza titolo"}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-muted-fg hover:text-danger"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      {/* Main chat */}
      <div className="flex min-h-0 flex-col rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl overflow-hidden">
        <PageHeader
          className="m-4 mb-2"
          icon={Sparkles}
          title="Aria · Tutor AI"
          subtitle="LLM locale via Ollama · risposte in streaming"
          actions={
            <div className="flex items-center gap-2">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="h-9 rounded-md border border-border bg-elevated/40 px-2 text-xs"
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2 rounded-md border border-border bg-elevated/40 px-3 h-9">
                <Brain className="size-4 text-muted-fg" />
                <span className="text-xs">RAG</span>
                <Switch checked={useRag} onCheckedChange={setUseRag} />
              </div>
            </div>
          }
        />

        {useRag && docs.length > 0 && (
          <div className="mx-4 mb-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="text-xs font-medium mb-2 text-primary">
              Limita il contesto ai documenti:
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setDocIds([])}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px]",
                  docIds.length === 0
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-fg",
                )}
              >
                Tutti i miei PDF
              </button>
              {docs.map((d) => (
                <button
                  key={d.id}
                  onClick={() =>
                    setDocIds((ids) =>
                      ids.includes(d.id)
                        ? ids.filter((i) => i !== d.id)
                        : [...ids, d.id],
                    )
                  }
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] truncate max-w-[16rem]",
                    docIds.includes(d.id)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-fg",
                  )}
                >
                  {d.filename}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin"
        >
          {messages.length === 0 ? (
            <div className="grid h-full place-items-center">
              <EmptyState
                icon={Sparkles}
                title="Inizia una nuova conversazione"
                description="Chiedi qualsiasi cosa al tuo tutor AI — concetti, riassunti, quiz, codice…"
              />
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <Bubble key={i} message={m} onSpeak={speak} />
                ))}
              </AnimatePresence>
              {streaming && (
                <div className="flex items-center gap-2 text-xs text-muted-fg pl-1">
                  <Loader2 className="size-3 animate-spin" /> Aria sta pensando…
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-border/40 p-3">
          <div className="flex items-end gap-2">
            <Button
              variant={recording ? "destructive" : "outline"}
              size="icon"
              onClick={recording ? stopRecording : startRecording}
              title="Input vocale"
            >
              {recording ? (
                <MicOff className="size-4" />
              ) : (
                <Mic className="size-4" />
              )}
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Scrivi a Aria…"
              className="min-h-[44px] max-h-40 flex-1"
            />
            <Button
              onClick={send}
              disabled={streaming || !input.trim()}
              variant="gradient"
              size="icon"
            >
              {streaming ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
          <div className="mt-1 text-[10px] text-muted-fg">
            Invio per inviare · Shift+Invio per nuova riga · Clicca 🎙 per
            parlare
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ message, onSpeak }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-white ring-1 ring-primary/30 mt-0.5">
          <Sparkles className="size-4" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-primary/15 text-fg ring-1 ring-primary/30 rounded-br-md"
            : "bg-elevated/70 text-fg rounded-bl-md",
        )}
      >
        <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-pre:my-2 prose-headings:my-2">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content || (isUser ? "" : "…")}
          </ReactMarkdown>
        </div>
        {!isUser && message.sources?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.sources.map((s, i) => (
              <Badge key={i} variant="secondary" title={s.content}>
                p.{s.page} · {(s.similarity * 100).toFixed(0)}%
              </Badge>
            ))}
          </div>
        )}
        {!isUser && message.content && (
          <button
            onClick={() => onSpeak(message.content)}
            className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-muted-fg hover:text-fg"
          >
            <Volume2 className="size-3" /> Leggi ad alta voce
          </button>
        )}
      </div>
    </motion.div>
  );
}
