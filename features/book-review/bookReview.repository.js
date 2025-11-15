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
