import mongoose from "mongoose";
import User from "./models/User.js";

const DATABASE_URL = "mongodb+srv://bindrohit98:Rohit%408577@cluster0.vgbrug1.mongodb.net/spotify?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(DATABASE_URL)
    .then(async () => {
        console.log("Connected to DB");
        const users = await User.find();
        let fixedCount = 0;
        
        for (const user of users) {
            let dirty = false;
            user.recently = user.recently.filter(r => {
                if (typeof r.songUrl === 'object') {
                    dirty = true;
                    return false; // Just remove the corrupted recently entries
                }
                if (typeof r.songUrl === 'string' && r.songUrl.startsWith('{')) {
                    dirty = true;
                    return false; // stringified objects
                }
                return true;
            });
            
            if (dirty) {
                await user.save();
                console.log(`Fixed recently array for user: ${user.email}`);
                fixedCount++;
            }
        }
        
        console.log(`Finished fixing ${fixedCount} users.`);
        process.exit(0);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
