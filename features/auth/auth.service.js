import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
// 引入数据层的方法
import * as authRepository from './auth.repository.js'; 
import * as emailCodeService from './emailCode.service.js';
import { JWT_SECRET } from '../../config/index.js';

/**
 * 为用户签发 JWT Token（登录 / 验证码登录共用）
 */
const signToken = (user) => {
    const expiresIn = 3600; // 1小时
    const token = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: expiresIn }
    );
    return { token, expiresIn, user: { id: user.id, email: user.email } };
};

/**
 * 验证用户身份并返回 Token 信息。
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{token: string, expiresIn: number, user: object} | null>}
 */
export const authenticateUser = async (email, password) => {
    // 1. 查找用户
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
        return null;
    }

    // 2. 验证密码 (注意：user.password 是哈希过的密码)
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return null;
    }

    // 3. 生成 JWT Token（复用统一签发逻辑）
    return signToken(user);
};

/**
 * 邮箱验证码登录：校验验证码 → 查用户 → 签发 Token
 * @returns {Promise<{token, expiresIn, user} | null>} 用户不存在时返回 null
 */
export const authenticateUserByEmailCode = async ({ email, code }) => {
    // 1. 校验验证码（login 用途）
    await emailCodeService.verifyVerificationCode({ email, purpose: 'login', code });
    const latest = await authRepository.findLatestVerificationCode(email.toLowerCase(), 'login');

    // 2. 查找用户
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
        // 邮箱从未注册：作废验证码防止被试撞，让 Controller 提示去注册
        if (latest) {
            await emailCodeService.consumeVerifiedCode(latest.id);
        }
        return null;
    }

    // 3. 消费验证码（一次性）
    await emailCodeService.consumeVerifiedCode(latest.id);

    // 4. 签发 Token
    return signToken(user);
};

/**
 * 注册新用户（强制邮箱验证码）。
 * @param {string} email 
 * @param {string} password 
 * @param {string} username 
 * @param {string} code 邮箱验证码（purpose='register'，必需）
 * @returns {Promise<{token, expiresIn, user} | null>}
 *          null 表示邮箱已注册（Controller 处理 409）
 * @throws 验证码无效时抛出（带 status）
 */
export const registerUser = async (email, password, username, code) => {
    // 1. 先校验验证码（register 用途）——对已注册邮箱同样先验证，防止漏洞探测
    const verified = await emailCodeService.verifyVerificationCode({
        email,
        purpose: 'register',
        code,
    });
    const latest = await authRepository.findLatestVerificationCode(email.toLowerCase(), 'register');

    // 2. 检查用户是否已存在 (业务验证)
    const existingUser = await authRepository.findUserByEmail(email);
    if (existingUser) {
        // 作废该验证码，避免同一码被重复使用试探
        if (latest) {
            await emailCodeService.consumeVerifiedCode(latest.id);
        }
        return null; // 返回 null，让 Controller 处理 409 冲突
    }

    // 3. 消费验证码（一次性）
    await emailCodeService.consumeVerifiedCode(verified.id);

    // 4. 密码哈希
    const salt = await bcrypt.genSalt(10); 
    const passwordHash = await bcrypt.hash(password, salt);

    // 5. 创建用户 (调用数据层)
    const newUser = await authRepository.createUser({
        email,
        // 将哈希后的密码传给数据层
        password: passwordHash, 
        username
    });

    // 6. 注册成功后直接签发 Token（前端免二次登录）
    return signToken(newUser);
};