// db.js (确保 package.json 中设置了 "type": "module")

import pgPromise from 'pg-promise';
// 导入配置，注意：如果你的配置文件是 CommonJS 格式，
// 可能需要将其也转换为 ES Module 格式，或者使用动态 import
import { remoteVercelPoolConfig } from '../../config/db.config.js'; // 注意添加 .js 扩展名


// 定义 pg-promise 的初始化选项（用于配置全局事件，如日志）
const initOptions = {
    // query 事件钩子：用于打印 SQL 查询和性能数据
    // 如果需要查看日志，打开下面的注释即可
    query: (e) => {
        console.log('SQL Query:', e.query);
        if (e.params) {
            console.log('Query Params:', e.params);
        }
        if (e.duration !== undefined) {
            console.log('Duration:', e.duration);
        }
    },
};

export const pgp = pgPromise(initOptions);

// --- PostgreSQL 连接池设置 ---

// 将连接池配置独立出来，便于管理和阅读
const pgPoolConfig = {
    max: 10,                 // 最大连接数
    idleTimeoutMillis: 30000, // 连接在池中闲置的最长时间
    connectionTimeoutMillis: 20000 // 尝试建立连接时的超时时间
};

// 合并数据库连接信息和连接池配置
export const postgres = pgp({
  ...remoteVercelPoolConfig, // host, port, user, password, database 等
  ...pgPoolConfig          
});
