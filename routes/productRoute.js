import express from 'express'
import { listProducts, addProduct, removeProduct, singleProduct, getProduct, updateProduct, addReview, getReviews } from '../controllers/productController.js'
import upload from '../middleware/multer.js';
import adminAuth from '../middleware/adminAuth.js';
import authUser from '../middleware/auth.js'

const productRouter = express.Router();

productRouter.post('/add',adminAuth,upload.fields([{name:'image1',maxCount:1},{name:'image2',maxCount:1},{name:'image3',maxCount:1},{name:'image4',maxCount:1}]),addProduct);
productRouter.post('/remove',adminAuth,removeProduct);
productRouter.post('/single',singleProduct);
productRouter.get('/list',listProducts)
productRouter.get('/:id', getProduct);
productRouter.put('/update/:id', adminAuth, upload.fields([{ name: 'image1', maxCount: 1 }, { name: 'image2', maxCount: 1 }, { name: 'image3', maxCount: 1 }, { name: 'image4', maxCount: 1 }]), updateProduct);
// reviews
productRouter.get('/:id/reviews', getReviews)
productRouter.post('/:id/reviews', authUser, addReview)

export default productRouter