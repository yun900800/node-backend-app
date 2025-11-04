// src/modules/book/book.service.js
import * as bookRepository from './book.repository.js';

/**
 * 创建书籍
 */
export const createBook = (bookData) => {
  if (!bookData.title) throw new Error('Title is required');
  return bookRepository.createBook(bookData);
};

/**
 * 更新书籍
 */
export const updateBook = async (id, bookData) => {
  const existing = await bookRepository.findBookById(id);
  if (!existing) return null;
  return bookRepository.updateBookById(id, {
    ...bookData,
    updated_at: new Date(),
  });
};

/**
 * 删除书籍
 */
export const deleteBook = (id) => {
  return bookRepository.deleteBookById(id);
};

/**
 * 分页查询书籍
 */
export const getBooks = (page, limit) => {
  return bookRepository.findBooksPaginated(page, limit);
};

/**
 * 获取单本书籍
 */
export const getBookById = (id) => {
  return bookRepository.findBookById(id);
};
