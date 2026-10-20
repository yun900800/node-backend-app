// 判断一个错误是否表示“数据库暂时不可用”
// 用途：
//   1. 统一错误处理里把 500 降级为 503
//   2. 避免把可恢复的连接问题当成程序 bug

// Node.js / libuv 层的网络错误码
const NETWORK_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE',
  'ESSLREQUIRED',
]);

// PostgreSQL SQLSTATE：
//   08xxx 连接异常（08001/08003/08004/08006/08007）
//   53xxx 资源不足（53100 磁盘满 / 53200 内存不足 / 53300 连接数满）
//   57P01 管理员关闭数据库、57P03 数据库正在启动无法连接
const PG_UNAVAILABLE_PREFIXES = ['08', '53', '57P0'];

const TIMEOUT_HINTS = [
  'timeout',
  'connection terminated',
  'server closed the connection',
];

/**
 * @param {unknown} err
 * @returns {boolean} true 表示属于“暂时不可用”，应以 503 返回
 */
export const isDbUnavailable = (err) => {
  if (!err) return false;

  const code = String(err.code || '');
  if (NETWORK_CODES.has(code)) return true;
  if (PG_UNAVAILABLE_PREFIXES.some((prefix) => code.startsWith(prefix))) return true;

  const message = String(err.message || '').toLowerCase();
  return TIMEOUT_HINTS.some((hint) => message.includes(hint));
};

/**
 * CORS 白名单拒绝（config/cors.config.js 里抛出的错误）
 * @param {unknown} err
 * @returns {boolean}
 */
export const isCorsRejection = (err) =>
  Boolean(err && typeof err.message === 'string' && err.message.startsWith('Not allowed by CORS'));
