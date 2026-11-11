import * as bookRepository from './book.repository.js';
import { generateSlug, ensureUniqueSlug } from '../../shared/slug.js';
import {
  normalizePublishStatus,
  normalizeTags,
  resolvePublishedAt,
} from '../../shared/publishing.js';

const BOOK_WRITABLE_FIELDS = [
  'title',
  'author',
  'description',
  'cover_url',
  'back_cover_url',
  'font_color',
  'preface',
  'front_cover_back_text',
  'slug',
  'category',
  'tags',
  'series_name',
  'series_order',
  'status',
  'published_at',
  'seo_title',
  'seo_description',
];

const pickBookFields = (source = {}) =>
  Object.fromEntries(
    BOOK_WRITABLE_FIELDS.filter(
      (field) => source[field] !== undefined
    ).map((field) => [field, source[field]])
  );

const createValidationError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * 创建书籍
 */
export const createBook = async (bookData = {}) => {
  if (!bookData.title) {
    throw createValidationError('Title is required');
  }

  const status = normalizePublishStatus(bookData.status, 'draft');
  const tags = normalizeTags(bookData.tags);
  const slugSource = String(bookData.slug ?? '').trim() || bookData.title;
  const baseSlug = generateSlug(slugSource);
  const slug = await ensureUniqueSlug(baseSlug, bookRepository.slugExists);

  return bookRepository.createBook({
    ...pickBookFields(bookData),
    slug,
    status,
    tags,
    published_at: resolvePublishedAt({
      status,
      providedAt: bookData.published_at,
    }),
  });
};

/**
 * 更新书籍
 */
export const updateBook = async (id, bookData = {}) => {
  const existing = await bookRepository.findBookById(id);
  if (!existing) return null;

  const updates = pickBookFields(bookData);

  if (updates.status !== undefined) {
    updates.status = normalizePublishStatus(updates.status);
    updates.published_at = resolvePublishedAt({
      status: updates.status,
      providedAt: updates.published_at,
      previousAt: existing.published_at,
    });
  }

  if (updates.slug !== undefined) {
    if (String(updates.slug).trim() === '') {
      throw createValidationError('Slug 不能为空');
    }
    const nextSlug = generateSlug(updates.slug);
    if (
      nextSlug !== existing.slug &&
      (await bookRepository.slugExists(nextSlug))
    ) {
      throw createValidationError(`Slug 已被占用: ${nextSlug}`, 409);
    }
    updates.slug = nextSlug;
  }

  if (updates.tags !== undefined) {
    updates.tags = normalizeTags(updates.tags);
  }

  if (Object.keys(updates).length === 0) return existing;

  return bookRepository.updateBookById(id, {
    ...updates,
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
export const getBooks = (page, limit, options = {}) => {
  return bookRepository.findBooksPaginated(page, limit, options);
};

/**
 * 获取单本书籍
 */
export const getBookById = (id, options = {}) => {
  return bookRepository.findBookById(id, options);
};

export const searchBooks = async (keyword) => {
  return await bookRepository.getBooks(keyword);
};
