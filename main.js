import express from "express";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import passport from "passport";
import session from "express-session";
import cors from "cors";
import admin from "firebase-admin";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import http from "http";
import { WebSocketServer } from "ws";
import cookie from "cookie";

// Imports from new structure
import User from "./models/User.js";
import authRoutes from "./routes/authRoutes.js";
import playlistRoutes from "./routes/playlistRoutes.js";
import songRoutes from "./routes/songRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import Message from "./models/Message.js";

dotenv.config();

// --- Init Firebase ---
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}
console.log("🔥 Firebase Admin initialized");

// --- DB Connection ---
mongoose.connect(process.env.DATABASE_URL)
    .then(() => console.log("Connected to MongoDB Atlas!"))
    .catch(err => console.error("Could not connect to MongoDB Atlas...", err));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = 5000;
const JWT_SECRET = process.env.JWT_SECRET;

// --- Middlewares ---
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'assets')));
app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.use(session({
    secret: 'someSecret',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// --- Passport Strategy ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL
},
    async function (accessToken, refreshToken, profile, done) {
        try {
            let user = await User.findOne({ email: profile.emails[0].value });
            if (!user) {
                user = await new User({
                    email: profile.emails[0].value,
                    name: profile.displayName
                }).save();
            }
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }
));

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});

// --- Basic Routes ---
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        const token = jwt.sign({ id: req.user._id, email: req.user.email }, JWT_SECRET, { expiresIn: '365d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 365 * 24 * 60 * 60 * 1000
        });
        res.redirect("/");
    }
);

app.get('/', (req, res) => {
    const token = req.cookies.token;
    let isAuthenticated = false;
    if (token) {
        try {
            jwt.verify(token, JWT_SECRET);
            isAuthenticated = true;
        } catch (error) { isAuthenticated = false; }
    }
    res.render("spotify", { sess: isAuthenticated, message: isAuthenticated ? "Session Active" : "No active session" });
});

app.get("/url", (req, res) => { res.json({ url: process.env.SAVAN_URL }) });
app.get("/login", (req, res) => res.render("spotify_login"));
app.get("/download", (req, res) => res.render("download"));
app.get('/signup', (req, res) => res.render("spotify_signup"));
app.post("/pass", (req, res) => {
    const { email } = req.body;
    res.render("signup_pass", { email });
});

// REST endpoint for persisting chat messages (called by chat.js as fallback)
app.post("/friends/chat-history-save", async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ ok: false });
        const decoded = jwt.verify(token, JWT_SECRET);
        const { toId, type, text, payload } = req.body;
        await Message.create({ from: decoded.id, to: toId, type: type || "text", text: text || "", payload: payload || null });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ ok: false });
    }
});

// --- Use Routes ---
app.use("/", authRoutes);
app.use("/", playlistRoutes);
app.use("/", songRoutes);
app.use("/", userRoutes);
app.use("/", aiRoutes);
app.use("/", friendRoutes);

// ─── WebSocket Server ────────────────────────────────────────────────────────
// Map: userId (string) → WebSocket connection
const onlineUsers = new Map();

const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

wss.on("connection", async (ws, req) => {
    // --- Authenticate via JWT cookie on the upgrade request ---
    let userId = null;
    try {
        const cookies = cookie.parse(req.headers.cookie || "");
        const token   = cookies.token;
        if (!token) { ws.close(4001, "Unauthorized"); return; }
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = String(decoded.id);
    } catch (e) {
        ws.close(4001, "Invalid token");
        return;
    }

    // Register in map (replace old idle connection)
    if (onlineUsers.has(userId)) {
        try { onlineUsers.get(userId).close(); } catch (_) {}
    }
    onlineUsers.set(userId, ws);
    ws._userId = userId;
    console.log(`✅ WS user connected: ${userId}`);

    // Tell client their own userId
    ws.send(JSON.stringify({ type: "init", userId }));

    // Broadcast online status to all connected users
    _broadcast({ type: "online_status", userId, online: true }, userId);

    // --- Handle incoming messages ---
    ws.on("message", async (raw) => {
        let data;
        try { data = JSON.parse(raw); } catch (_) { return; }

        const { type, to, text, payload } = data;
        if (!to) return;

        // Verify `to` is actually a friend (security)
        const me = await User.findById(userId).select("friends").lean();
        const isFriend = me?.friends?.some((f) => String(f.id) === String(to));
        if (!isFriend) return; // silently drop

        // Build the message object to relay
        const msg = { type, from: userId, to, text, payload, createdAt: new Date() };

        // Persist to DB
        try {
            await Message.create({
                from:    userId,
                to,
                type:    type === "chat" ? "text" : type,
                text:    text || (type === "song" ? `Shared a song: ${payload?.songName}` : `Shared a playlist: ${payload?.name}`),
                payload: payload || null
            });
        } catch (e) {
            console.error("WS message persist error:", e);
        }

        // Relay to recipient if online
        const recipientWs = onlineUsers.get(String(to));
        if (recipientWs && recipientWs.readyState === 1 /* OPEN */) {
            recipientWs.send(JSON.stringify(msg));
        }
    });

    ws.on("close", () => {
        if (onlineUsers.get(userId) === ws) {
            onlineUsers.delete(userId);
        }
        console.log(`❌ WS user disconnected: ${userId}`);
        _broadcast({ type: "online_status", userId, online: false }, userId);
    });

    ws.on("error", (err) => console.error("WS error for", userId, err));
});

// Broadcast helper — sends to all EXCEPT optionally excluded userId
function _broadcast(data, excludeUserId = null) {
    const msg = JSON.stringify(data);
    onlineUsers.forEach((client, uid) => {
        if (uid === excludeUserId) return;
        if (client.readyState === 1) client.send(msg);
    });
}

// API to check online status of a list of userIds
app.post("/friends/online-status", async (req, res) => {
    const { userIds } = req.body;
    if (!Array.isArray(userIds)) return res.json({});
    const result = {};
    userIds.forEach((id) => { result[id] = onlineUsers.has(String(id)); });
    res.json(result);
});

server.listen(port, '0.0.0.0', () => {
    console.log(`App is running on port http://localhost:${port}`);
});