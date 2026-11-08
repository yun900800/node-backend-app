// Small TTL cache for introspect results. Keys are SHA-256(token) so raw
// bearer tokens are never retained as Map keys.

export function createTokenCache({ ttlMs = 30000, max = 10000, now = Date.now } = {}) {
  const entries = new Map();

  function get(key) {
    const entry = entries.get(key);
    if (!entry) return undefined;
    if (now() >= entry.expiresAt) {
      entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  function set(key, value) {
    if (entries.has(key)) entries.delete(key);
    entries.set(key, { value, expiresAt: now() + ttlMs });
    while (entries.size > max) {
      const oldest = entries.keys().next().value;
      entries.delete(oldest);
    }
  }

  function clear() {
    entries.clear();
  }

  return { get, set, clear };
}
