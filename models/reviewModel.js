import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'order', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    deliveryRating: { type: Number, required: true, min: 1, max: 5 },
    deliveryComment: { type: String },
    productReviews: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
            rating: { type: Number, required: true, min: 1, max: 5 },
            comment: { type: String },
        }
    ],
    createdAt: { type: Date, default: Date.now }
});

const reviewModel = mongoose.models.review || mongoose.model('review', reviewSchema);

export default reviewModel;
