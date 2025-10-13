import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  category: { type: String, enum: ['Delivery', 'Payment', 'Product', 'Account', 'Other'], default: 'Other' },
  orderId: { type: String },
  message: { type: String, required: true },
  status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
  adminNotes: [{
    note: { type: String },
    at: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const issueModel = mongoose.models.issue || mongoose.model('issue', issueSchema);
export default issueModel;
