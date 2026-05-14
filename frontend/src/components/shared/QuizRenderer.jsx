import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  ChevronDown,
  CheckCircle2,
  FileQuestion,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Strip simple markdown emphasis markers from a string.
function stripMd(s) {
  return (s || "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

function parseQuiz(md) {
  // Title: accept "## Quiz: ...", "**Quiz: ...**", or just "Quiz: ..." on its own line.
  const titleMatch =
    md.match(/(?:^|\n)\s*#{0,4}\s*\**\s*Quiz\s*:\s*([^\n*]+)/i) || null;
  const title = stripMd(titleMatch?.[1] || "") || "Quiz";

  // Split into blocks at any "Domanda N" line, regardless of heading/bold markers.
  const blockSplitRe =
    /(?=(?:^|\n)\s*(?:#{1,4}\s*|\*\*)?Domanda\s+\d+\b)/i;
  const blocks = md
    .split(blockSplitRe)
    .filter((b) => /(?:^|\n)\s*(?:#{1,4}\s*|\*\*)?Domanda\s+\d+/i.test(b));

  const questions = blocks.map((rawBlock) => {
    const block = rawBlock.trim();

    // Header: "Domanda N — type" with optional ###, **, and various dashes.
    const header = block.match(
      /(?:#{1,4}\s*|\*\*)?Domanda\s+(\d+)\s*[—–-]\s*([^\n*]+)/i,
    );
    const number = header?.[1] || "";
    const type = stripMd(header?.[2] || "");

    // Question text.
    let text = "";
    const dMatch = block.match(/\*\*\s*D\s*:?\s*\*\*\s*([^\n]+)/i);
    if (dMatch) text = stripMd(dMatch[1]);
    if (!text) {
      const lines = block.split("\n");
      const hIdx = lines.findIndex((l) => /Domanda\s+\d+/i.test(l));
      for (let i = hIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // skip option lines, html tags, summary markers, dividers
        if (/^[-*•]\s*[A-D]\)/i.test(line)) continue;
        if (/^<\/?[a-z]/i.test(line)) continue;
        if (/^✅|^Risposta\b/i.test(line)) continue;
        if (/^[-_=]{3,}$/.test(line)) continue;
        text = stripMd(line);
        break;
      }
    }

    // Options A-D (with or without leading "-"/"•"/"*").
    const options = [];
    const seen = new Set();
    const optRe = /(?:^|\n)\s*(?:[-*•]\s*)?([A-D])\)\s+([^\n]+)/gi;
    let m;
    while ((m = optRe.exec(block)) !== null) {
      const letter = m[1].toUpperCase();
      if (seen.has(letter)) continue;
      seen.add(letter);
      options.push({ letter, text: stripMd(m[2]) });
    }

    // Correct answer: tolerate **bold** or plain, "—", "-", ":" separators,
    // optional source "[p.N]" at the end.
    const ansMatch = block.match(
      /(?:\*\*\s*)?Risposta\s+corretta\s*:?\s*(?:\*\*)?\s*([A-Z])?\s*(?:[—–\-:]\s*)?([^\n]*)/i,
    );
    let correctLetter = ansMatch?.[1]?.toUpperCase() || "";
    let explanationRaw = ansMatch?.[2] || "";

    // If no letter (e.g. open question), try to extract one from the explanation
    // if it starts with "A — ..." style; otherwise leave empty.
    if (!correctLetter) {
      const lead = explanationRaw.match(/^\s*([A-D])\s*[—–\-:]\s*(.*)/);
      if (lead) {
        correctLetter = lead[1].toUpperCase();
        explanationRaw = lead[2];
      }
    }

    // Strip trailing "[p.N]" from explanation; capture as source.
    const srcMatch = explanationRaw.match(/\[([^\]]+)\]\s*\.?\s*$/);
    const source = srcMatch?.[1] || (block.match(/\[(p\.[^\]]+)\]/i)?.[1] || "");
    const explanation = stripMd(
      explanationRaw.replace(/\[[^\]]+\]\s*\.?\s*$/, "").trim(),
    );

    return { number, type, text, options, correctLetter, explanation, source };
  });

  return { title, questions };
}

export default function QuizRenderer({ content }) {
  const quiz = useMemo(() => parseQuiz(content), [content]);
  const [revealed, setRevealed] = useState({});

  if (!quiz.questions.length) {
    // Fallback to normal markdown if parsing yields nothing
    return (
      <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  const toggle = (num) =>
    setRevealed((prev) => ({ ...prev, [num]: !prev[num] }));

  return (
    <div className="space-y-4">
      {/* Quiz header */}
      <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary/20 to-accent/10 p-3 border border-primary/20">
        <FileQuestion className="size-5 text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-fg">{quiz.title}</h3>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {quiz.questions.map((q) => (
          <div
            key={q.number}
            className="rounded-xl border border-border/60 bg-elevated/40 p-4"
          >
            {/* Question header */}
            <div className="flex items-start gap-2 mb-2">
              <span className="inline-flex items-center justify-center rounded-full bg-primary/15 text-primary text-[11px] font-bold size-5 shrink-0 mt-0.5">
                {q.number}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-fg leading-relaxed break-words">
                  {q.text}
                </p>
                {q.type && (
                  <span className="inline-block mt-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-fg uppercase tracking-wide">
                    {q.type}
                  </span>
                )}
              </div>
            </div>

            {/* Options */}
            {q.options.length > 0 && (
              <div className="ml-7 space-y-1.5 mb-3">
                {q.options.map((opt) => (
                  <div
                    key={opt.letter}
                    className="flex items-start gap-2 text-sm text-fg/90"
                  >
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded-full size-5 shrink-0 text-[10px] font-bold border mt-0.5",
                        revealed[q.number] &&
                          opt.letter === q.correctLetter
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : revealed[q.number]
                            ? "bg-muted/40 text-muted-fg border-border/40"
                            : "bg-primary/10 text-primary border-primary/20",
                      )}
                    >
                      {revealed[q.number] &&
                      opt.letter === q.correctLetter ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        opt.letter
                      )}
                    </span>
                    <span className="leading-relaxed break-words pt-0.5">
                      {opt.text}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Toggle answer */}
            <button
              onClick={() => toggle(q.number)}
              className="ml-7 inline-flex items-center gap-1.5 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/20 px-3 py-1.5 text-xs font-medium text-primary transition-colors"
            >
              <HelpCircle className="size-3.5" />
              {revealed[q.number]
                ? "Nascondi risposta"
                : "Mostra risposta"}
              <motion.span
                animate={{ rotate: revealed[q.number] ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="size-3.5" />
              </motion.span>
            </button>

            {/* Answer reveal */}
            <AnimatePresence initial={false}>
              {revealed[q.number] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="ml-7 mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="size-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-300">
                        {q.correctLetter
                          ? `Risposta corretta: ${q.correctLetter}`
                          : "Risposta"}
                      </span>
                    </div>
                    {q.explanation && (
                      <p className="text-sm text-fg/90 leading-relaxed break-words">
                        {q.explanation}
                      </p>
                    )}
                    {q.source && (
                      <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-fg">
                        <BookOpen className="size-3" />
                        <span>Fonte: {q.source}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
