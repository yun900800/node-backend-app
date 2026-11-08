import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMigrationPlan } from '../script/lib/migrationPlan.mjs';

test('normalizes emails, links existing auth users, reports conflicts', () => {
  const plan = buildMigrationPlan({
    localUsers: [
      { id: 'p1', email: 'Alice@X.com', password: 'h1', username: 'alice', auth_user_id: null },
      { id: 'p2', email: 'bob@x.com', password: 'h2', username: 'bob', auth_user_id: null },
      { id: 'p3', email: 'alice@x.com', password: 'h3', username: 'alice2', auth_user_id: null },
    ],
    authUsers: [{ id: 7, email: 'alice@x.com', username: 'alice' }],
  });
  assert.equal(plan.links.length, 1);
  assert.equal(plan.links[0].localId, 'p1');
  assert.equal(plan.links[0].authId, 7);
  assert.ok(plan.conflicts.some((c) => c.reason === 'duplicate-local-email'));
  assert.ok(plan.inserts.some((i) => i.email === 'bob@x.com'));
});

test('username collisions are reported and nulled', () => {
  const plan = buildMigrationPlan({
    localUsers: [
      { id: 'p1', email: 'a@x.com', password: 'h1', username: 'dup', auth_user_id: null },
      { id: 'p2', email: 'b@x.com', password: 'h2', username: 'dup', auth_user_id: null },
    ],
    authUsers: [],
  });
  assert.equal(plan.inserts.filter((i) => i.username === 'dup').length, 1);
  assert.ok(plan.conflicts.some((c) => c.reason === 'duplicate-username'));
});

test('same email with a different password is linked and flagged as a warning', () => {
  const plan = buildMigrationPlan({
    localUsers: [{ id: 'p1', email: 'a@x.com', password: 'local-hash', username: 'alice', auth_user_id: null }],
    authUsers: [{ id: 7, email: 'a@x.com', username: 'alice', password: 'auth-hash' }],
  });
  assert.equal(plan.links.length, 1);
  assert.equal(plan.links[0].passwordMismatch, true);
  assert.ok(plan.warnings.some((w) => w.reason === 'password-mismatch'));
});
