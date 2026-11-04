-- --------------------------------------------------------------------
-- 邮箱验证码表（一次性、短时效）
-- 用途：邮箱验证码注册 / 验证码登录
-- 幂等：可重复执行（IF NOT EXISTS）
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "EmailVerificationCode" (
    id          SERIAL PRIMARY KEY,
    email       TEXT NOT NULL,
    code_hash   TEXT NOT NULL,            -- 6 位验证码做 bcrypt 哈希，明文只出现在邮件里
    purpose     TEXT NOT NULL,            -- 'register' | 'login'
    expires_at  TIMESTAMPTZ NOT NULL,     -- 默认 10 分钟有效期
    consumed_at TIMESTAMPTZ,              -- 验证成功后置为当前时间（一次性作废）
    attempts    INT NOT NULL DEFAULT 0,   -- 验证失败次数（上限 5 次作废）
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 按邮箱查询最新验证码 / 统计发送频率
CREATE INDEX IF NOT EXISTS idx_email_code_email_created
    ON "EmailVerificationCode" (email, created_at DESC);

-- 定期清理过期记录（可选：交给 pg_cron 或应用内顺带清理）
CREATE INDEX IF NOT EXISTS idx_email_code_expires
    ON "EmailVerificationCode" (expires_at);
