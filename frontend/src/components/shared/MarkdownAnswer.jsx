import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import QuizRenderer from "./QuizRenderer";

// Heuristica: il contenuto è un quiz?
function looksLikeQuiz(content) {
  if (!content) return false;
  return (
    /(^|\n)\s*#{0,4}\s*\**\s*Quiz\s*:/i.test(content) &&
    /Domanda\s+\d+/i.test(content)
  );
}

// Componenti personalizzati per react-markdown con overflow controllato
// e tipografia coerente col tema dell'app.
const components = {
  // Titoli
  h1: ({ node, ...p }) => (
    <h1
      className="mt-4 mb-2 text-lg font-bold text-fg first:mt-0 break-words"
      {...p}
    />
  ),
  h2: ({ node, ...p }) => (
    <h2
      className="mt-4 mb-2 text-base font-semibold text-fg flex items-center gap-2 first:mt-0 break-words"
      {...p}
    />
  ),
  h3: ({ node, ...p }) => (
    <h3
      className="mt-3 mb-1.5 text-sm font-semibold text-primary first:mt-0 break-words"
      {...p}
    />
  ),
  h4: ({ node, ...p }) => (
    <h4
      className="mt-2 mb-1 text-sm font-semibold text-fg/90 first:mt-0 break-words"
      {...p}
    />
  ),

  // Paragrafo
  p: ({ node, ...p }) => (
    <p
      className="my-2 text-sm leading-relaxed text-fg/90 break-words"
      {...p}
    />
  ),

  // Elenchi
  ul: ({ node, ...p }) => (
    <ul className="my-2 ml-4 list-disc space-y-1 marker:text-primary" {...p} />
  ),
  ol: ({ node, ...p }) => (
    <ol
      className="my-2 ml-4 list-decimal space-y-1 marker:text-primary marker:font-semibold"
      {...p}
    />
  ),
  li: ({ node, ...p }) => (
    <li className="text-sm leading-relaxed text-fg/90 break-words" {...p} />
  ),

  // Stile inline
  strong: ({ node, ...p }) => (
    <strong className="font-semibold text-fg" {...p} />
  ),
  em: ({ node, ...p }) => <em className="italic text-fg/90" {...p} />,
  hr: () => <hr className="my-3 border-border/40" />,

  // Citazioni
  blockquote: ({ node, ...p }) => (
    <blockquote
      className="my-2 border-l-2 border-primary/50 bg-primary/5 px-3 py-1.5 text-sm text-fg/80 italic"
      {...p}
    />
  ),

  // Link
  a: ({ node, ...p }) => (
    <a
      className="text-primary underline-offset-2 hover:underline break-all"
      target="_blank"
      rel="noreferrer noopener"
      {...p}
    />
  ),

  // Codice inline e blocchi codice
  code: ({ inline, className, children, ...p }) => {
    if (inline) {
      return (
        <code
          className="rounded bg-elevated/80 px-1.5 py-0.5 text-[0.85em] font-mono text-accent border border-border/40 break-words"
          {...p}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={cn("font-mono text-[0.85em]", className)} {...p}>
        {children}
      </code>
    );
  },
  pre: ({ node, children, ...p }) => (
    <pre
      className="my-2 max-w-full overflow-x-auto rounded-lg bg-elevated/80 border border-border/40 p-3 text-xs leading-relaxed scrollbar-thin"
      {...p}
    >
      {children}
    </pre>
  ),

  // Tabelle (wrap in overflow per evitare blow-out orizzontale)
  table: ({ node, children, ...p }) => (
    <div className="my-3 max-w-full overflow-x-auto rounded-lg border border-border/40 scrollbar-thin">
      <table
        className="w-full border-collapse text-sm text-left"
        {...p}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ node, ...p }) => (
    <thead className="bg-elevated/60 text-xs uppercase tracking-wide text-muted-fg" {...p} />
  ),
  th: ({ node, ...p }) => (
    <th className="px-3 py-2 font-semibold border-b border-border/40" {...p} />
  ),
  td: ({ node, ...p }) => (
    <td className="px-3 py-2 border-b border-border/30 align-top break-words" {...p} />
  ),
  tr: ({ node, ...p }) => <tr className="hover:bg-elevated/30" {...p} />,
};

/**
 * Renderer unificato per risposte AI (chat e RAG).
 * - Se il contenuto sembra un quiz, usa QuizRenderer.
 * - Altrimenti, rende Markdown con stili coerenti e overflow gestito
 *   (codice, tabelle, parole lunghe).
 */
export default function MarkdownAnswer({ content, className }) {
  if (!content) return null;
  if (looksLikeQuiz(content)) {
    return (
      <div className={cn("min-w-0", className)}>
        <QuizRenderer content={content} />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "min-w-0 max-w-full break-words text-fg/90",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
