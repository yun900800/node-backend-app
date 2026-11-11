import { postgres as db, pgp } from '../../shared/db/index.js';

const BOOK_COLUMNS = `
  id, title, author, description, cover_url, back_cover_url, font_color, preface,
  front_cover_back_text, slug, category, tags, series_name, series_order,
  status, published_at, seo_title, seo_description, created_at
`;

// `published_at` is written as a timestamp without time zone using the Node
// process timezone. Compare it against the same wall-clock timezone instead of
// UTC; otherwise a freshly published book is treated as future-dated.
const APP_TIME_ZONE = (() => {
  const resolved =
    process.env.APP_TIME_ZONE ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'UTC';
  return /^[A-Za-z0-9_+\-/]+$/.test(resolved) ? resolved : 'UTC';
})();
const APP_NOW = `(NOW() AT TIME ZONE '${APP_TIME_ZONE}')`;

const PUBLISHED_BOOK = `status = 'published' AND published_at IS NOT NULL AND published_at <= ${APP_NOW}`;
const PUBLISHED_REVIEW = `status = 'published' AND published_at IS NOT NULL AND published_at <= ${APP_NOW}`;
const PUBLISHED_BOOK_ALIASED = `b.status = 'published' AND b.published_at IS NOT NULL AND b.published_at <= ${APP_NOW}`;
const PUBLISHED_REVIEW_ALIASED = `r.status = 'published' AND r.published_at IS NOT NULL AND r.published_at <= ${APP_NOW}`;

/**
 * 创建新书籍
 * @param {object} bookData
 * @returns {Promise<object>} 新创建的书籍记录
 */
export const createBook = (bookData) => {
  const table = new pgp.helpers.TableName({ table: 'Book' });
  const insertSql = pgp.helpers.insert(bookData, null, table);
  const sql = `
    ${insertSql}
    RETURNING ${BOOK_COLUMNS}
  `;
  return db.one(sql);
};

/**
 * 根据 ID 更新书籍
 * @param {number} id 书籍ID
 * @param {object} bookData 更新数据（可以部分字段）
 * @returns {Promise<object|null>}
 */
export const updateBookById = (id, bookData) => {
  const condition = pgp.as.format('WHERE id = $1', [id]);
  const table = new pgp.helpers.TableName({ table: 'Book' });
  const updateSql =
    pgp.helpers.update(bookData, null, table) +
    ` ${condition} RETURNING ${BOOK_COLUMNS}`;
  return db.oneOrNone(updateSql);
};

/**
 * 删除书籍
 * @param {number} id 书籍ID
 * @returns {Promise<boolean>} 是否成功删除
 */
export const deleteBookById = async (id) => {
  const result = await db.result('DELETE FROM "Book" WHERE id = $1', [id]);
  return result.rowCount > 0;
};

/**
 * slug 是否已被占用
 */
export const slugExists = async (slug) => {
  const row = await db.oneOrNone(
    'SELECT 1 FROM "Book" WHERE slug = $1 LIMIT 1',
    [slug]
  );
  return Boolean(row);
};

/**
 * 获取单本书籍
 * @param {number} id
 * @param {{ publishedOnly?: boolean }} options
 */
export const findBookById = (id, { publishedOnly = false } = {}) => {
  const filter = publishedOnly ? `AND ${PUBLISHED_BOOK}` : '';
  const sql = `
    SELECT ${BOOK_COLUMNS}
    FROM "Book"
    WHERE id = $1 ${filter}
  `;
  return db.oneOrNone(sql, [id]);
};

/**
 * 根据 slug 获取单本书籍
 * @param {string} slug
 * @param {{ publishedOnly?: boolean }} options
 */
export const findBookBySlug = (slug, { publishedOnly = false } = {}) => {
  const filter = publishedOnly ? `AND ${PUBLISHED_BOOK}` : '';
  const sql = `
    SELECT ${BOOK_COLUMNS}
    FROM "Book"
    WHERE slug = $1 ${filter}
  `;
  return db.oneOrNone(sql, [slug]);
};

/**
 * 获取书籍列表（分页）
 * @param {number} page 当前页
 * @param {number} limit 每页数量
 * @param {{ publishedOnly?: boolean }} options
 */
export const findBooksPaginated = async (
  page = 1,
  limit = 10,
  { publishedOnly = false } = {}
) => {
  const offset = (page - 1) * limit;
  const bookFilter = publishedOnly ? `WHERE ${PUBLISHED_BOOK_ALIASED}` : '';
  const reviewFilter = publishedOnly
    ? `FILTER (WHERE r.id IS NOT NULL AND ${PUBLISHED_REVIEW_ALIASED})`
    : 'FILTER (WHERE r.id IS NOT NULL)';

  const sql = `
    SELECT
      b.id,
      b.title,
      b.author,
      b.description,
      b.cover_url,
      b.back_cover_url,
      b.font_color,
      b.preface,
      b.front_cover_back_text,
      b.slug,
      b.category,
      b.tags,
      b.series_name,
      b.series_order,
      b.status,
      b.published_at,
      b.seo_title,
      b.seo_description,
      b.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', r.id,
            'reviewer', r.reviewer,
            'chapter_title', r.chapter_title,
            'content', r.content,
            'created_at', r.created_at
          )
        ) ${reviewFilter},
        '[]'
      ) AS reviews
    FROM "Book" b
    LEFT JOIN "BookReview" r ON r.book_id = b.id
    ${bookFilter}
    GROUP BY b.id
    ORDER BY b.created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const data = await db.manyOrNone(sql, [limit, offset]);

  const countResult = publishedOnly
    ? await db.one(`SELECT COUNT(*) FROM "Book" WHERE ${PUBLISHED_BOOK}`)
    : await db.one('SELECT COUNT(*) FROM "Book"');

  return {
    total: parseInt(countResult.count, 10),
    page,
    limit,
    data,
  };
};

/**
 * 模糊搜索书籍
 * @param {string} keyword 可选关键词
 */
export const getBooks = async (keyword = '') => {
  const query = `
    SELECT *
    FROM "Book"
    WHERE LOWER(title) LIKE LOWER($1)
    ORDER BY created_at DESC
  `;
  return db.any(query, [`%${keyword}%`]);
};
