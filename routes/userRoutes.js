import Interaction from "../models/Interactions.js";
import express from "express";
import authMiddleware from "../middlewares/auth.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/userprofile", authMiddleware, (req, res) => {
  const user = req.user
  res.json({ email: user.email, name: user.name, lib: user.library, artist: user.artist })
});

router.post("/addArtist", authMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    const user = req.user;
    user.artist = user.artist.filter(item => String(item.id) !== String(id));

    // 2. Ab wahi ID sabse upar (Start of array) add karo
    user.artist.unshift({ id: id });

    // 3. Save karo
    await user.save();

    res.status(200).json({ msg: "Artist Moved to Top" });

  } catch (e) {
    console.error("Error adding artist:", e);
    res.status(500).json({ msg: "Server Error" });
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
    const { type , song } = req.body;
    console.log(song)
    const newInteraction = await Interaction.create({
      user: req.user._id,
      type,
      song:{
        songName: song.songName,
        songId: song.songId,
        artistName: song.artist
      },
      timestamp: new Date()
    });

    res.status(200).json({ success: true });

  } catch (err) {
    console.error("Log Interaction Error:", err);
    res.status(500).json({ success: false });
  }
});




export default router;