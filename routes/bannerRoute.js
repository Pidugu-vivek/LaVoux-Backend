import express from 'express';
import { addBanner, listBanners, updateBanner, removeBanner } from '../controllers/bannerController.js';
import upload from '../middleware/multer.js';
import adminAuth from '../middleware/adminAuth.js';

const bannerRouter = express.Router();

// Public route to list banners (can be filtered for active only)
bannerRouter.get('/list', listBanners);

// Admin routes
bannerRouter.post('/add', adminAuth, upload.single('image'), addBanner);
bannerRouter.put('/update/:id', adminAuth, upload.single('image'), updateBanner);
bannerRouter.delete('/remove/:id', adminAuth, removeBanner);

export default bannerRouter;
