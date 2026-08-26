// config/db.js
import mongoose from "mongoose";
import dns from "node:dns";
import dotenv from "dotenv";
dotenv.config();

dns.setServers(["8.8.8.8", "8.8.4.4"]);

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