import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createProtect } from '../middleware/protect.middleware.js';
import { createTokenCache } from '../features/auth/tokenCache.js';

function makeApp(protect) {
  const app = express();
  app.get('/protected', protect, (req, res) => res.json({ user: req.user }));
  return app;
}

test('local mode preserves the legacy JWT userId behavior', async () => {
  const app = makeApp(createProtect({
    mode: 'local', authClient: {}, profiles: {}, cache: createTokenCache(), jwtSecret: 's',
  }));
  const token = jwt.sign({ userId: 'p1' }, 's');
  const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.user.userId, 'p1');
});

test('remote mode introspects, caches, and maps to the local profile id', async () => {
  let calls = 0;
  const authClient = { async introspect() { calls += 1; return { active: true, user: { id: 7, email: 'a@b.com', username: 'alice' }, roles: [], permissions: [] }; } };
  const profiles = {
    async ensureProfile() { return { id: 'p1', email: 'a@b.com', username: 'alice' }; },
    async isUsernameTaken() { return false; },
  };
  const app = makeApp(createProtect({ mode: 'remote', authClient, profiles, cache: createTokenCache(), jwtSecret: 's' }));

  const first = await request(app).get('/protected').set('Authorization', 'Bearer t');
  assert.equal(first.status, 200);
  assert.equal(first.body.user.userId, 'p1');
  const second = await request(app).get('/protected').set('Authorization', 'Bearer t');
  assert.equal(second.status, 200);
  assert.equal(calls, 1);
});

test('cache entries expire after the ttl', () => {
  let t = 0;
  const cache = createTokenCache({ ttlMs: 1000, now: () => t });
  cache.set('k', 1);
  assert.equal(cache.get('k'), 1);
  t = 1001;
  assert.equal(cache.get('k'), undefined);
});

test('inactive token is 401 and auth-service outage is 503', async () => {
  const inactive = { async introspect() { return { active: false }; } };
  const profiles = { async ensureProfile() { return { id: 'p1' }; } };
  const app = makeApp(createProtect({ mode: 'remote', authClient: inactive, profiles, cache: createTokenCache(), jwtSecret: 's' }));
  assert.equal((await request(app).get('/protected').set('Authorization', 'Bearer t')).status, 401);

  const down = { async introspect() { throw Object.assign(new Error('down'), { status: 503 }); } };
  const app2 = makeApp(createProtect({ mode: 'remote', authClient: down, profiles, cache: createTokenCache(), jwtSecret: 's' }));
  assert.equal((await request(app2).get('/protected').set('Authorization', 'Bearer t')).status, 503);
});
