// Route guard with two providers:
// - local: verify the legacy book JWT ({ userId }) in-process
// - remote: validate the auth-service token via /api/introspect, then map the
//   auth user to the local profile row used by business tables.

import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ProfileConflictError } from '../features/auth/authErrors.js';

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const noToken = (res) => res.status(401).json({ message: 'Access denied. No token provided.' });
const badToken = (res) => res.status(401).json({ message: 'Invalid or expired token.' });
const authDown = (res) => res.status(503).json({ message: '认证服务暂时不可用，请稍后重试' });

function bearer(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

/**
 * @param {{ mode: 'local'|'remote', authClient?: object, profiles?: object, cache?: {get:Function,set:Function}, jwtSecret: string }} deps
 */
export function createProtect({ mode, authClient, profiles, cache, jwtSecret }) {
  if (mode !== 'remote') {
    return (req, res, next) => {
      const token = bearer(req);
      if (!token) return noToken(res);
      try {
        req.user = jwt.verify(token, jwtSecret);
        return next();
      } catch {
        return badToken(res);
      }
    };
  }

  return async (req, res, next) => {
    const token = bearer(req);
    if (!token) return noToken(res);

    const key = sha256(token);
    let result = cache?.get(key);

    if (result === undefined) {
      try {
        result = await authClient.introspect(token);
      } catch {
        return authDown(res);
      }
      cache?.set(key, result);
    }

    if (!result?.active || !result.user) return badToken(res);

    let profile;
    try {
      profile = await profiles.ensureProfile(result.user);
    } catch (err) {
      if (err instanceof ProfileConflictError) {
        return res.status(409).json({ message: err.message });
      }
      return next(err);
    }

    req.user = {
      userId: profile.id,
      authUserId: result.user.id,
      email: result.user.email ?? profile.email,
      username: result.user.username ?? profile.username,
      roles: result.roles ?? [],
      permissions: result.permissions ?? [],
    };
    return next();
  };
}

export default createProtect;
