// client.repository.js

import { postgres as db, pgp } from '../../shared/db/index.js';

// --- 辅助函数：创建客户端 ---
const createClientRecord = async ({ name, secret, redirectUris, grants, ownerId }) => {
    // SQL 语句：使用 RETURNING * 返回新创建的记录
    const sql = `
        INSERT INTO "Client" (name, secret, "redirectUris", grants, "owner_id")
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;
    
    // 注意：pg-promise 会自动将 $5 的 Int 值正确处理。
    // $3 和 $4 假设在数据库中是 TEXT 类型
    return db.one(sql, [name, secret, redirectUris, grants, ownerId]);
};

// --- 分页查询 ---
async function getClientsByPage(page, pageSize, userId) {
    console.log('Fetching clients for userId:', userId, 'page:', page, 'pageSize:', pageSize);
    const pageInt = parseInt(page, 10) || 1;
    const pageSizeInt = parseInt(pageSize, 10) || 10;
    const offset = (pageInt - 1) * pageSizeInt;
    console.log('Calculated offset:', offset, 'pageSizeInt:', pageSizeInt, 'pageInt:', pageInt);

    // 1. 定义 SQL 的 WHERE 条件和参数对象
    //    这里假设 Client 表中有一个字段名为 'createdByUserId' 来关联用户
    let whereCondition = '';
    const queryParams = { pageSizeInt, offset };

    // 只有当 userId 存在时，才添加 WHERE 条件
    if (userId) {
        whereCondition = 'WHERE "owner_id" = $<userId>';
        queryParams.userId = userId;
    }

    try {
        // 1. 查询总数 (COUNT)
        //    * 关键：在 COUNT 查询中应用 WHERE 条件
        const totalCount = await db.one(`
            SELECT count(*)
            FROM "Client"
            ${whereCondition}
        `, queryParams, c => +c.count);

        // 2. 查询分页数据 (SELECT)
        //    * 关键：在 SELECT 查询中应用 WHERE 条件
        const clients = await db.manyOrNone(`
            SELECT *
            FROM "Client"
            ${whereCondition}
            ORDER BY id DESC  -- 最好用 DESC 排序，新的记录靠前
            LIMIT $<pageSizeInt> OFFSET $<offset>
        `, queryParams);

        const totalPages = Math.ceil(totalCount / pageSizeInt);

        return {
            clients,
            totalCount,
            totalPages,
            currentPage: pageInt,
        };
    } catch (error) {
        // pg-promise 在没有记录时不会抛出错误，但如果 SQL 错误仍会抛出
        console.error('Error fetching paginated clients:', error);
        throw error;
    }
}

// --- 删除客户端 ---
const deleteClientById = async (clientId) => {
    // 使用 .result 来获取操作状态，返回删除的行数
    const result = await db.result('DELETE FROM "Client" WHERE id = $1', [clientId]);
    return result.rowCount; // 返回删除的行数 (0 或 1)
};

// --- 更新客户端 ---
const updateClientById = async (clientId, updateData) => {
    // 检查是否有数据需要更新
    if (!updateData || Object.keys(updateData).length === 0) {
        // 没有数据更新，直接返回当前客户端信息
        return db.oneOrNone('SELECT * FROM "Client" WHERE id = $1', [clientId]);
    }

    // 1. 定义 ColumnSet，仅包含允许更新的字段
    const cs = new pgp.helpers.ColumnSet(['name', 'redirectUris', 'grants'], { table: 'Client' });
    
    // 2. 使用 pgp.helpers.update 生成完整的 UPDATE 语句（不含 WHERE 和 RETURNING）
    // 这是生成动态 SET 子句的标准和稳定方法，可以避免 pgp.helpers.set 的潜在类型错误。
    const updateQuery = pgp.helpers.update(updateData, cs, 'Client');

    // 3. 构造最终的 SQL 语句，使用 pgp.as.format 准备参数。
    // pgp.as.format 会将 updateData 和 clientId 合并到参数对象中，
    // 确保所有变量都被安全地转义和插入。
    const sql = pgp.as.format(`${updateQuery}
        WHERE id = $<clientId>
        RETURNING *`, {
        ...updateData,
        clientId: clientId // 将 clientId 加入参数对象供 WHERE 子句使用
    });
    
    // 使用 .oneOrNone 执行更新并返回记录
    const updatedClient = await db.oneOrNone(sql);
    return updatedClient;
};


export {
    getClientsByPage,
    deleteClientById,
    updateClientById,
    createClientRecord
}