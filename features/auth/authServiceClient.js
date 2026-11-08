// Thin HTTP client for the auth-service. The BFF is the only caller; every
// failure is normalized to AuthServiceError so route handlers can map it to a
// stable client-facing message.

import { AuthServiceError } from './authErrors.js';

const trimBase = (baseUrl) => String(baseUrl || '').replace(/\/+$/, '');

async function readBody(response) {
  const type = response.headers.get('content-type') || '';
  if (response.status === 204) return null;
  if (!type.includes('application/json')) {
    const text = await response.text();
    return text ? { message: text } : null;
  }
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

/**
 * @param {{ baseUrl: string, serviceToken?: string, timeoutMs?: number, fetchImpl?: typeof fetch }} options
 */
export function createAuthServiceClient({
  baseUrl,
  serviceToken,
  timeoutMs = 5000,
  fetchImpl = globalThis.fetch,
}) {
  const root = trimBase(baseUrl);

  async function request(path, { method = 'GET', body, token, useServiceToken = false } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers = {};
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (token) headers.authorization = `Bearer ${token}`;
    if (useServiceToken && serviceToken) headers['x-service-token'] = serviceToken;

    let response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      const timedOut = err?.name === 'AbortError';
      throw new AuthServiceError(503, timedOut ? 'Auth service request timed out' : 'Auth service unavailable', err);
    } finally {
      clearTimeout(timer);
    }

    const payload = await readBody(response);
    if (!response.ok) {
      const message = payload?.error || payload?.message || `Auth service error (${response.status})`;
      throw new AuthServiceError(response.status, message, payload);
    }
    return payload;
  }

  return {
    login(email, password) {
      return request('/api/auth/login', { method: 'POST', body: { email, password } });
    },
    register({ email, password, username, code }) {
      return request('/api/auth/register', { method: 'POST', body: { email, password, username, code } });
    },
    loginByCode(email, code) {
      return request('/api/auth/login/code', { method: 'POST', body: { email, code } });
    },
    requestCode(email, purpose) {
      return request('/api/auth/email/request-code', { method: 'POST', body: { email, purpose } });
    },
    me(token) {
      return request('/api/auth/me', { token });
    },
    introspect(token) {
      return request('/api/introspect', { method: 'POST', body: { token }, useServiceToken: true });
    },
  };
}
