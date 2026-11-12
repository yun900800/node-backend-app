// 公开门户路由：仅只读 GET，配合宽松限流防止被刷
import express from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from './publicPortal.controller.js';

const router = express.Router();

// 公开读限流：15 分钟 300 次/IP（读接口需要比注册类宽松得多）
const publicReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/reviews', publicReadLimiter, controller.getPublicLatestReviews);
router.get('/books', publicReadLimiter, controller.getPublicBooks);
router.get('/books/:bookId', publicReadLimiter, controller.getPublicBookDetail);

export default router;
