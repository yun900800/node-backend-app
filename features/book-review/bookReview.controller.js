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

export const updateReview = async (req, res) => {
  try {
    const review = await bookReviewService.updateReview(req.params.id, req.body);
    res.json(review);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const deleted = await bookReviewService.deleteReview(req.params.id);
    res.json({ success: true, id: deleted.id });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
};
