// src/modules/bookReview/bookReview.controller.js
import * as bookReviewService from './bookReview.service.js';

export const createReview = async (req, res) => {
  try {
    const review = await bookReviewService.addReview(req.body);
    res.status(201).json(review);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const getReviews = async (req, res) => {
  try {
    const reviews = await bookReviewService.getReviewsForBook(req.params.bookId);
    res.json(reviews);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
