import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, required: true },
  sessionDigest: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  ticket: String,
  attempts: { type: Number, default: 0 },
  dueAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 86400000), expires: 0 },
});
export default mongoose.model('PushJob', schema);
