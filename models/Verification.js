import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  email: { type: String, required: true },
  purpose: { type: String, enum: ['signup', 'reset'], required: true },
  codeHash: String,
  proofHash: String,
  attempts: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  sentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});
schema.index({ email: 1, purpose: 1 }, { unique: true });
export default mongoose.model('verification', schema);
