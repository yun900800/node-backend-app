// src/modules/bookReview/bookReview.repository.js
import { postgres as db } from '../../shared/db/index.js';

/**
 * 创建新评论
 */
export const createBookReview = async (reviewData) => {
  const {
    book_id,
    reviewer,
    chapter_title,
    content,
    status,
    published_at,
  } = reviewData;
  const query = `
    INSERT INTO "BookReview" (book_id, reviewer, chapter_title, content, status, published_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const values = [book_id, reviewer, chapter_title, content, status, published_at];
  return db.one(query, values);
};

/**
 * 根据书籍 ID 获取评论列表
 * @param {number} book_id
 * @param {{ publishedOnly?: boolean }} options
 */
export const getReviewsByBookId = async (
  book_id,
  { publishedOnly = false } = {}
) => {
  const filter = publishedOnly
    ? `AND status = 'published' AND published_at IS NOT NULL AND published_at <= NOW()`
    : '';
  const query = `
    SELECT * FROM "BookReview"
    WHERE book_id = $1 ${filter}
    ORDER BY created_at DESC;
  `;
  return db.any(query, [book_id]);
};

/**
 * 更新评论
 * 返回 null 表示评论不存在
 */
export const updateBookReview = async (
  id,
  { chapter_title, content, status }
) => {
  const query = `
    UPDATE "BookReview"
    SET chapter_title = $2,
        content = $3,
        status = COALESCE($4, status),
        published_at = CASE
          WHEN $4 = 'published' AND published_at IS NULL THEN NOW()
          ELSE published_at
        END,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;
  return db.oneOrNone(query, [id, chapter_title, content, status ?? null]);
};

/**
 * 删除评论
 * 返回 null 表示评论不存在
 */
export const deleteBookReview = async (id) => {
  const query = `
    DELETE FROM "BookReview"
    WHERE id = $1
    RETURNING *;
  `;
  return db.oneOrNone(query, [id]);
};
