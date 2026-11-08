import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createAuthServiceClient } from '../features/auth/authServiceClient.js';

function startStub(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

test('login posts JSON and maps the response', async () => {
  const { server, url } = await startStub((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      assert.equal(req.url, '/api/auth/login');
      assert.deepEqual(JSON.parse(body), { email: 'a@b.com', password: 'x' });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ accessToken: 't', expiresIn: 86400, user: { id: 1, email: 'a@b.com', username: 'alice' } }));
    });
  });
  const client = createAuthServiceClient({ baseUrl: url, serviceToken: 's' });
  const out = await client.login('a@b.com', 'x');
  assert.equal(out.accessToken, 't');
  server.close();
});

test('introspect sends the service token and maps inactive', async () => {
  const { server, url } = await startStub((req, res) => {
    assert.equal(req.headers['x-service-token'], 's');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ active: false }));
  });
  const client = createAuthServiceClient({ baseUrl: url, serviceToken: 's' });
  assert.deepEqual(await client.introspect('bad'), { active: false });
  server.close();
});

test('network/timeout failures become 503', async () => {
  const client = createAuthServiceClient({ baseUrl: 'http://127.0.0.1:1', serviceToken: 's', timeoutMs: 100 });
  await assert.rejects(() => client.login('a@b.com', 'x'), (err) => err.status === 503);
});
