// src/modules/bookReview/bookReview.service.js
import * as bookReviewRepo from './bookReview.repository.js';
import * as bookRepo from '../books/book.repository.js';

export const addReview = async (reviewData) => {
  const { book_id } = reviewData;

  // ✅ 检查书籍是否存在
  const bookExists = await bookRepo.findBookById(book_id);
  if (!bookExists) {
    throw new Error(`书籍 ID ${book_id} 不存在`);
  }

  // ✅ 保存评论
  return await bookReviewRepo.createBookReview(reviewData);
};

export const getReviewsForBook = async (book_id) => {
  // ✅ 检查书籍是否存在
  const bookExists = await bookRepo.findBookById(book_id);
  if (!bookExists) {
    throw new Error(`书籍 ID ${book_id} 不存在`);
  }

  // ✅ 获取评论列表
  return await bookReviewRepo.getReviewsByBookId(book_id);
};
