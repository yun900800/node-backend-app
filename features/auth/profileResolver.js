// Pure decision table for mapping an auth-service user to a local profile.
// Kept side-effect free so the race/relink matrix is easy to unit test.

const sameId = (a, b) => Number(a) === Number(b);

/**
 * @param {{ authUser: { id: number, email: string, username?: string|null }, byAuthId: object|null, byEmail: object|null }} input
 * @returns {{ action: 'use'|'link'|'create'|'conflict', profile?: object, existingAuthUserId?: number }}
 */
export function resolveProfile({ authUser, byAuthId, byEmail }) {
  if (byAuthId) {
    return { action: 'use', profile: byAuthId };
  }

  if (byEmail) {
    if (byEmail.auth_user_id == null) {
      return { action: 'link', profile: byEmail };
    }
    if (sameId(byEmail.auth_user_id, authUser.id)) {
      return { action: 'use', profile: byEmail };
    }
    return { action: 'conflict', profile: byEmail, existingAuthUserId: byEmail.auth_user_id };
  }

  return { action: 'create' };
}
