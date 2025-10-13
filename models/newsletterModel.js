import mongoose from 'mongoose'

const newsletterSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  couponCode: { type: String },       // generated coupon for the user
  claimed: { type: Boolean, default: false }, // whether user already used the coupon in checkout
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model('Newsletter', newsletterSchema)