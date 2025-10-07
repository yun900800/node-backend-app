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

// 你可以在这里添加其他数据库操作，如 findUserById, updateUserPassword 等。