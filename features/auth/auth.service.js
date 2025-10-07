import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
// 引入数据层的方法
import * as authRepository from './auth.repository.js'; 
import { JWT_SECRET } from '../../config/index.js';

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

    // 3. 生成 JWT Token
    const expiresIn = 3600; // 1小时
    const token = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: expiresIn }
    );

    // 4. 返回认证结果
    return {
        token,
        expiresIn,
        user: { id: user.id, email: user.email }
    };
};

/**
 * 注册新用户。
 * @param {string} email 
 * @param {string} password 
 * @param {string} username 
 * @returns {Promise<object | null>} 返回新用户数据或 null (如果用户已存在)
 */
export const registerUser = async (email, password, username) => {
    // 1. 检查用户是否已存在 (业务验证)
    const existingUser = await authRepository.findUserByEmail(email);
    if (existingUser) {
        return null; // 返回 null，让 Controller 处理 409 冲突
    }

    // 2. 密码哈希
    const salt = await bcrypt.genSalt(10); 
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. 创建用户 (调用数据层)
    const newUser = await authRepository.createUser({
        email,
        // 将哈希后的密码传给数据层
        password: passwordHash, 
        username
    });

    return newUser;
};