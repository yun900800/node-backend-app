import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePublishedAt,
  normalizePublishStatus,
  normalizeTags,
  resolvePublishedAt,
} from '../shared/publishing.js';

test('默认状态为 draft', () => {
  assert.equal(normalizePublishStatus(undefined), 'draft');
  assert.equal(normalizePublishStatus(''), 'draft');
  assert.equal(normalizePublishStatus(null, 'published'), 'published');
});

test('只接受 draft / published', () => {
  assert.equal(normalizePublishStatus('published'), 'published');
  assert.throws(() => normalizePublishStatus('archived'), /Invalid status/);
});

test('发布时优先使用传入时间，其次保留旧时间，最后取当前时间', () => {
  const provided = new Date('2026-01-01T00:00:00Z');
  const previous = new Date('2025-01-01T00:00:00Z');

  assert.equal(
    resolvePublishedAt({ status: 'published', providedAt: provided, previousAt: previous }).toISOString(),
    provided.toISOString()
  );
  assert.equal(
    resolvePublishedAt({ status: 'published', previousAt: previous }).toISOString(),
    previous.toISOString()
  );
  const now = resolvePublishedAt({ status: 'published' });
  assert.ok(now instanceof Date);
});

test('草稿保留历史发布时间，新建草稿没有发布时间', () => {
  const previous = new Date('2025-01-01T00:00:00Z');
  assert.equal(
    resolvePublishedAt({ status: 'draft', previousAt: previous }).toISOString(),
    previous.toISOString()
  );
  assert.equal(resolvePublishedAt({ status: 'draft' }), null);
});

test('发布时间支持 Date / ISO 字符串，空值返回 undefined', () => {
  const date = new Date('2026-12-01T09:30:00.000Z');

  assert.equal(normalizePublishedAt(undefined), undefined);
  assert.equal(normalizePublishedAt(null), undefined);
  assert.equal(normalizePublishedAt(''), undefined);
  assert.equal(normalizePublishedAt(date).toISOString(), date.toISOString());
  assert.equal(
    normalizePublishedAt('2026-12-01T09:30:00.000Z').toISOString(),
    date.toISOString()
  );
  assert.throws(() => normalizePublishedAt('not-a-date'), /Invalid published_at/);
});

test('tags 去重、去空白、过滤空值', () => {
  assert.deepEqual(
    normalizeTags([' 阅读 ', '阅读', '', '   ', '随笔']),
    ['阅读', '随笔']
  );
  assert.deepEqual(normalizeTags(undefined), []);
  assert.throws(() => normalizeTags('阅读'), /Tags 必须是数组/);
});
