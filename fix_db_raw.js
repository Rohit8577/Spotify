import mongoose from "mongoose";

const DATABASE_URL = "mongodb+srv://bindrohit98:Rohit%408577@cluster0.vgbrug1.mongodb.net/spotify?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(DATABASE_URL)
    .then(async () => {
        console.log("Connected to DB");
        const collection = mongoose.connection.collection("users"); // access raw collection
        
        const users = await collection.find({}).toArray();
        let fixedCount = 0;
        
        for (const user of users) {
            let dirty = false;
            if (user.recently && Array.isArray(user.recently)) {
                user.recently = user.recently.filter(r => {
                    if (r.songUrl && typeof r.songUrl === 'object') {
                        dirty = true;
                        return false; 
                    }
                    if (r.songUrl && typeof r.songUrl === 'string' && r.songUrl.includes('{') && r.songUrl.includes('songId')) {
                        dirty = true;
                        return false;
                    }
                    return true;
                });
            }
            
            if (dirty) {
                await collection.updateOne({ _id: user._id }, { $set: { recently: user.recently } });
                console.log(`Fixed recently array for raw user: ${user.email}`);
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
