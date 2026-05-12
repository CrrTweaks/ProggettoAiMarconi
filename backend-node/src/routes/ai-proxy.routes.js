// ════════════════════════════════════════════════════════════════
//  /ai · thin authenticated proxy to FastAPI service
//        (chat, RAG, concept-map, voice, suggestions)
// ════════════════════════════════════════════════════════════════
import { Router } from 'express';
import axios from 'axios';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { aiClient } from '../services/ai-proxy.js';
import { query } from '../config/db.js';

const router = Router();
router.use(requireAuth);

/** Health passthrough */
router.get('/health', asyncHandler(async (_req, res) => {
  const { data } = await aiClient.get('/health');
  res.json(data);
}));

/** ── Chat (non-streaming) ── */
router.post('/chat', asyncHandler(async (req, res) => {
  const { messages, model, chat_id } = req.body;
  const { data } = await aiClient.post('/chat', {
    user_id: req.user.id,
    messages,
    model,
    chat_id,
  });
  res.json(data);
}));

/** ── Chat streaming (Server-Sent Events) ── */
router.post('/chat/stream', asyncHandler(async (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders?.();

  const upstream = await aiClient.post('/chat/stream',
    { ...req.body, user_id: req.user.id },
    { responseType: 'stream', timeout: 0 }
  );

  upstream.data.on('data',  (c) => res.write(c));
  upstream.data.on('end',   () => res.end());
  upstream.data.on('error', (e) => { res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`); res.end(); });
  req.on('close', () => upstream.data.destroy());
}));

/** ── List my chats ── */
router.get('/chats', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, title, model, created_at, updated_at
     FROM ai_chats WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 50`,
    [req.user.id]
  );
  res.json({ chats: rows });
}));

/** ── Messages of a chat ── */
router.get('/chats/:id/messages', asyncHandler(async (req, res) => {
  const own = await query(
    `SELECT 1 FROM ai_chats WHERE id=$1 AND user_id=$2`,
    [req.params.id, req.user.id]
  );
  if (!own.rowCount) throw new HttpError(404, 'Chat not found');
  const { rows } = await query(
    `SELECT id, role, content, created_at FROM ai_messages
     WHERE chat_id=$1 ORDER BY created_at ASC`,
    [req.params.id]
  );
  res.json({ messages: rows });
}));

router.delete('/chats/:id', asyncHandler(async (req, res) => {
  await query(`DELETE FROM ai_chats WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

/** ── RAG · upload PDF (multipart passthrough) ── */
router.post('/rag/upload', asyncHandler(async (req, res) => {
  // Front-end uploads multipart directly to FastAPI, but we expose a proxy too.
  const { data } = await aiClient.post('/rag/upload', req.body, {
    headers: req.headers,
    params: { user_id: req.user.id },
  });
  res.json(data);
}));

router.get('/rag/documents', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM pdf_documents WHERE user_id=$1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json({ documents: rows });
}));

router.delete('/rag/documents/:id', asyncHandler(async (req, res) => {
  await query(`DELETE FROM pdf_documents WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

router.post('/rag/query', asyncHandler(async (req, res) => {
  const { data } = await aiClient.post('/rag/query', { ...req.body, user_id: req.user.id });
  res.json(data);
}));

/** ── Concept maps ── */
router.post('/concept-map', asyncHandler(async (req, res) => {
  const { data } = await aiClient.post('/concept-map', { ...req.body, user_id: req.user.id });
  res.json(data);
}));

router.get('/concept-maps', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, title, created_at FROM concept_maps
     WHERE user_id=$1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json({ maps: rows });
}));

router.get('/concept-maps/:id', asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM concept_maps WHERE id=$1 AND user_id=$2`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Map not found');
  res.json({ map: rows[0] });
}));

/** ── Voice ── */
router.post('/voice/transcribe', asyncHandler(async (req, res) => {
  const upstream = await aiClient.post('/voice/transcribe', req, {
    headers: { 'content-type': req.headers['content-type'] },
    responseType: 'json',
  });
  res.json(upstream.data);
}));

router.post('/voice/tts', asyncHandler(async (req, res) => {
  const upstream = await aiClient.post('/voice/tts', req.body, { responseType: 'stream' });
  res.setHeader('Content-Type', 'audio/mpeg');
  upstream.data.pipe(res);
}));

/** ── AI calendar suggestions ── */
router.post('/suggest/exam-day', asyncHandler(async (req, res) => {
  const { class_id, week_start } = req.body;
  // Fetch workload for the week
  const { rows: days } = await query(
    `WITH days AS (SELECT generate_series(0,6) AS d)
     SELECT (date $2 + d) AS day,
            (SELECT COUNT(*) FROM homework h WHERE h.class_id=$1 AND h.due_date = date $2 + d AND h.deleted_at IS NULL) AS homework,
            (SELECT COUNT(*) FROM exams e WHERE e.class_id=$1 AND e.scheduled_for::date = date $2 + d) AS exams,
            (SELECT COUNT(*) FROM interrogations i WHERE i.class_id=$1 AND i.scheduled_for::date = date $2 + d) AS interrogations
     FROM days ORDER BY day`,
    [class_id, week_start]
  );
  const { data } = await aiClient.post('/suggest/exam-day', { workload: days });
  res.json(data);
}));

export default router;
