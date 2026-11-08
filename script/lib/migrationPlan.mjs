// Pure migration planner: local book users -> auth-service users.
// No DB access so the conflict matrix is unit-testable and dry-run output is
// identical to what --apply will execute.

const normEmail = (email) => String(email || '').trim().toLowerCase();
const normUsername = (username) => {
  if (username == null) return null;
  const value = String(username).trim();
  return value === '' ? null : value;
};

function earliest(users) {
  return users
    .map((u, index) => {
      const raw = u.createdAt ?? u.created_at;
      const ts = raw == null ? Number.POSITIVE_INFINITY : new Date(raw).getTime();
      return { u, index, ts };
    })
    .sort((a, b) => (a.ts - b.ts) || (a.index - b.index))[0].u;
}

/**
 * @param {{ localUsers: Array, authUsers: Array }} input
 * @returns {{ inserts: Array, links: Array, conflicts: Array, warnings: Array, skipped: Array }}
 */
export function buildMigrationPlan({ localUsers = [], authUsers = [] } = {}) {
  const inserts = [];
  const links = [];
  const conflicts = [];
  const warnings = [];
  const skipped = [];

  const authByEmail = new Map();
  const usedUsernames = new Set();
  for (const user of authUsers) {
    const email = normEmail(user.email);
    if (!authByEmail.has(email)) authByEmail.set(email, user);
    const username = normUsername(user.username);
    if (username) usedUsernames.add(username.toLowerCase());
  }

  const groups = new Map();
  for (const user of localUsers) {
    const email = normEmail(user.email);
    if (!groups.has(email)) groups.set(email, []);
    groups.get(email).push(user);
  }

  for (const [email, group] of groups) {
    const keeper = earliest(group);
    for (const duplicate of group) {
      if (duplicate !== keeper) {
        conflicts.push({
          reason: 'duplicate-local-email',
          localId: duplicate.id,
          email,
          keptLocalId: keeper.id,
        });
      }
    }

    const authUser = authByEmail.get(email) ?? null;
    const localAuthId = keeper.auth_user_id;

    if (localAuthId != null) {
      if (authUser && Number(authUser.id) === Number(localAuthId)) {
        skipped.push({ localId: keeper.id, authId: localAuthId, email, reason: 'already-linked' });
      } else {
        conflicts.push({
          reason: 'local-already-linked',
          localId: keeper.id,
          email,
          localAuthId,
          authId: authUser?.id ?? null,
        });
      }
      continue;
    }

    if (authUser) {
      const authPassword = authUser.password_hash ?? authUser.password;
      const passwordMismatch = authPassword != null
        && keeper.password != null
        && String(authPassword) !== String(keeper.password);
      links.push({
        localId: keeper.id,
        authId: authUser.id,
        email,
        passwordMismatch,
      });
      if (passwordMismatch) {
        warnings.push({
          reason: 'password-mismatch',
          localId: keeper.id,
          authId: authUser.id,
          email,
        });
      }
      continue;
    }

    let username = normUsername(keeper.username);
    if (username && usedUsernames.has(username.toLowerCase())) {
      conflicts.push({
        reason: 'duplicate-username',
        localId: keeper.id,
        email,
        username,
      });
      username = null;
    }
    if (username) usedUsernames.add(username.toLowerCase());

    inserts.push({
      localId: keeper.id,
      email,
      password: keeper.password,
      username,
    });
  }

  return { inserts, links, conflicts, warnings, skipped };
}
