import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, select: false },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
  platform: { type: String, enum: ['android', 'ios'], required: true },
  sessionDigest: { type: String, required: true },
  tokenVersion: { type: Number, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });
export default mongoose.model('PushDevice', schema);
