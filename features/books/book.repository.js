import { postgres as db, pgp } from '../../shared/db/index.js';

/**
 * 创建新书籍
 * @param {object} bookData { title, author, description, cover_url, back_cover_url, font_color, preface }
 * @returns {Promise<object>} 新创建的书籍记录
 */
export const createBook = (bookData) => {
  const table = new pgp.helpers.TableName({ table: 'Book' });
  const insertSql = pgp.helpers.insert(bookData, null, table);
  const sql = `
    ${insertSql} 
    RETURNING id, title, author, description, cover_url, back_cover_url, font_color, preface, front_cover_back_text, "created_at"
  `;
  return db.one(sql);
};

/**
 * 根据 ID 更新书籍
 * @param {number} id 书籍ID
 * @param {object} bookData 更新数据（可以部分字段）
 * @returns {Promise<object|null>}
 */
export const updateBookById = (id, bookData) => {
  const condition = pgp.as.format('WHERE id = $1', [id]);
  const table = new pgp.helpers.TableName({ table: 'Book' });
  const updateSql =
    pgp.helpers.update(bookData, null, table) +
    ` ${condition} RETURNING id, title, author, description, cover_url, back_cover_url, font_color, preface, front_cover_back_text, "created_at"`;
  return db.oneOrNone(updateSql);
};

/**
 * 删除书籍
 * @param {number} id 书籍ID
 * @returns {Promise<boolean>} 是否成功删除
 */
export const deleteBookById = async (id) => {
  const result = await db.result('DELETE FROM "Book" WHERE id = $1', [id]);
  return result.rowCount > 0;
};

/**
 * 获取单本书籍
 */
export const findBookById = (id) => {
  const sql = `
    SELECT id, title, author, description, cover_url, back_cover_url, font_color, preface, front_cover_back_text, "created_at"
    FROM "Book" 
    WHERE id = $1
  `;
  return db.oneOrNone(sql, [id]);
};

/**
 * 获取书籍列表（分页）
 * @param {number} page 当前页
 * @param {number} limit 每页数量
 */
export const findBooksPaginated = async (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const sql = `
    SELECT id, title, author, description, cover_url, back_cover_url, font_color, preface, front_cover_back_text, "created_at"
    FROM "Book" 
    ORDER BY "created_at" DESC
    LIMIT $1 OFFSET $2
  `;
  const data = await db.manyOrNone(sql, [limit, offset]);

  const countResult = await db.one('SELECT COUNT(*) FROM "Book"');
  return {
    total: parseInt(countResult.count, 10),
    page,
    limit,
    data,
  };
};

/**
 * 模糊搜索书籍
 * @param {string} keyword 可选关键词
 */
export const getBooks = async (keyword = '') => {
  const query = `
    SELECT *
    FROM "Book"
    WHERE LOWER(title) LIKE LOWER($1)
    ORDER BY created_at DESC
  `;
  return db.any(query, [`%${keyword}%`]);
};

