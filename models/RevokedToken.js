import mongoose from 'mongoose';

// Store only a digest, never the reusable bearer credential itself.
const schema = new mongoose.Schema({
  _id: { type: String },
  expiresAt: { type: Date, required: true, expires: 0 },
});
export default mongoose.model('RevokedToken', schema);
