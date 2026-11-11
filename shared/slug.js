import { pinyin } from 'pinyin-pro';

const MAX_SLUG_LENGTH = 80;

/**
 * 把标题转成 URL slug。
 * 中文走拼音，英文/数字保留，标点折叠成连字符。
 * 纯符号或空标题回退到 "book"。
 */
export function generateSlug(title) {
  const raw = pinyin(String(title ?? ''), {
    toneType: 'none',
    type: 'array',
    nonZh: 'consecutive',
  }).join('-');

  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');

  return slug || 'book';
}

/**
 * 在给定 slug 已被占用时追加 -2、-3… 直到找到空位。
 * exists 是异步判断函数，便于测试和复用。
 */
export async function ensureUniqueSlug(base, exists, { maxSuffix = 100 } = {}) {
  const slug = base || 'book';
  if (!(await exists(slug))) return slug;

  for (let suffix = 2; suffix <= maxSuffix; suffix += 1) {
    const candidate = `${slug}-${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }

  throw new Error(`无法为 slug 生成唯一值: ${slug}`);
}
