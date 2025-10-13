import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  firstName: { type: String },
  lastName:  { type: String },
  phone:     { type: String },
  line1: { type: String, required: true },
  line2: { type: String },
  city: { type: String, required: true },
  state: { type: String },
  zip: { type: String },
  country: { type: String, required: true },
  label: { type: String }, // e.g., Home, Work
  isPrimary: { type: Boolean, default: false }
}, { _id: true, timestamps: false })

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  passwordLength: { type: Number },          // added to return masked length to frontend
  phone: { type: String },
  cartData: { type: Object, default: {} },
  addresses: { type: [addressSchema], default: [] },
  securityOtp: { type: String },              // hashed OTP for sensitive edits
  securityOtpExpires: { type: Date },         // OTP expiry
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
}, { minimize: false, strict: true })

const userModel = mongoose.models.user || mongoose.model('user', userSchema);

export default userModel