// 公开门户控制器：无需登录的只读接口
// 复用 books / book-review 现有 service，只暴露 GET，不引入任何写操作
import * as bookService from '../books/book.service.js';
import * as bookReviewService from '../book-review/bookReview.service.js';

/**
 * 分页获取书籍列表（每本书内嵌评论）
 * GET /api/public/books?page=1&limit=12
 */
export const getPublicBooks = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;
  const result = await bookService.getBooks(page, limit);
  res.json(result);
};

/**
 * 获取单本书籍详情 + 评论列表
 * GET /api/public/books/:bookId
 */
export const getPublicBookDetail = async (req, res) => {
  const { bookId } = req.params;
  const book = await bookService.getBookById(bookId);

  if (!book) {
    return res.status(404).json({ message: 'Book not found' });
  }

  let reviews = [];
  try {
    reviews = await bookReviewService.getReviewsForBook(bookId);
  } catch (err) {
    // 评论查询失败不影响主数据展示
    reviews = [];
  }

  res.json({ ...book, reviews });
};
