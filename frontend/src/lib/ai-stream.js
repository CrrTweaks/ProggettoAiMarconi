// Gestione streaming SSE con il servizio AI FastAPI tramite proxy Node.
// Usiamo fetch e leggiamo il body come stream per poter
// inoltrare l header Authorization (cosa che EventSource non puo fare).
import { tokens, URLs } from "./api.js";

/**
 * @param {object} opts
 * @param {string|null} opts.chatId
 * @param {{role:string,content:string}[]} opts.messages
 * @param {string=} opts.model
 * @param {boolean=} opts.useRag
 * @param {string[]=} opts.documentIds
 * @param {(meta:any)=>void} [opts.onMeta]
 * @param {(chunk:string)=>void} [opts.onChunk]
 * @param {(meta:any)=>void} [opts.onDone]
 * @param {AbortSignal} [opts.signal]
 */
export async function streamChat({
  chatId,
  messages,
  model,
  useRag,
  documentIds,
  onMeta,
  onChunk,
  onDone,
  signal,
}) {
  const res = await fetch(`${URLs.API_URL}/ai/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokens.access || ""}`,
    },
    credentials: "include",
    body: JSON.stringify({
      chat_id: chatId || undefined,
      messages,
      model,
      use_rag: !!useRag,
      document_ids: documentIds && documentIds.length ? documentIds : undefined,
    }),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Stream failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // I messaggi SSE sono separati da righe vuote
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        const obj = JSON.parse(payload);
        if (obj.event === "meta") onMeta?.(obj.data);
        if (obj.event === "chunk") onChunk?.(obj.data);
        if (obj.event === "done") onDone?.(obj.data);
        if (obj.event === "error") throw new Error(obj.data || "AI error");
      } catch (err) {
        // salta righe malformate
        if (err.message?.startsWith("AI")) throw err;
      }
    }
  }
}
