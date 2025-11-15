import express from 'express';
import * as bookController from './book.controller.js';

const router = express.Router();

router.post('/', bookController.createBook);
router.get('/', bookController.getBooks);
router.get('/search', bookController.searchBooks);
router.get('/:id', bookController.getBookById);
router.put('/:id', bookController.updateBook);
router.delete('/:id', bookController.deleteBook);


export default router;