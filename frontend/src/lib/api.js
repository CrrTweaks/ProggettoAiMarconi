// ════════════════════════════════════════════════════════════════
//  Axios clients for Node API and AI service, with auto-refresh.
// ════════════════════════════════════════════════════════════════
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const AI_URL  = import.meta.env.VITE_AI_URL  || 'http://localhost:8000';

const TOKEN_KEY   = 'aiws_access';
const REFRESH_KEY = 'aiws_refresh';

export const tokens = {
  get access()  { return localStorage.getItem(TOKEN_KEY); },
  get refresh() { return localStorage.getItem(REFRESH_KEY); },
  set(access, refresh) {
    if (access)  localStorage.setItem(TOKEN_KEY,   access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export const aiApi = axios.create({
  baseURL: AI_URL,
});

// Attach access token
const attach = (config) => {
  const t = tokens.access;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
};
api.interceptors.request.use(attach);
aiApi.interceptors.request.use(attach);

// Single in-flight refresh promise
let refreshing = null;

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    if (
      err.response?.status === 401 &&
      !original?._retry &&
      !original?.url?.includes('/auth/')
    ) {
      original._retry = true;
      try {
        if (!refreshing) {
          refreshing = axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: tokens.refresh,
          }, { withCredentials: true })
            .then(({ data }) => {
              tokens.set(data.access_token, data.refresh_token);
              return data.access_token;
            })
            .finally(() => { refreshing = null; });
        }
        const newToken = await refreshing;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        tokens.clear();
        if (typeof window !== 'undefined' && !location.pathname.startsWith('/auth')) {
          location.assign('/auth/login');
        }
        return Promise.reject(e);
      }
    }
    return Promise.reject(err);
  },
);

// Same refresh handling for the AI service (which also receives JWT directly)
aiApi.interceptors.response.use(
  (r) => r,
  async (err) => Promise.reject(err)
);

export const URLs = { API_URL, AI_URL };
