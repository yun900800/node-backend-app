#!/usr/bin/env node
// Backfill auth-service users from the book DB and link local profiles.
// Default is a dry run; pass --apply to write.
//
// Required env:
//   BOOK_DB_URL (or POSTGRES_URL_NON_POOLING)
//   AUTH_DB_URL
//
// Run after script/2026-11-08-add-auth-user-id.sql has been applied to the
// book database.

import fs from 'node:fs';
import pg from 'pg';
import { buildMigrationPlan } from './lib/migrationPlan.mjs';

const { Client } = pg;
const bookUrl = process.env.BOOK_DB_URL || process.env.POSTGRES_URL_NON_POOLING;
const authUrl = process.env.AUTH_DB_URL;
const apply = process.argv.includes('--apply');

if (!bookUrl || !authUrl) {
  console.error('migrate-auth-users: BOOK_DB_URL and AUTH_DB_URL are required');
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

  const { rows: localUsers } = await book.query(
    `select id, email, password, username, auth_user_id, "createdAt"
     from "User"
     order by "createdAt" asc nulls last, id asc`
  );
  const { rows: authUsers } = await auth.query(
    'select id, email, username, password_hash from users order by id'
  );

  const plan = buildMigrationPlan({ localUsers, authUsers });

  console.log(`[migrate] local=${localUsers.length} auth=${authUsers.length} mode=${apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`[migrate] inserts=${plan.inserts.length} links=${plan.links.length} conflicts=${plan.conflicts.length} warnings=${plan.warnings.length} skipped=${plan.skipped.length}`);
  for (const c of plan.conflicts) console.log('[conflict]', JSON.stringify(c));
  for (const w of plan.warnings) console.log('[warning]', JSON.stringify(w));

  const insertedLinks = [];
  if (apply) {
    for (const item of plan.inserts) {
      const inserted = await auth.query(
        `insert into users (email, password_hash, username, token_version)
         values ($1, $2, $3, 1)
         on conflict (email) do nothing
         returning id`,
        [item.email, item.password, item.username]
      );
      let authId = inserted.rows[0]?.id;
      if (!authId) {
        const existing = await auth.query('select id from users where email = $1', [item.email]);
        authId = existing.rows[0]?.id;
      }
      if (authId) {
        await book.query(
          'update "User" set auth_user_id = $1, "updatedAt" = now() where id = $2',
          [authId, item.localId]
        );
        insertedLinks.push({ localId: item.localId, authId, email: item.email });
      }
    }

    for (const link of plan.links) {
      await book.query(
        'update "User" set auth_user_id = $1, "updatedAt" = now() where id = $2',
        [link.authId, link.localId]
      );
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = `migration-report-${stamp}.json`;
  fs.writeFileSync(
    reportPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), apply, plan, insertedLinks }, null, 2)
  );
  console.log(`[migrate] report written to ${reportPath}`);
}

main()
  .catch((err) => {
    console.error('migrate-auth-users failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await book.end().catch(() => {});
    await auth.end().catch(() => {});
  });
