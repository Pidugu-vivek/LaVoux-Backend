import mongoose from 'mongoose'

const bannerSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  title: { type: String },
  link: { type: String },
  order: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  date: { type: Date, default: Date.now }
})

const bannerModel = mongoose.models.banner || mongoose.model('banner', bannerSchema)
export default bannerModel
