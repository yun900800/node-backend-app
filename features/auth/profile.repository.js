// Local profile persistence. The auth-service owns credentials; this table is
// the book project's profile + the FK target for Client.owner_id. The profile
// id keeps the existing cuid style and is generated explicitly because raw SQL
// bypasses Prisma's defaults.

import { createId } from '@paralleldrive/cuid2';
import { ProfileConflictError } from './authErrors.js';
import { resolveProfile } from './profileResolver.js';

const COLUMNS = 'id, email, username, auth_user_id';
const SENTINEL_PASSWORD = '!remote-only';

/**
 * @param {{ db: object, newId?: () => string, now?: () => Date }} deps
 */
export function createProfileRepository({ db, newId = createId, now = () => new Date() }) {
  async function findByAuthUserId(authUserId) {
    return db.oneOrNone(
      `select ${COLUMNS} from "User" where auth_user_id = $1`,
      [authUserId]
    );
  }

  async function findByEmail(email) {
    return db.oneOrNone(
      `select ${COLUMNS} from "User" where lower(email) = lower($1)`,
      [email]
    );
  }

  async function isUsernameTaken(username) {
    if (username == null || String(username).trim() === '') return false;
    const row = await db.oneOrNone(
      'select 1 from "User" where lower(username) = lower($1) limit 1',
      [String(username).trim()]
    );
    return Boolean(row);
  }

  async function link(profile, authUserId) {
    const updated = await db.oneOrNone(
      `update "User"
       set auth_user_id = $1, "updatedAt" = $2
       where id = $3
       returning ${COLUMNS}`,
      [authUserId, now(), profile.id]
    );
    if (!updated) throw new ProfileConflictError();
    return updated;
  }

  async function create(authUser) {
    const at = now();
    return db.one(
      `insert into "User"
         (id, email, password, username, "createdAt", "updatedAt", auth_user_id)
       values ($1, $2, $3, $4, $5, $5, $6)
       returning ${COLUMNS}`,
      [
        newId(),
        String(authUser.email).trim().toLowerCase(),
        SENTINEL_PASSWORD,
        authUser.username ?? null,
        at,
        authUser.id,
      ]
    );
  }

  async function ensureProfile(authUser) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const byAuthId = await findByAuthUserId(authUser.id);
      if (byAuthId) return byAuthId;

      const byEmail = await findByEmail(authUser.email);
      const decision = resolveProfile({ authUser, byAuthId: null, byEmail });

      if (decision.action === 'use') return decision.profile;
      if (decision.action === 'link') return link(decision.profile, authUser.id);
      if (decision.action === 'conflict') {
        const err = new ProfileConflictError();
        err.existingAuthUserId = decision.existingAuthUserId;
        throw err;
      }

      try {
        return await create(authUser);
      } catch (err) {
        if (err?.code !== '23505' || attempt === 1) {
          if (err?.code === '23505') throw new ProfileConflictError();
          throw err;
        }
        // Another request won the insert race; re-read and re-decide.
      }
    }
    throw new ProfileConflictError();
  }

  return { ensureProfile, findByAuthUserId, findByEmail, isUsernameTaken };
}
