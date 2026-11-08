// BFF auth routes when AUTH_PROVIDER=remote. Keeps the book frontend's
// existing /api/auth contract while auth-service owns credentials and codes.

import express from 'express';
import { AuthServiceError, ProfileConflictError } from './authErrors.js';
import { registerSchema } from './schemas/register.schema.js';
import { requestCodeSchema, loginByCodeSchema } from './schemas/emailCode.schema.js';
import { validationMiddleware } from '../../middleware/validationMiddleware.js';
import { honeypotMiddleware } from '../../middleware/honeypot.middleware.js';
import { rateLimitMiddleware, emailCodeLimiter } from '../../middleware/rateLimit.middleware.js';

const bearer = (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
};

export function createRemoteAuthRouter({ authClient, profiles, logger = console }) {
  const router = express.Router();

  async function ensureProfile(authUser) {
    try {
      return await profiles.ensureProfile(authUser);
    } catch (err) {
      if (err instanceof ProfileConflictError) {
        logger.warn('[auth] profile conflict', {
          email: authUser?.email,
          authUserId: authUser?.id,
          existingAuthUserId: err.existingAuthUserId,
        });
      }
      throw err;
    }
  }

  const profileUser = (profile) => ({
    id: profile.id,
    email: profile.email,
    username: profile.username,
  });

  router.post('/login', async (req, res, next) => {
    try {
      const out = await authClient.login(req.body?.email, req.body?.password);
      const profile = await ensureProfile(out.user);
      res.status(200).json({
        message: 'Login successful',
        token: out.accessToken,
        expiresIn: out.expiresIn,
        user: profileUser(profile),
      });
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/register',
    validationMiddleware(registerSchema, 'body'),
    honeypotMiddleware,
    ...rateLimitMiddleware,
    async (req, res, next) => {
      try {
        const { email, password, username, code } = req.body;
        if (username && await profiles.isUsernameTaken(username)) {
          res.status(409).json({ message: '用户名已被占用' });
          return;
        }

        const created = await authClient.register({ email, password, username, code });
        const profile = await ensureProfile(created);
        const login = await authClient.login(email, password);
        res.status(201).json({
          message: 'Login successful',
          token: login.accessToken,
          expiresIn: login.expiresIn,
          user: profileUser(profile),
        });
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    '/email/request-code',
    validationMiddleware(requestCodeSchema, 'body'),
    emailCodeLimiter,
    async (req, res, next) => {
      try {
        const out = await authClient.requestCode(req.body?.email, req.body?.purpose);
        res.status(200).json({
          message: out?.message || '验证码已发送，请查收邮件',
          cooldown: out?.cooldown ?? 60,
        });
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    '/login/code',
    validationMiddleware(loginByCodeSchema, 'body'),
    async (req, res, next) => {
      try {
        const out = await authClient.loginByCode(req.body?.email, req.body?.code);
        const profile = await ensureProfile(out.user);
        res.status(200).json({
          message: 'Login successful',
          token: out.accessToken,
          expiresIn: out.expiresIn,
          user: profileUser(profile),
        });
      } catch (err) {
        next(err);
      }
    }
  );

  router.post('/logout', (_req, res) => {
    res.status(204).end();
  });

  router.get('/me', async (req, res, next) => {
    try {
      const token = bearer(req);
      if (!token) {
        res.status(401).json({ message: '未登录' });
        return;
      }
      const authUser = await authClient.me(token);
      const profile = await ensureProfile(authUser);
      res.status(200).json({
        id: profile.id,
        email: authUser.email,
        username: authUser.username,
        roles: authUser.roles ?? [],
        permissions: authUser.permissions ?? [],
      });
    } catch (err) {
      next(err);
    }
  });

  // eslint-disable-next-line no-unused-vars
  router.use((err, req, res, _next) => {
    if (err instanceof ProfileConflictError) {
      res.status(409).json({ message: err.message });
      return;
    }
    if (err instanceof AuthServiceError) {
      res.status(mapStatus(err.status)).json({ message: mapMessage(err.status, req.path) });
      return;
    }
    if (err?.status && err.status < 500) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    logger.error('[auth] remote auth route failed', err);
    res.status(500).json({ message: '服务器内部错误' });
  });

  return router;
}

function mapStatus(status) {
  if (status === 401 || status === 409 || status === 429) return status;
  if (status === 502) return 502;
  return 503;
}

function mapMessage(status, path) {
  if (status === 401) {
    if (path === '/login') return '邮箱或密码错误';
    if (path === '/login/code') return '验证码不正确';
    return '登录已失效，请重新登录';
  }
  if (status === 409) return '该邮箱已注册，请直接登录';
  if (status === 429) return '发送太频繁，请稍后再试';
  if (status === 502) return '邮件发送失败，请稍后重试';
  return '认证服务暂时不可用，请稍后重试';
}
