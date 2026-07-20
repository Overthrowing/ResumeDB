const DEFAULT_BACKEND_URL = 'http://localhost:8000';
const DEFAULT_WEB_APP_URL = 'http://localhost:5173';

const normalizeBaseUrl = (value, fallback) => {
  const candidate = (value || fallback).trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
    return parsed.origin;
  } catch {
    return fallback;
  }
};

const getResumeDbSettings = async () => {
  const stored = await chrome.storage.sync.get({
    backendUrl: DEFAULT_BACKEND_URL,
    webAppUrl: DEFAULT_WEB_APP_URL,
  });
  return {
    backendUrl: normalizeBaseUrl(stored.backendUrl, DEFAULT_BACKEND_URL),
    webAppUrl: normalizeBaseUrl(stored.webAppUrl, DEFAULT_WEB_APP_URL),
  };
};

const getBackendCandidates = async () => {
  const { backendUrl } = await getResumeDbSettings();
  return [...new Set([backendUrl, DEFAULT_BACKEND_URL, 'http://127.0.0.1:8000'])];
};
