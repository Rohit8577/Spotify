import mongoose from "mongoose";
// import Interaction from './Interactions';

const InteractionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: String,
    song: {
        // action: String,
        songName: String,
        songId: String,
        artistName: String
    }
}, { timestamps: true }); // 🔥 Ye line add kar le, created_at aur updated_at auto handle ho jayega
// Compound Index: Taaki tum "User ki Recent History" turant nikaal sako
InteractionSchema.index({ user: 1, timestamp: -1 });
const Interaction = mongoose.model('interaction', InteractionSchema)
export default Interaction;