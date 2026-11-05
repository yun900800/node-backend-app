// src/modules/bookReview/bookReview.repository.js
import { postgres as db, pgp } from '../../shared/db/index.js';

/**
 * 创建新评论
 */
export const createBookReview = async (reviewData) => {
  const { book_id, reviewer, chapter_title, content } = reviewData;
  const query = `
    INSERT INTO "BookReview" (book_id, reviewer, chapter_title, content)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const values = [book_id, reviewer, chapter_title, content];
  return db.one(query, values);
};

/**
 * 根据书籍 ID 获取评论列表
 */
export const getReviewsByBookId = async (book_id) => {
  const query = `
    SELECT * FROM "BookReview"
    WHERE book_id = $1
    ORDER BY created_at DESC;
  `;
  return db.any(query, [book_id]);
};

/**
 * 更新评论
 * 返回 null 表示评论不存在
 */
export const updateBookReview = async (id, { chapter_title, content }) => {
  const query = `
    UPDATE "BookReview"
    SET chapter_title = $2,
        content = $3,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;
  return db.oneOrNone(query, [id, chapter_title, content]);
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
