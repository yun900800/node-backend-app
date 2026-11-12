export const PUBLISH_STATUSES = ['draft', 'published'];

// `published_at` is written as a timestamp without time zone using the Node
// process timezone. Compare it against the same wall-clock timezone instead of
// UTC; otherwise a freshly published record is treated as future-dated.
const resolveAppTimeZone = () => {
  const resolved =
    process.env.APP_TIME_ZONE ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'UTC';
  return /^[A-Za-z0-9_+\-/]+$/.test(resolved) ? resolved : 'UTC';
};

export const APP_TIME_ZONE = resolveAppTimeZone();
export const APP_NOW = `(NOW() AT TIME ZONE '${APP_TIME_ZONE}')`;

export function normalizePublishStatus(value, fallback = 'draft') {
  if (value === undefined || value === null || value === '') return fallback;
  if (!PUBLISH_STATUSES.includes(value)) {
    throw new Error(`Invalid status: ${value}`);
  }
  return value;
}

/**
 * 发布时间规则：
 * - 发布：优先用传入时间，其次保留上次发布时间，最后取当前时间
 * - 草稿：保留历史发布时间（首次发布后不因下架而重置）
 */
export function resolvePublishedAt({ status, providedAt, previousAt }) {
  if (status !== 'published') return previousAt ?? null;
  if (providedAt) {
    return providedAt instanceof Date ? providedAt : new Date(providedAt);
  }
  return previousAt ?? new Date();
}

export function normalizeTags(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error('Tags 必须是数组');
  }
  return [...new Set(value.map((tag) => String(tag).trim()).filter(Boolean))];
}
