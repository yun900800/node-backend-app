-- M1 第 1 步：Book / BookReview 内容模型与发布字段
-- 执行方式：
--   psql "$POSTGRES_URL_NON_POOLING" -f script/2026-11-10-m1-book-content-fields.sql
-- 或使用项目的 Node 连接执行。
--
-- 说明：
-- - DDL 使用 IF NOT EXISTS，可重复执行。
-- - 存量数据回填用固定截止时间（2026-11-11 00:00:00）保护，
--   重复执行不会把之后创建的草稿误标为已发布。
-- - slug 的回填需要拼音，放在 2026-11-10-m1-backfill-book-slugs.mjs。

BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE "Book"
  ADD COLUMN IF NOT EXISTS slug VARCHAR(255),
  ADD COLUMN IF NOT EXISTS category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS series_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS series_order INTEGER,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS seo_description TEXT;

ALTER TABLE "BookReview"
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;

-- 存量书籍/评论视为已发布（截止到 2026-11-11 之前创建的数据）
UPDATE "Book"
SET status = 'published',
    published_at = COALESCE(published_at, created_at, NOW())
WHERE status = 'draft'
  AND created_at < TIMESTAMP '2026-11-11 00:00:00';

UPDATE "BookReview"
SET status = 'published',
    published_at = COALESCE(published_at, created_at, NOW())
WHERE status = 'draft'
  AND created_at < TIMESTAMP '2026-11-11 00:00:00';

ALTER TABLE "Book" DROP CONSTRAINT IF EXISTS book_status_check;
ALTER TABLE "Book"
  ADD CONSTRAINT book_status_check CHECK (status IN ('draft', 'published'));

ALTER TABLE "BookReview" DROP CONSTRAINT IF EXISTS book_review_status_check;
ALTER TABLE "BookReview"
  ADD CONSTRAINT book_review_status_check CHECK (status IN ('draft', 'published'));

CREATE INDEX IF NOT EXISTS book_status_published_idx
  ON "Book" (status, published_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS book_slug_key
  ON "Book" (slug);
CREATE INDEX IF NOT EXISTS book_review_book_idx
  ON "BookReview" (book_id);
CREATE INDEX IF NOT EXISTS book_review_status_published_idx
  ON "BookReview" (status, published_at);
CREATE INDEX IF NOT EXISTS book_tags_idx
  ON "Book" USING gin (tags);

COMMIT;
