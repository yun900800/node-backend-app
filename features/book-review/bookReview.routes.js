// src/modules/bookReview/bookReview.routes.js
import express from 'express';
import * as controller from './bookReview.controller.js';

const router = express.Router();

router.post('/', controller.createReview);
router.get('/:bookId', controller.getReviews);

export default router;
