import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSlug, ensureUniqueSlug } from '../shared/slug.js';

test('中文标题转拼音 slug', () => {
  assert.equal(generateSlug('百年孤独-精装版'), 'bai-nian-gu-du-jing-zhuang-ban');
  assert.equal(generateSlug('一如既往'), 'yi-ru-ji-wang');
});

test('英文与数字保留并转小写', () => {
  assert.equal(generateSlug('CSAPP'), 'csapp');
  assert.equal(generateSlug('Clean Code 2nd'), 'clean-code-2nd');
});

test('标点被折叠且首尾没有连字符', () => {
  assert.equal(generateSlug('《三体》'), 'san-ti');
  assert.equal(generateSlug('  hello, world!  '), 'hello-world');
});

test('空标题回退为 book', () => {
  assert.equal(generateSlug(''), 'book');
  assert.equal(generateSlug('!!!'), 'book');
});

test('slug 长度不超过 80', () => {
  const slug = generateSlug('一'.repeat(200));
  assert.ok(slug.length <= 80);
  assert.ok(!slug.endsWith('-'));
});

test('ensureUniqueSlug 依次尝试后缀', async () => {
  const used = new Set(['book', 'book-2']);
  const slug = await ensureUniqueSlug('book', async (value) => used.has(value));
  assert.equal(slug, 'book-3');
});

test('ensureUniqueSlug 在全部占用时抛错', async () => {
  await assert.rejects(
    () => ensureUniqueSlug('book', async () => true, { maxSuffix: 2 }),
    /无法为 slug 生成唯一值/
  );
});
