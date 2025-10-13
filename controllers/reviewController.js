import reviewModel from '../models/reviewModel.js';
import orderModel from '../models/orderModel.js';
import productModel from '../models/productModel.js';

// Submit a new review
const submitReview = async (req, res) => {
    console.log('Received review submission request:');
    console.log('Request Body:', req.body);
    console.log('User ID:', req.body.userId);

    try {
        const { orderId, deliveryRating, deliveryComment, productReviews } = req.body;
        const userId = req.body.userId;

        // 1. Create and save the new review
        const newReview = new reviewModel({
            order: orderId,
            user: userId,
            deliveryRating,
            deliveryComment,
            productReviews
        });
        await newReview.save();

        // 2. Update each product with the new review
        for (const prodReview of productReviews) {
            const product = await productModel.findById(prodReview.product);
            if (product) {
                product.reviews.push({
                    user: userId,
                    rating: prodReview.rating,
                    comment: prodReview.comment
                });

                // Recalculate average rating and number of reviews
                const totalRatings = product.reviews.reduce((acc, review) => acc + review.rating, 0);
                product.numReviews = product.reviews.length;
                product.averageRating = totalRatings / product.numReviews;

                await product.save();
            }
        }

        // 3. Update the order with the review reference
        await orderModel.findByIdAndUpdate(orderId, { 
            feedbackSubmitted: true,
            review: newReview._id
        });

        res.json({ success: true, message: 'Review submitted successfully.' });
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({ success: false, message: 'An unexpected error occurred on the server.' });
    }
};

export { submitReview };
