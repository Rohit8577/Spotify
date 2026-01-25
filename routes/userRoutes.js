import express from "express";
import authMiddleware from "../middlewares/auth.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/userprofile", authMiddleware, (req, res) => {
   const user = req.user
    res.json({ email: user.email, name: user.name, lib: user.library, artist: user.artist })
});

router.post("/addArtist", authMiddleware, async (req, res) => {
   const { id } = req.body
    const user = req.user;
    const alreadyExists = user.artist.find(item => item.id === id)
    if (alreadyExists) {
        console.log("exists")
        user.artist = user.artist.filter(item => item.id !== id)
        await user.save()
        res.status(201).json({ msg: "Unfollowed" })
    } else {
        user.artist.push({ id: id })
        await user.save()
        res.status(200).json({ msg: "Followed" })
    }
});

// --- Friend System ---
router.post("/searchFriend", async (req, res) => {
   try {
        const { friendId } = req.body;
        if (!friendId) return res.json([]);

        // simple regex search on email or name
        const regex = new RegExp(friendId, "i");
        const results = await User.find({
            $or: [{ email: regex }, { name: regex }]
        })
            .select("_id name email")   // only what you need
            .limit(10)
            .lean();

        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Search failed" });
    }
});

router.post("/sendFriendRequest", authMiddleware, async (req, res) => {
    const user = req.user
    const { friendId } = req.body
    user.friendRequestsend = user.friendRequestsend.filter(item => item.email != friendId)
    user.friendRequestsend.unshift({ email: friendId, currStatus: 0 })
    await user.save()
    res.json({ msg: "Request Send Successfully" })
    console.log(friendId)
});

// routes/userRoutes.js me add karo

router.post("/log-interaction", authMiddleware, async (req, res) => {
    try {
        const { type, metadata, artist } = req.body;
        const user = req.user;

        // Nayi interaction aage add karo
        user.interactions.unshift({ type, metadata, artist });

        // Database bhari na ho jaye, isliye last 50 interactions hi rakho
        if (user.interactions.length > 50) {
            user.interactions = user.interactions.slice(0, 50);
        }

        await user.save();
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Log Error:", err);
        res.status(500).json({ success: false });
    }
});

export default router;