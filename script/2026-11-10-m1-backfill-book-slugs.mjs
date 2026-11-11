// M1 第 1 步：为存量书籍回填拼音 slug，并加唯一约束。
// 用法：
//   node script/2026-11-10-m1-backfill-book-slugs.mjs --dry-run   # 只打印，回滚
//   node script/2026-11-10-m1-backfill-book-slugs.mjs             # 真正写入
//
// 前置：先执行 2026-11-10-m1-book-content-fields.sql。

import { postgres as db } from '../shared/db/index.js';
import { generateSlug } from '../shared/slug.js';

const dryRun = process.argv.includes('--dry-run');
const ROLLBACK_MARKER = 'M1_SLUG_DRY_RUN_ROLLBACK';

function buildAssignments(books, usedSlugs) {
  const assignments = [];

  for (const book of books) {
    const base = generateSlug(book.title);
    let slug = base;
    let suffix = 2;

    while (usedSlugs.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.add(slug);
    assignments.push({ id: book.id, title: book.title, slug });
  }

  return assignments;
}

async function backfill(t) {
  await t.none("SET LOCAL lock_timeout = '5s'");

  const existing = await t.any('SELECT slug FROM "Book" WHERE slug IS NOT NULL');
  const usedSlugs = new Set(existing.map((row) => row.slug));
  const pending = await t.any(
    'SELECT id, title FROM "Book" WHERE slug IS NULL ORDER BY id'
  );

  const assignments = buildAssignments(pending, usedSlugs);

  for (const item of assignments) {
    await t.none('UPDATE "Book" SET slug = $1 WHERE id = $2', [
      item.slug,
      item.id,
    ]);
  }

  console.log(`[slug] 待回填 ${assignments.length} 本，已占用 ${usedSlugs.size} 个 slug`);
  if (assignments.length > 0) {
    console.table(assignments);
  }

  if (dryRun) {
    throw new Error(ROLLBACK_MARKER);
  }

  await t.none('ALTER TABLE "Book" ALTER COLUMN slug SET NOT NULL');
  await t.none(
    'CREATE UNIQUE INDEX IF NOT EXISTS book_slug_key ON "Book" (slug)'
  );
}

try {
  await db.tx(backfill);
  console.log('[slug] 回填完成，slug 已设为 NOT NULL 并建立唯一索引');
} catch (error) {
  if (error.message === ROLLBACK_MARKER) {
    console.log('[slug] dry-run 完成，事务已回滚，未写入任何数据');
  } else {
    console.error('[slug] 回填失败:', error);
    process.exitCode = 1;
  }
} finally {
  await db.$pool.end();
}
