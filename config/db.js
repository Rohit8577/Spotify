// config/db.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log("🔥 Connected to MongoDB Atlas!");
    } catch (err) {
        console.error("❌ Could not connect to MongoDB...", err);
        process.exit(1);
    }
};

export default connectDB;