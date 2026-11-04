// 邮箱验证码：生成 / 发送 / 校验
// 安防：bcrypt 存哈希、10 分钟有效期、一次性消费、最多错 5 次、同邮箱 60s 冷却、1 小时最多 5 封
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import * as authRepository from './auth.repository.js';
import { sendVerificationCodeEmail } from './mailer.js';

const CODE_TTL_MINUTES = 10;      // 验证码有效期
const SEND_COOLDOWN_SECONDS = 60; // 同邮箱发送冷却
const HOURLY_SEND_LIMIT = 5;      // 每小时最多发送次数
const MAX_VERIFY_ATTEMPTS = 5;    // 最多验证失败次数

const generateSixDigitCode = () => String(crypto.randomInt(100000, 1000000));
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
const isValidPurpose = (purpose) => purpose === 'register' || purpose === 'login';

/**
 * 发送验证码邮件
 * @returns {Promise<{ resent: boolean }>}
 */
export const requestVerificationCode = async ({ email, purpose }) => {
  if (!isValidEmail(email)) {
    throw Object.assign(new Error('邮箱格式不正确'), { status: 400 });
  }
  if (!isValidPurpose(purpose)) {
    throw Object.assign(new Error('无效的验证码用途'), { status: 400 });
  }

  // 0) 注册用途：邮箱已注册则直接提示去登录（避免用户白等邮件）
  if (purpose === 'register') {
    const existingUser = await authRepository.findUserByEmail(email);
    if (existingUser) {
      throw Object.assign(new Error('该邮箱已注册，请直接登录'), { status: 409 });
    }
  }

  // 1) 同邮箱冷却检查（60 秒内只发一封）
  const latest = await authRepository.findLatestVerificationCode(email, purpose);
  if (latest) {
    const elapsed = (Date.now() - new Date(latest.created_at).getTime()) / 1000;
    if (elapsed < SEND_COOLDOWN_SECONDS) {
      throw Object.assign(
        new Error(`发送太频繁，请 ${Math.ceil(SEND_COOLDOWN_SECONDS - elapsed)} 秒后再试`),
        { status: 429 }
      );
    }
  }

  // 2) 小时级发送上限
  const { count } = await authRepository.countRecentCodes(email, 60);
  if (count >= HOURLY_SEND_LIMIT) {
    throw Object.assign(new Error('该邮箱验证码发送过于频繁，请 1 小时后再试'), { status: 429 });
  }

  // 3) 生成 + 哈希 + 入库
  const code = generateSixDigitCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await authRepository.insertVerificationCode({
    email: email.toLowerCase(),
    code_hash: codeHash,
    purpose,
    expires_at: expiresAt,
  });

  // 4) 发邮件（失败则抛错，让上层返回 500）
  try {
    await sendVerificationCodeEmail({ to: email, code, purpose, minutes: CODE_TTL_MINUTES });
  } catch (err) {
    console.error('[emailCode] 发送邮件失败:', err.message);
    throw Object.assign(new Error('邮件发送失败，请稍后重试'), { status: 502 });
  }

  return { resent: Boolean(latest) };
};

/**
 * 校验验证码（不消费，消费由调用方决定）
 * @returns {Promise<{ id: string }>} 校验成功返回记录 id
 */
export const verifyVerificationCode = async ({ email, purpose, code }) => {
  const normalized = String(code || '').trim();

  if (!isValidEmail(email) || !isValidPurpose(purpose)) {
    throw Object.assign(new Error('无效的验证参数'), { status: 400 });
  }
  if (!/^\d{6}$/.test(normalized)) {
    throw Object.assign(new Error('验证码不正确'), { status: 401 });
  }

  const record = await authRepository.findLatestVerificationCode(email.toLowerCase(), purpose);

  if (!record) {
    throw Object.assign(new Error('验证码无效或已过期，请重新获取'), { status: 401 });
  }
  if (record.consumed_at) {
    throw Object.assign(new Error('验证码已被使用，请重新获取'), { status: 401 });
  }
  if (new Date(record.expires_at).getTime() < Date.now()) {
    throw Object.assign(new Error('验证码已过期，请重新获取'), { status: 401 });
  }
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw Object.assign(new Error('尝试次数过多，验证码已失效，请重新获取'), { status: 401 });
  }

  const isMatch = await bcrypt.compare(normalized, record.code_hash);
  if (!isMatch) {
    await authRepository.incrementCodeAttempts(record.id);
    throw Object.assign(new Error('验证码不正确'), { status: 401 });
  }

  return { id: record.id };
};

/**
 * 校验并消费验证码（注册成功 / 登录成功后调用）
 */
export const consumeVerifiedCode = async (codeId) => {
  await authRepository.consumeVerificationCode(codeId);
};
