import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    senderEmail: { 
        type: String, 
        required: true,
        index: true 
    },
    receiverEmail: { 
        type: String, 
        required: true,
        index: true 
    },
    content: { 
        type: String, 
        required: true 
    }
}, { timestamps: true });

// Compound index to quickly fetch chat history between two users
messageSchema.index({ senderEmail: 1, receiverEmail: 1, createdAt: -1 });

const Message = mongoose.model("message", messageSchema);
export default Message;
