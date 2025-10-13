import express from 'express';
import { createIssue, listIssues, getIssue, updateIssue } from '../controllers/issueController.js';
import adminAuth from '../middleware/adminAuth.js';

const router = express.Router();

// Public (or authenticated via auth middleware if desired)
router.post('/', createIssue);

// Admin endpoints
router.get('/', adminAuth, listIssues);
router.get('/:id', adminAuth, getIssue);
router.patch('/:id', adminAuth, updateIssue);

export default router;
