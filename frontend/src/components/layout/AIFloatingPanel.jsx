import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Send, Sparkles, X } from "lucide-react";

import { useUI } from "@/store/ui";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/input";
import { streamChat } from "@/lib/ai-stream";
import { cn } from "@/lib/utils";

export default function AIFloatingPanel() {
  const { aiPanelOpen, setAIPanel } = useUI();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (aiPanelOpen)
      setTimeout(() => scrollRef.current?.scrollTo({ top: 1e9 }), 50);
  }, [aiPanelOpen, messages.length]);

  // Scorciatoia Cmd/Ctrl + J
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setAIPanel(!aiPanelOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aiPanelOpen, setAIPanel]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    setMessages((m) => [...m, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);
    try {
      await streamChat({
        chatId,
        messages: [...messages, userMsg],
        onMeta: (meta) => meta?.chat_id && setChatId(meta.chat_id),
        onChunk: (chunk) =>
          setMessages((m) => {
            const arr = [...m];
            arr[arr.length - 1] = {
              ...arr[arr.length - 1],
              content: arr[arr.length - 1].content + chunk,
            };
            return arr;
          }),
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
      setLoading(false);
    }
  };

  return (
    <>
      {/* Lanciatore fluttuante (solo quando il pannello e chiuso) */}
      <AnimatePresence>
        {!aiPanelOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setAIPanel(true)}
            className="fixed bottom-6 right-6 z-30 grid size-14 place-items-center rounded-full bg-gradient-to-br from-primary to-accent shadow-glow"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            aria-label="Chiedi all'AI"
          >
            <Sparkles className="size-6 text-white" />
            <span className="absolute inset-0 rounded-full ring-2 ring-primary/40 animate-pulse-soft" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aiPanelOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
            className={cn(
              "fixed bottom-6 right-6 z-40 flex w-[min(100vw-3rem,420px)] flex-col",
              "h-[min(80vh,620px)] glass-strong rounded-2xl overflow-hidden",
            )}
          >
            <header className="flex items-center justify-between border-b border-border/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-md bg-gradient-to-br from-primary to-accent">
                  <Sparkles className="size-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Tony · Tutor AI</div>
                  <div className="text-[10px] text-muted-fg">
                    LLM locale via Ollama
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setAIPanel(false)}
              >
                <X className="size-4" />
              </Button>
            </header>

            <ScrollArea className="flex-1 px-4">
              <div ref={scrollRef} className="py-4 space-y-3">
                {messages.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-muted-fg">
                    Ciao {user?.full_name?.split(" ")[0] || ""}! Sono Tony, il
                    tuo tutor AI. Chiedimi spiegazioni, riassunti o quiz: ti
                    aiuto a studiare.
                  </div>
                )}
                {messages.map((m, i) => (
                  <Bubble key={i} role={m.role} content={m.content} />
                ))}
                {loading &&
                  messages[messages.length - 1]?.role === "assistant" &&
                  !messages[messages.length - 1]?.content && (
                    <Bubble role="assistant" content="…" loading />
                  )}
              </div>
            </ScrollArea>

            <div className="border-t border-border/40 p-3">
              <div className="flex gap-2 items-end">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Chiedi qualsiasi cosa…"
                  className="min-h-[44px] max-h-32"
                />
                <Button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  size="icon"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
              <div className="mt-2 text-[10px] text-muted-fg">
                ⌘J apri/chiudi · Invio per inviare · Maiusc+Invio per andare a
                capo
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({ role, content, loading }) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
          isUser
            ? "bg-primary/15 text-fg ring-1 ring-primary/30 rounded-br-md"
            : "bg-elevated/70 text-fg rounded-bl-md",
        )}
      >
        {loading ? (
          <span className="inline-block animate-pulse-soft">●●●</span>
        ) : (
          content
        )}
      </div>
    </motion.div>
  );
}
