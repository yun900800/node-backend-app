// 邮件发送模块：SMTP 单例 transporter + 验证码邮件模板
// 配置全部来自 .env：SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASSWORD / SMTP_FROM_NAME
import nodemailer from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_NAME, SMTP_OFFLINE } from '../../config/index.js';

// 模块级单例：创建一次，复用连接池
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE, // 465=true（SSL），587=false（STARTTLS + requireTLS）
  requireTLS: !SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
});

// 连接异常兜底日志（不发崩服务）
transporter.on('error', (err) => {
  console.error('[mailer] SMTP transporter error:', err.message);
});

async function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from: `"${SMTP_FROM_NAME}" <${SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

/**
 * 发送邮箱验证码邮件
 * @param {{ to: string, code: string, purpose: 'register'|'login', minutes: number }} params
 */
export async function sendVerificationCodeEmail({ to, code, purpose, minutes = 10 }) {
  // 离线模式：本地开发时网络上 SMTP 被拦截，验证码直接打到控制台（哈希仍正常入库）
  if (SMTP_OFFLINE) {
    console.log(`\n[SMTP_OFFLINE] 验证码 -> ${purpose}:${to} => ${code} (有效 ${minutes} 分钟)\n`);
    return { offline: true };
  }

  const actionText = purpose === 'register' ? '注册账号' : '登录';
  const digits = code
    .split('')
    .map((d) => `<span class="digit">${d}</span>`)
    .join('');

  const html = `
  <div style="margin:0;padding:24px;background:#f6f4ee;font-family:'Segoe UI',Arial,'PingFang SC','Microsoft YaHei',sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e2d8;">
      <div style="padding:28px 32px;background:#10333b;color:#e9d8a6;">
        <div style="font-size:20px;font-weight:700;">📚 ${SMTP_FROM_NAME}</div>
        <div style="margin-top:6px;font-size:13px;opacity:0.8;">你的${actionText}验证码</div>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 12px;font-size:15px;color:#333;">你好！以下是本次${actionText}的验证码：</p>
        <div style="margin:20px 0;text-align:center;">
          <span style="display:inline-block;padding:14px 8px;background:#f6f4ee;border-radius:12px;">${digits}</span>
        </div>
        <p style="margin:0;font-size:13px;color:#888;text-align:center;">
          请在 <b style="color:#333;">${minutes} 分钟</b>内完成验证，验证码使用一次后立即失效。
        </p>
        <p style="margin:24px 0 0;font-size:12px;color:#aaa;line-height:1.7;">
          如果这不是你本人的操作，请忽略此邮件，你的账户不会受到影响。<br />
          请勿把验证码透露给任何人。
        </p>
      </div>
    </div>
  </div>
  <style>.digit{display:inline-block;width:40px;height:52px;line-height:52px;font-size:28px;font-weight:700;color:#10333b;background:#fff;border-radius:8px;margin:0 4px;box-shadow:0 1px 3px rgba(0,0,0,0.08);}</style>`;

  return sendMail({
    to,
    subject: `【${SMTP_FROM_NAME}】${actionText}验证码：${code}`,
    html,
  });
}

/**
 * 启动时校验 SMTP 配置（只打日志，不阻塞/不抛错）
 */
export async function verifySmtpConnection() {
  if (SMTP_OFFLINE) {
    console.warn('[mailer] SMTP_OFFLINE=true，处于离线调试模式（验证码打印到控制台，不真实发信）');
    return false;
  }

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    console.warn('[mailer] SMTP 未配置完整，邮件功能不可用');
    return false;
  }
  try {
    await transporter.verify();
    console.log(`[mailer] SMTP 连接正常: ${SMTP_HOST}:${SMTP_PORT}`);
    return true;
  } catch (err) {
    console.error('[mailer] SMTP 连接失败:', err.message);
    return false;
  }
}

export default { sendMail, sendVerificationCodeEmail, verifySmtpConnection };
