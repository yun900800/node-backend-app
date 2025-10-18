import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// 判断是否在本地开发模式（或者您可以使用 NODE_ENV === 'development'）
const isLocalTesting = process.env.NODE_ENV !== 'production'; 

// 本地测试 Key Generator：对所有请求使用一个固定的 Key
// 这样可以确保在本地测试时，不会因为 IP 漂移导致限流失效
const localTestKeyGenerator = (req, res) => 'local_fixed_key';

// ----------------------------------------------------------------------
// 1. 严格限制：每小时最多 10 次 (用于防止短时间内的集中攻击)
// ----------------------------------------------------------------------
const hourlyLimiter = rateLimit({
    // windowMs: 时间窗口（毫秒）。 60 分钟 * 60 秒 * 1000 毫秒
    windowMs: 60 * 60 * 1000, 
    // max: 在 windowMs 时间窗口内，允许的最大请求数
    max: 10, 
    // message: 当达到限制时返回给客户端的消息 (状态码自动为 429)
    message: {
        message: '访问频率过高。请稍后重试。',
        details: '您每小时最多只能尝试注册 10 次。'
    },
    // standardHeaders: 返回标准速率限制头部（如 RateLimit-Limit, RateLimit-Remaining）
    standardHeaders: true, 
    // legacyHeaders: 禁用 X-RateLimit-* 头部（推荐，因其已过时）
    legacyHeaders: false,
    // keyGenerator: 使用请求的 IP 地址作为唯一标识符
    keyGenerator: isLocalTesting ? localTestKeyGenerator : ipKeyGenerator,
});

// ----------------------------------------------------------------------
// 2. 每日限制：24 小时内最多 20 次 (用于防止长期资源滥用)
// ----------------------------------------------------------------------
const dailyLimiter = rateLimit({
    // windowMs: 24 小时
    windowMs: 24 * 60 * 60 * 1000, 
    // max: 20 次
    max: 20, 
    message: {
        message: '注册尝试次数已达上限。',
        details: '您每天（24 小时内）最多只能尝试注册 20 次。'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: isLocalTesting ? localTestKeyGenerator : ipKeyGenerator,
});

/**
 * 组合速率限制中间件
 * 将更严格的限制（hourly）放在前面，然后是每日限制（daily）。
 */
export const rateLimitMiddleware = [
    // 每日限制（宽泛限制）
    dailyLimiter, 
    // 小时限制（严格限制）
    hourlyLimiter,
];