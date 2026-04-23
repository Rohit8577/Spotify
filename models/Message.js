// models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    from: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    to:   { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    type: {
        type: String,
        enum: ["text", "song", "playlist"],
        default: "text"
    },
    text:    { type: String, default: "" },
    payload: { type: mongoose.Schema.Types.Mixed, default: null }, // song or playlist obj
    read:    { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Index for fast conversation fetch
messageSchema.index({ from: 1, to: 1, createdAt: -1 });

const Message = mongoose.model("message", messageSchema);
export default Message;
