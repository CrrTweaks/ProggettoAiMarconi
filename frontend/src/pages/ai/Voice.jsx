import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Square,
  Volume2,
  Loader2,
  Sparkles,
  Send,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { aiApi } from "@/lib/api";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function VoicePage() {
  const [transcript, setTranscript] = useState("");
  const [tts, setTts] = useState(
    "Ciao! Sono il tuo tutor AI. Come posso aiutarti oggi?",
  );
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [synth, setSynth] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [lang, setLang] = useState("it");

  const recRef = useRef(null);
  const audioRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        await transcribe(blob);
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

  const transcribe = async (blob) => {
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append("file", blob, "rec.webm");
      fd.append("lang", lang === "it" ? "it-IT" : "en-US");
      const { data } = await aiApi.post("/voice/transcribe", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTranscript((t) => (t ? t + " " : "") + (data.text || ""));
      if (!data.text) toast("Nessun parlato rilevato");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Trascrizione fallita");
    } finally {
      setTranscribing(false);
    }
  };

  const synthesize = async () => {
    if (!tts.trim()) return;
    setSynth(true);
    try {
      const res = await aiApi.post(
        "/voice/tts",
        { text: tts, lang },
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(res.data);
      setAudioUrl(url);
      setTimeout(() => audioRef.current?.play().catch(() => {}), 50);
    } catch (e) {
      toast.error(e.response?.data?.detail || "TTS fallito");
    } finally {
      setSynth(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Mic}
        title="AI Vocale"
        subtitle="Speech-to-text e text-to-speech, nella tua lingua"
        actions={
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="h-9 rounded-md border border-border bg-elevated/40 px-3 text-xs"
          >
            <option value="it">Italiano</option>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* STT */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl p-6 shadow-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Da voce a testo</h3>
              <p className="text-xs text-muted-fg">
                Registra la tua voce, ottieni la trascrizione istantanea.
              </p>
            </div>
            <Mic className="size-5 text-primary" />
          </div>

          <div className="my-6 grid place-items-center">
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={transcribing}
              className={cn(
                "relative grid size-32 place-items-center rounded-full transition-all shadow-glow",
                recording
                  ? "bg-rose-500 ring-4 ring-rose-500/30"
                  : "bg-gradient-to-br from-primary to-accent ring-4 ring-primary/20 hover:scale-105",
              )}
            >
              {transcribing ? (
                <Loader2 className="size-10 text-white animate-spin" />
              ) : recording ? (
                <Square className="size-10 text-white" />
              ) : (
                <Mic className="size-10 text-white" />
              )}
              <AnimatePresence>
                {recording && (
                  <>
                    <motion.span
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-rose-500"
                    />
                    <motion.span
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.8, opacity: 0 }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        delay: 0.4,
                      }}
                      className="absolute inset-0 rounded-full bg-rose-500"
                    />
                  </>
                )}
              </AnimatePresence>
            </button>
          </div>
          <div className="text-center text-xs text-muted-fg mb-4">
            {recording
              ? "Registrazione… clicca per fermare"
              : transcribing
                ? "Trascrizione…"
                : "Clicca per iniziare"}
          </div>

          <Label>Trascrizione</Label>
          <Textarea
            rows={6}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="La tua trascrizione apparirà qui…"
          />
          <Button
            variant="outline"
            className="mt-2 w-full"
            onClick={() => {
              setTts(transcript);
              toast("Inviato a TTS");
            }}
            disabled={!transcript}
          >
            <Wand2 className="size-4" /> Invia a text-to-speech
          </Button>
        </motion.div>

        {/* TTS */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/60 bg-panel/60 backdrop-blur-xl p-6 shadow-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Da testo a voce</h3>
              <p className="text-xs text-muted-fg">
                Scrivi qualsiasi testo e lascia che l'AI lo pronunci ad alta
                voce.
              </p>
            </div>
            <Volume2 className="size-5 text-accent" />
          </div>

          <Label className="mt-4 block">Testo</Label>
          <Textarea
            rows={6}
            value={tts}
            onChange={(e) => setTts(e.target.value)}
          />
          <Button
            onClick={synthesize}
            disabled={synth || !tts.trim()}
            variant="gradient"
            className="mt-3 w-full"
          >
            {synth ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Genera audio
          </Button>

          {audioUrl && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-lg border border-border/60 bg-elevated/30 p-3"
            >
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                className="w-full"
              />
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
