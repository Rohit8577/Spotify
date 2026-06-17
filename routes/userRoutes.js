import Interaction from "../models/Interactions.js";
import express from "express";
import authMiddleware from "../middlewares/auth.js";
import User from "../models/User.js";
import Message from "../models/Message.js";

const router = express.Router();

router.get("/userprofile", authMiddleware, (req, res) => {
  const user = req.user

  res.json({ id: user._id, email: user.email, name: user.name, lib: user.library, artist: user.artist })
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
    const { type ,source, song } = req.body;
    // console.log(song)
    const newInteraction = await Interaction.create({
      user: req.user._id,
      source: source,
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




router.get("/friends/list", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json([]);
    
    // Using the friends array from the User model schema
    const friends = user.friends || [];
    res.json(friends);
  } catch (err) {
    console.error("Error loading friends:", err);
    res.status(500).json([]);
  }
});

router.get("/friends/activity", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json([]);
    
    const friends = user.friends || [];
    if (friends.length === 0) return res.json([]);

    const activities = await Promise.all(friends.map(async (friend) => {
      const lastInteraction = await Interaction.findOne({ user: friend.id })
        .sort({ createdAt: -1 });
        
      let status = "Offline";
      if (lastInteraction && lastInteraction.song && lastInteraction.song.songName) {
         status = `Listening to ${lastInteraction.song.songName}`;
      }
      return {
        id: friend.id,
        name: friend.name,
        status: status
      };
    }));
    
    res.json(activities);
  } catch (err) {
    console.error("Error loading friend activity:", err);
    res.status(500).json([]);
  }
});

// Chat History Endpoint
router.get("/chat/history/:friendId", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const friendId = req.params.friendId; // the friend's email or ID
    const myId = user.email; // We'll use email as the common identifier since friends are added via email

    // Find messages where I am sender and friend is receiver, OR friend is sender and I am receiver
    const messages = await Message.find({
      $or: [
        { senderEmail: myId, receiverEmail: friendId },
        { senderEmail: friendId, receiverEmail: myId }
      ]
    }).sort({ createdAt: 1 }); // Oldest first for chat display

    res.json(messages);
  } catch (err) {
    console.error("Error loading chat history:", err);
    res.status(500).json({ error: "Failed to load chat history" });
  }
});

export default router;