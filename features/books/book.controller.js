// src/modules/book/book.controller.js
import * as bookService from './book.service.js';

/**
 * 创建书籍
 */
export const createBook = async (req, res) => {
  try {
    const book = await bookService.createBook(req.body);
    res.status(201).json({ message: 'Book created successfully', book });
  } catch (err) {
    console.error('Create book error:', err);
    res.status(500).json({ message: 'Failed to create book' });
  }
};

/**
 * 更新书籍
 */
export const updateBook = async (req, res) => {
  const { id } = req.params;
  try {
    const book = await bookService.updateBook(id, req.body);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json({ message: 'Book updated', book });
  } catch (err) {
    console.error('Update book error:', err);
    res.status(500).json({ message: 'Failed to update book' });
  }
};

/**
 * 删除书籍
 */
export const deleteBook = async (req, res) => {
  const { id } = req.params;
  const success = await bookService.deleteBook(id);
  if (!success) {
    return res.status(404).json({ message: 'Book not found' });
  }
  res.json({ message: 'Book deleted successfully' });
};

/**
 * 获取分页书籍列表
 */
export const getBooks = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const result = await bookService.getBooks(page, limit);
  res.json(result);
};

/**
 * 获取单本书籍
 */
export const getBookById = async (req, res) => {
  const { id } = req.params;
  const book = await bookService.getBookById(id);
  if (!book) {
    return res.status(404).json({ message: 'Book not found' });
  }
  res.json(book);
};

export const searchBooks = async (req, res) => {
  try {
    const keyword = req.query.keyword || '';
    const books = await bookService.searchBooks(keyword);
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 
