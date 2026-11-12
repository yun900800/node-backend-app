// 公开门户控制器：无需登录的只读接口
// 复用 books / book-review 现有 service，只暴露 GET，不引入任何写操作
import * as bookService from '../books/book.service.js';
import * as bookReviewService from '../book-review/bookReview.service.js';

const DEFAULT_LATEST_REVIEWS = 5;
const MAX_LATEST_REVIEWS = 20;

export const parseLatestReviewLimit = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LATEST_REVIEWS;
  return Math.min(Math.max(parsed, 1), MAX_LATEST_REVIEWS);
};

/**
 * 获取全站最新公开书评
 * GET /api/public/reviews?limit=5
 */
export const getPublicLatestReviews = async (req, res) => {
  const limit = parseLatestReviewLimit(req.query.limit);
  const reviews = await bookReviewService.getLatestPublishedReviews(limit);
  res.json({ data: reviews, limit });
};

/**
 * 分页获取书籍列表（每本书内嵌评论）
 * GET /api/public/books?page=1&limit=12
 */
export const getPublicBooks = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 12;
  const category = String(req.query.category || '').trim();
  const tag = String(req.query.tag || '').trim();
  const series = String(req.query.series || '').trim();
  const result = await bookService.getBooks(page, limit, {
    publishedOnly: true,
    category,
    tag,
    series,
  });
  res.json(result);
};

/**
 * 获取公开站点的分类 / 标签 / 系列
 * GET /api/public/taxonomies
 */
export const getPublicTaxonomies = async (req, res) => {
  const taxonomies = await bookService.getTaxonomies();
  res.json(taxonomies);
};

/**
 * 获取单本书籍详情 + 评论列表
 * GET /api/public/books/:bookId
 */
export const getPublicBookDetail = async (req, res) => {
  const { bookId } = req.params;
  const key = String(bookId || '').trim();
  const isNumericId = /^\d+$/.test(key);

  const book = isNumericId
    ? await bookService.getBookById(key, { publishedOnly: true })
    : await bookService.getBookBySlug(key.toLowerCase(), {
        publishedOnly: true,
      });

  if (!book) {
    return res.status(404).json({ message: 'Book not found' });
  }

  let reviews = [];
  try {
    reviews = await bookReviewService.getReviewsForBook(book.id, {
      publishedOnly: true,
    });
  } catch (err) {
    // 评论查询失败不影响主数据展示
    reviews = [];
  }

  res.json({ ...book, reviews });
};
