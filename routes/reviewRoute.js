import express from 'express';
import { submitReview } from '../controllers/reviewController.js';
import auth from '../middleware/auth.js';

const reviewRouter = express.Router();

// Route for submitting a new review
reviewRouter.post('/submit', auth, submitReview);

export default reviewRouter;
