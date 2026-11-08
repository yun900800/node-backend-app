#!/usr/bin/env node
// Safely relink one local profile to an auth-service user.
// Usage:
//   node script/relink-auth-user.mjs --email user@example.com --auth-user-id 12 [--apply]
//
// Required env: BOOK_DB_URL (or POSTGRES_URL_NON_POOLING) and AUTH_DB_URL.

import pg from 'pg';

const { Client } = pg;
const args = process.argv.slice(2);
const valueOf = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const email = valueOf('--email');
const authUserId = Number.parseInt(valueOf('--auth-user-id'), 10);
const apply = args.includes('--apply');

const bookUrl = process.env.BOOK_DB_URL || process.env.POSTGRES_URL_NON_POOLING;
const authUrl = process.env.AUTH_DB_URL;

if (!bookUrl || !authUrl || !email || !Number.isInteger(authUserId)) {
  console.error('relink-auth-user: BOOK_DB_URL, AUTH_DB_URL, --email and --auth-user-id are required');
  process.exit(1);
}

function makeClient(url, { ssl = false } = {}) {
  const parsed = new URL(url);
  parsed.searchParams.delete('sslmode');
  const local = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  return new Client({
    connectionString: parsed.toString(),
    ssl: ssl && !local ? { rejectUnauthorized: false } : undefined,
  });
}

const book = makeClient(bookUrl, { ssl: true });
const auth = makeClient(authUrl);

async function main() {
  await book.connect();
  await auth.connect();

  const authUser = (await auth.query('select id, email from users where id = $1', [authUserId])).rows[0];
  if (!authUser) throw new Error(`auth user ${authUserId} does not exist`);

  const local = (await book.query(
    'select id, email, auth_user_id from "User" where lower(email) = lower($1)',
    [email]
  )).rows[0];
  if (!local) throw new Error(`local profile ${email} does not exist`);

  const occupant = (await book.query(
    'select id, email from "User" where auth_user_id = $1',
    [authUserId]
  )).rows[0];
  if (occupant && occupant.id !== local.id) {
    throw new Error(`auth user ${authUserId} is already linked to local profile ${occupant.id}`);
  }

  console.log(`[relink] ${local.id} (${local.email}) -> auth user ${authUser.id} (${authUser.email}) mode=${apply ? 'APPLY' : 'DRY-RUN'}`);
  if (!apply) return;

  await book.query(
    'update "User" set auth_user_id = $1, "updatedAt" = now() where id = $2',
    [authUserId, local.id]
  );
  console.log('[relink] applied');
}

main()
  .catch((err) => {
    console.error('relink-auth-user failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await book.end().catch(() => {});
    await auth.end().catch(() => {});
  });
