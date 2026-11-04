// 导入你的 Prisma 客户端实例
// import { prisma } from '../../shared/prisma/index.js'; // 假设你的 prisma 实例文件路径是 ../../db/prisma.js

import { postgres as db, pgp } from '../../shared/db/index.js';
/**
 * 根据邮箱查找用户记录。
 * @param {string} email 用户的邮箱
 * @returns {Promise<User | null>} 返回用户对象或 null
 */
export const findUserByEmail = (email) => {
    // return prisma.user.findUnique({
    //     where: { email },
    //     // 确保你查询了密码哈希，因为 Service 层需要它来验证！
    //     // 如果你的User模型中没有passwordHash，请使用password
    //     select: {
    //         id: true,
    //         email: true,
    //         password: true, // 假设这就是存储哈希密码的字段
    //         username: true,
    //         createdAt: true,
    //         // ...其他需要的字段
    //     }
    // });
    const sql = `
        SELECT 
            id, email, password, username, "createdAt"
        FROM 
            "User" 
        WHERE 
            email = $1
    `;

    // db.oneOrNone(sql, [email]):
    // - oneOrNone 期待返回 0 或 1 条记录。
    // - $1 会安全地替换为 email 变量。
    return db.oneOrNone(sql, [email]);
};

/**
 * 在数据库中创建新用户记录。
 * @param {object} userData - 包含 email, password (hashed) 和 username 的对象
 * @returns {Promise<User>} 返回新创建的用户对象
 */
export const createUser = (userData) => {
    // 这里的 userData 应该包含已经哈希好的密码
    const table = new pgp.helpers.TableName({ table: 'User' });
    
    // 1. 构建 INSERT 语句。
    // userData 应该包含 email, password, username 等字段
    const insertSql = pgp.helpers.insert(userData, null, table); 

    // 2. 添加 RETURNING 子句以获取新创建的记录
    const sql = `
        ${insertSql} 
        RETURNING id, email, username, "createdAt"
    `;
    
    // db.one() 期待返回 1 条记录（即新创建的记录）。
    return db.one(sql);
};

// 你可以在这里添加其他数据库操作，如 findUserById, updateUserPassword 等

/* --------------------------------------------------------------------
 * 邮箱验证码（EmailVerificationCode）
 * -------------------------------------------------------------------- */

/**
 * 插入一条验证码记录（code_hash 是 bcrypt 后的哈希）
 */
export const insertVerificationCode = ({ email, code_hash, purpose, expires_at }) => {
    const sql = `
        INSERT INTO "EmailVerificationCode" (email, code_hash, purpose, expires_at)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, purpose, expires_at, created_at
    `;
    return db.one(sql, [email, code_hash, purpose, expires_at]);
};

/**
 * 查询某邮箱某用途的最新一条验证码记录
 */
export const findLatestVerificationCode = (email, purpose) => {
    const sql = `
        SELECT id, email, code_hash, purpose, expires_at, consumed_at, attempts, created_at
        FROM "EmailVerificationCode"
        WHERE email = $1 AND purpose = $2
        ORDER BY created_at DESC
        LIMIT 1
    `;
    return db.oneOrNone(sql, [email, purpose]);
};

/**
 * 最近一段时间内该邮箱的发送次数（用于频率上限）
 */
export const countRecentCodes = (email, windowMinutes) => {
    const sql = `
        SELECT COUNT(*)::int AS count
        FROM "EmailVerificationCode"
        WHERE email = $1 AND created_at > now() - ($2 || ' minutes')::interval
    `;
    return db.one(sql, [email, windowMinutes]);
};

/**
 * 验证失败时累加尝试次数
 */
export const incrementCodeAttempts = (id) => {
    const sql = `
        UPDATE "EmailVerificationCode"
        SET attempts = attempts + 1
        WHERE id = $1
    `;
    return db.none(sql, [id]);
};

/**
 * 验证成功后消费（作废）该验证码
 */
export const consumeVerificationCode = (id) => {
    const sql = `
        UPDATE "EmailVerificationCode"
        SET consumed_at = now()
        WHERE id = $1
    `;
    return db.none(sql, [id]);
};

/**
 * 清理已过期超过 1 天的记录（顺带垃圾回收）
 */
export const purgeExpiredCodes = () => {
    const sql = `
        DELETE FROM "EmailVerificationCode"
        WHERE expires_at < now() - interval '1 day'
    `;
    return db.result(sql);
};