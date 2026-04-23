// routes/friendRoutes.js  — full REST API for the friends system
import express from "express";
import authMiddleware from "../middlewares/auth.js";
import User from "../models/User.js";
import Message from "../models/Message.js";

const router = express.Router();

/* ─────────────────────────────────────────────
   GET /friends  — your accepted friends list
   Returns [{id, name, email, online}]
───────────────────────────────────────────── */
router.get("/friends", authMiddleware, async (req, res) => {
    try {
        const user = req.user;
        // Populate so we get email from User doc
        const populatedFriends = await Promise.all(
            user.friends.map(async (f) => {
                const friendUser = await User.findById(f.id).select("name email").lean();
                return {
                    id:    String(f.id),
                    name:  friendUser?.name || f.name || "Unknown",
                    email: friendUser?.email || f.email || ""
                };
            })
        );
        res.json(populatedFriends);
    } catch (err) {
        console.error("GET /friends error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ─────────────────────────────────────────────
   GET /friends/search?q=...
   Search users by name or email (excludes self)
───────────────────────────────────────────── */
router.get("/friends/search", authMiddleware, async (req, res) => {
    try {
        const q = (req.query.q || req.query.username || "").trim();
        if (!q) return res.json([]);

        const regex = new RegExp(q, "i");
        const results = await User.find({
            _id: { $ne: req.user._id },
            $or: [{ email: regex }, { name: regex }]
        })
            .select("_id name email")
            .limit(10)
            .lean();

        // Mark relationship status
        const myFriendIds  = req.user.friends.map((f) => String(f.id));
        const mySentEmails = req.user.friendRequestsend.map((r) => r.email);

        const annotated = results.map((u) => ({
            id:     String(u._id),
            name:   u.name,
            email:  u.email,
            status: myFriendIds.includes(String(u._id))
                ? "Already Friends"
                : mySentEmails.includes(u.email)
                ? "Pending"
                : "Send Request"
        }));
        res.json(annotated);
    } catch (err) {
        console.error("GET /friends/search error:", err);
        res.status(500).json({ error: "Search failed" });
    }
});

/* ─────────────────────────────────────────────
   GET /friends/requests
   Returns { received: [], sent: [] }
───────────────────────────────────────────── */
router.get("/friends/requests", authMiddleware, async (req, res) => {
    try {
        const user = req.user;

        // Enrich received requests with sender info
        const received = await Promise.all(
            user.friendRequestreceive.map(async (r) => {
                const sender = await User.findOne({ email: r.email }).select("_id name email").lean();
                return { id: sender?._id, name: sender?.name || r.email, email: r.email, status: r.currStatus };
            })
        );

        const sent = user.friendRequestsend.map((r) => ({
            email: r.email,
            status: r.currStatus
        }));

        res.json({ received, sent });
    } catch (err) {
        console.error("GET /friends/requests error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ─────────────────────────────────────────────
   POST /friends/send-request
   body: { to: email }
───────────────────────────────────────────── */
router.post("/friends/send-request", authMiddleware, async (req, res) => {
    try {
        const { to } = req.body;
        const me = req.user;

        if (!to) return res.status(400).json({ message: "Missing target email" });
        if (to === me.email) return res.status(400).json({ message: "Cannot add yourself" });

        // Find the target user
        const target = await User.findOne({ email: to });
        if (!target) return res.status(404).json({ message: "User not found" });

        // Check already friends
        const alreadyFriend = me.friends.some((f) => String(f.id) === String(target._id));
        if (alreadyFriend) return res.status(400).json({ message: "Already friends" });

        // Upsert sent request on sender
        me.friendRequestsend = me.friendRequestsend.filter((r) => r.email !== to);
        me.friendRequestsend.unshift({ email: to, currStatus: 0 });
        await me.save();

        // Upsert received request on target
        target.friendRequestreceive = target.friendRequestreceive.filter((r) => r.email !== me.email);
        target.friendRequestreceive.unshift({ email: me.email, currStatus: 0 });
        await target.save();

        res.json({ message: "Friend request sent!" });
    } catch (err) {
        console.error("POST /friends/send-request error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/* ─────────────────────────────────────────────
   POST /friends/accept
   body: { fromEmail: email }
───────────────────────────────────────────── */
router.post("/friends/accept", authMiddleware, async (req, res) => {
    try {
        const { fromEmail } = req.body;
        const me = req.user;

        const sender = await User.findOne({ email: fromEmail });
        if (!sender) return res.status(404).json({ message: "Sender not found" });

        // Remove from received list
        me.friendRequestreceive = me.friendRequestreceive.filter((r) => r.email !== fromEmail);
        // Add to friends (both sides)
        if (!me.friends.some((f) => String(f.id) === String(sender._id))) {
            me.friends.push({ id: String(sender._id), name: sender.name, email: sender.email });
        }
        await me.save();

        // Remove from sender's sent list; add me to their friends
        sender.friendRequestsend = sender.friendRequestsend.filter((r) => r.email !== me.email);
        if (!sender.friends.some((f) => String(f.id) === String(me._id))) {
            sender.friends.push({ id: String(me._id), name: me.name, email: me.email });
        }
        await sender.save();

        res.json({ message: "Friend request accepted!" });
    } catch (err) {
        console.error("POST /friends/accept error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/* ─────────────────────────────────────────────
   POST /friends/reject
   body: { fromEmail }
───────────────────────────────────────────── */
router.post("/friends/reject", authMiddleware, async (req, res) => {
    try {
        const { fromEmail } = req.body;
        const me = req.user;

        me.friendRequestreceive = me.friendRequestreceive.filter((r) => r.email !== fromEmail);
        await me.save();

        // Also remove from sender's sent list
        const sender = await User.findOne({ email: fromEmail });
        if (sender) {
            sender.friendRequestsend = sender.friendRequestsend.filter((r) => r.email !== me.email);
            await sender.save();
        }
        res.json({ message: "Request rejected" });
    } catch (err) {
        console.error("POST /friends/reject error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

/* ─────────────────────────────────────────────
   GET /friends/chat-history/:friendId
   Returns last 50 messages between me & friend
───────────────────────────────────────────── */
router.get("/friends/chat-history/:friendId", authMiddleware, async (req, res) => {
    try {
        const me       = req.user._id;
        const friendId = req.params.friendId;

        const messages = await Message.find({
            $or: [
                { from: me,       to: friendId },
                { from: friendId, to: me       }
            ]
        })
            .sort({ createdAt: 1 })
            .limit(50)
            .lean();

        res.json(messages);
    } catch (err) {
        console.error("GET /friends/chat-history error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

/* ─────────────────────────────────────────────
   POST /friends/share-song
   Persist a song-share message (REST fallback)
   body: { toId, song }
───────────────────────────────────────────── */
router.post("/friends/share-song", authMiddleware, async (req, res) => {
    try {
        const { toId, song } = req.body;
        const msg = await Message.create({
            from:    req.user._id,
            to:      toId,
            type:    "song",
            text:    `Shared a song: ${song.songName}`,
            payload: song
        });
        res.json({ success: true, message: msg });
    } catch (err) {
        console.error("POST /friends/share-song error:", err);
        res.status(500).json({ success: false });
    }
});

/* ─────────────────────────────────────────────
   POST /friends/share-playlist
   Persist a playlist-share message (REST fallback)
   body: { toId, playlist }
───────────────────────────────────────────── */
router.post("/friends/share-playlist", authMiddleware, async (req, res) => {
    try {
        const { toId, playlist } = req.body;
        const msg = await Message.create({
            from:    req.user._id,
            to:      toId,
            type:    "playlist",
            text:    `Shared a playlist: ${playlist.name}`,
            payload: playlist
        });
        res.json({ success: true, message: msg });
    } catch (err) {
        console.error("POST /friends/share-playlist error:", err);
        res.status(500).json({ success: false });
    }
});

export default router;
