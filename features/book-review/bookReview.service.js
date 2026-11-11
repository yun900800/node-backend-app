// src/modules/bookReview/bookReview.service.js
import * as bookReviewRepo from './bookReview.repository.js';
import * as bookRepo from '../books/book.repository.js';
import {
  normalizePublishStatus,
  resolvePublishedAt,
} from '../../shared/publishing.js';

export const addReview = async (reviewData = {}) => {
  const { book_id } = reviewData;

  // ✅ 检查书籍是否存在
  const bookExists = await bookRepo.findBookById(book_id);
  if (!bookExists) {
    throw new Error(`书籍 ID ${book_id} 不存在`);
  }

  const status = normalizePublishStatus(reviewData.status, 'draft');
  const published_at = resolvePublishedAt({
    status,
    providedAt: reviewData.published_at,
  });

  // ✅ 保存评论（默认草稿，发布由管理端显式触发）
  return await bookReviewRepo.createBookReview({
    ...reviewData,
    status,
    published_at,
  });
};

export const getReviewsForBook = async (book_id, options = {}) => {
  // ✅ 检查书籍是否存在（公开模式只认已发布书籍）
  const bookExists = await bookRepo.findBookById(book_id, options);
  if (!bookExists) {
    throw new Error(`书籍 ID ${book_id} 不存在`);
  }

  // ✅ 获取评论列表
  return await bookReviewRepo.getReviewsByBookId(book_id, options);
};

const createHttpError = (message, status) =>
  Object.assign(new Error(message), { status });

const parseReviewId = (id) => {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError('评论 ID 无效', 400);
  }
  return parsed;
};

const assertContent = (content) => {
  if (typeof content !== 'string' || content.trim() === '') {
    throw createHttpError('评论内容不能为空', 400);
  }
};

export const updateReview = async (id, reviewData = {}) => {
  const reviewId = parseReviewId(id);
  assertContent(reviewData.content);

  const status =
    reviewData.status === undefined
      ? undefined
      : normalizePublishStatus(reviewData.status);

  const updated = await bookReviewRepo.updateBookReview(reviewId, {
    chapter_title: reviewData.chapter_title,
    content: reviewData.content,
    status,
  });

  if (!updated) {
    throw createHttpError('评论不存在', 404);
  }

  return updated;
};

export const deleteReview = async (id) => {
  const reviewId = parseReviewId(id);
  const deleted = await bookReviewRepo.deleteBookReview(reviewId);

  if (!deleted) {
    throw createHttpError('评论不存在', 404);
  }

  return deleted;
};
