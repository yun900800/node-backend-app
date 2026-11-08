import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { createRemoteAuthRouter } from '../features/auth/remoteAuthRouter.js';

function fakeAuthClient(overrides = {}) {
  return {
    async login() { return { accessToken: 't', expiresIn: 86400, user: { id: 7, email: 'a@b.com', username: 'alice' } }; },
    async register() { return { id: 7, email: 'a@b.com', username: 'alice' }; },
    async loginByCode() { return { accessToken: 't', expiresIn: 86400, user: { id: 7, email: 'a@b.com', username: 'alice' } }; },
    async requestCode() { return { message: '验证码已发送', cooldown: 60 }; },
    async me() { return { id: 7, email: 'a@b.com', username: 'alice', roles: [], permissions: [] }; },
    ...overrides,
  };
}

function makeApp(deps) {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', createRemoteAuthRouter(deps));
  return app;
}

test('login returns the legacy { token, user } shape', async () => {
  const profiles = {
    async ensureProfile() { return { id: 'p1', email: 'a@b.com', username: 'alice' }; },
    async isUsernameTaken() { return false; },
  };
  const res = await request(makeApp({ authClient: fakeAuthClient(), profiles }))
    .post('/api/auth/login').send({ email: 'a@b.com', password: 'x' });
  assert.equal(res.status, 200);
  assert.equal(res.body.token, 't');
  assert.equal(res.body.user.id, 'p1');
  assert.equal(res.body.user.username, 'alice');
});

test('me maps the auth user to the local profile id', async () => {
  const profiles = {
    async ensureProfile() { return { id: 'p1', email: 'a@b.com', username: 'alice' }; },
    async isUsernameTaken() { return false; },
  };
  const authClient = fakeAuthClient({
    async me() { return { id: 7, email: 'a@b.com', username: 'alice', roles: ['admin'], permissions: ['*'] }; },
  });
  const res = await request(makeApp({ authClient, profiles }))
    .get('/api/auth/me')
    .set('Authorization', 'Bearer t');
  assert.equal(res.status, 200);
  assert.equal(res.body.id, 'p1');
  assert.deepEqual(res.body.permissions, ['*']);
});

test('register calls auth register then login and creates a profile', async () => {
  const calls = [];
  const authClient = fakeAuthClient({
    async register(input) { calls.push(['register', input]); return { id: 7, email: 'a@b.com', username: 'alice' }; },
    async login() { calls.push(['login']); return { accessToken: 't', expiresIn: 86400, user: { id: 7, email: 'a@b.com', username: 'alice' } }; },
  });
  const profiles = {
    async ensureProfile() { calls.push(['ensureProfile']); return { id: 'p1', email: 'a@b.com', username: 'alice' }; },
    async isUsernameTaken() { return false; },
  };
  const res = await request(makeApp({ authClient, profiles }))
    .post('/api/auth/register').send({ email: 'a@b.com', password: 'Password1', username: 'alice', code: '123456' });
  assert.equal(res.status, 201);
  assert.deepEqual(calls.map((c) => c[0]), ['register', 'ensureProfile', 'login']);
});

test('profile conflict maps to 409 with a message', async () => {
  const { ProfileConflictError } = await import('../features/auth/authErrors.js');
  const profiles = {
    async ensureProfile() { throw new ProfileConflictError(); },
    async isUsernameTaken() { return false; },
  };
  const res = await request(makeApp({ authClient: fakeAuthClient(), profiles }))
    .post('/api/auth/login').send({ email: 'a@b.com', password: 'x' });
  assert.equal(res.status, 409);
  assert.match(res.body.message, /档案/);
});

test('register pre-checks local username before calling auth-service', async () => {
  const calls = [];
  const authClient = fakeAuthClient({
    async register() { calls.push('register'); return { id: 7, email: 'a@b.com', username: 'alice' }; },
  });
  const profiles = {
    async isUsernameTaken() { return true; },
    async ensureProfile() { throw new Error('should not be called'); },
  };
  const res = await request(makeApp({ authClient, profiles }))
    .post('/api/auth/register').send({ email: 'a@b.com', password: 'Password1', username: 'alice', code: '123456' });
  assert.equal(res.status, 409);
  assert.equal(calls.length, 0);
});
