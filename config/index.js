// src/config/index.js

import dotenv from 'dotenv';

dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SUPER_SECRET_KEY';
// 可以添加其他配置，例如 PORT, DATABASE_URL 等

/* ----------------------------------
 * SMTP 邮件服务配置（端口 587 + STARTTLS / 端口 465 为 SSL）
 * ---------------------------------- */
export const SMTP_HOST = process.env.SMTP_HOST || '';
export const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
// 465 端口填 true（SSL/隐式TLS），587 端口填 false（STARTTLS）
export const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false') === 'true';
export const SMTP_USER = process.env.SMTP_USER || '';
export const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
export const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME || '书评集';
// 离线调试模式：true 时不真实发信，验证码直接打印到控制台（本地开发网络被拦截时使用）
export const SMTP_OFFLINE = String(process.env.SMTP_OFFLINE || 'false') === 'true';

/* ----------------------------------
 * 统一认证（auth-service）配置
 * AUTH_PROVIDER=local 时完全沿用旧的本地密码/JWT 逻辑；
 * =remote 时路由代理到 auth-service，业务路由用 introspect 校验 token。
 * ---------------------------------- */
export const AUTH_PROVIDER = process.env.AUTH_PROVIDER || 'local';
export const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || '';
export const AUTH_SERVICE_TOKEN = process.env.AUTH_SERVICE_TOKEN || '';
export const AUTH_TIMEOUT_MS = Number.parseInt(process.env.AUTH_TIMEOUT_MS, 10) || 5000;
export const AUTH_CACHE_TTL_MS = Number.parseInt(process.env.AUTH_CACHE_TTL_MS, 10) || 30000;