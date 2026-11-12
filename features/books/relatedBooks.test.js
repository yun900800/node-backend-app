import test from 'node:test';
import assert from 'node:assert/strict';
import { rankRelatedBooks } from './relatedBooks.js';

const current = {
  id: 1,
  title: 'Current',
  author: 'Author A',
  category: '小说',
  tags: ['小说', '经典'],
  series_name: '系列 A',
  published_at: '2026-01-01T00:00:00.000Z',
};

const sameSeries = {
  id: 2,
  title: 'Same series',
  author: 'Author B',
  category: '随笔',
  tags: ['随笔'],
  series_name: '系列 A',
  published_at: '2026-02-01T00:00:00.000Z',
};

const sameAuthor = {
  id: 3,
  title: 'Same author',
  author: 'Author A',
  category: '随笔',
  tags: ['随笔'],
  series_name: '系列 B',
  published_at: '2026-03-01T00:00:00.000Z',
};

const sharedTags = {
  id: 4,
  title: 'Shared tags',
  author: 'Author B',
  category: '小说',
  tags: ['小说', '经典'],
  series_name: '系列 B',
  published_at: '2026-04-01T00:00:00.000Z',
};

test('excludes the current book', () => {
  const result = rankRelatedBooks(current, [current, sameSeries]);
  assert.deepEqual(
    result.map((book) => book.id),
    [sameSeries.id]
  );
});

test('ranks same series before same author and shared tags', () => {
  const result = rankRelatedBooks(current, [
    sharedTags,
    sameAuthor,
    sameSeries,
  ]);

  assert.deepEqual(
    result.map((book) => book.id),
    [sameSeries.id, sameAuthor.id, sharedTags.id]
  );
});

test('does not expose the internal score', () => {
  const [result] = rankRelatedBooks(current, [sameSeries]);

  assert.equal(result.related_score, undefined);
  assert.equal(result.id, sameSeries.id);
});

test('respects the limit', () => {
  const result = rankRelatedBooks(
    current,
    [sameSeries, sameAuthor, sharedTags],
    2
  );

  assert.deepEqual(
    result.map((book) => book.id),
    [sameSeries.id, sameAuthor.id]
  );
});

test('drops candidates with no overlap', () => {
  const unrelated = {
    id: 5,
    title: 'Unrelated',
    author: 'Author C',
    category: '历史',
    tags: ['历史'],
    series_name: '系列 C',
  };

  const result = rankRelatedBooks(current, [unrelated]);

  assert.deepEqual(result, []);
});

test('handles missing arrays and empty author/category values', () => {
  const sparseCurrent = {
    id: 10,
    author: '',
    category: null,
    tags: null,
    series_name: null,
  };
  const sparseCandidate = {
    id: 11,
    author: '',
    category: null,
    tags: null,
    series_name: null,
  };

  const result = rankRelatedBooks(sparseCurrent, [sparseCandidate]);

  assert.deepEqual(result, []);
});
