// ════════════════════════════════════════════════════════════════
//  Thin proxy to the FastAPI AI microservice
// ════════════════════════════════════════════════════════════════
import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export const aiClient = axios.create({
  baseURL: env.AI_SERVICE_URL,
  timeout: 120_000,
});

aiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    logger.error(
      { url: err.config?.url, status: err.response?.status, data: err.response?.data },
      'AI service error'
    );
    return Promise.reject(err);
  }
);

export const aiChat        = (body) => aiClient.post('/chat', body).then(r => r.data);
export const aiRagQuery    = (body) => aiClient.post('/rag/query', body).then(r => r.data);
export const aiConceptMap  = (body) => aiClient.post('/concept-map', body).then(r => r.data);
export const aiHealth      = ()      => aiClient.get('/health').then(r => r.data);
