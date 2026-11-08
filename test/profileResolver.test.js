import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveProfile } from '../features/auth/profileResolver.js';

const authUser = { id: 7, email: 'a@b.com', username: 'alice' };

test('uses the profile matched by auth_user_id', () => {
  const r = resolveProfile({ authUser, byAuthId: { id: 'p1', auth_user_id: 7 }, byEmail: null });
  assert.equal(r.action, 'use');
});

test('links a profile whose auth_user_id is null', () => {
  const r = resolveProfile({ authUser, byAuthId: null, byEmail: { id: 'p1', auth_user_id: null } });
  assert.equal(r.action, 'link');
});

test('never adopts a profile owned by another auth user', () => {
  const r = resolveProfile({ authUser, byAuthId: null, byEmail: { id: 'p1', auth_user_id: 99 } });
  assert.equal(r.action, 'conflict');
  assert.equal(r.existingAuthUserId, 99);
});

test('creates when neither id nor email matches', () => {
  assert.equal(resolveProfile({ authUser, byAuthId: null, byEmail: null }).action, 'create');
});
