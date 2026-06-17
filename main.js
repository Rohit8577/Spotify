import express from "express";
import http from "http";
import path from "path";
import mongoose from "mongoose";
import Message from "./models/Message.js";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import passport from "passport";
import session from "express-session";
import cors from "cors";
import admin from "firebase-admin";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";

// Imports from new structure
import User from "./models/User.js"; // Needed for passport serialization
import authRoutes from "./routes/authRoutes.js";
import playlistRoutes from "./routes/playlistRoutes.js";
import songRoutes from "./routes/songRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

dotenv.config();

// --- Init Firebase (Yahi rehne de ya config/firebase.js me daal de) ---
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
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// --- Passport Strategy (Yahi rakh sakte hain ya config me move kar sakte hain) ---
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

// --- Basic Routes (Views & Auth Callback) ---
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
    res.render("sangeetX", { sess: isAuthenticated, message: isAuthenticated ? "Session Active" : "No active session" });
});

app.get("/url", (req, res) => { res.json({ url: process.env.SAVAN_URL }) });
app.get("/login", (req, res) => res.render("sangeetX_login"));
app.get("/download", (req, res) => res.render("download"));
app.get('/signup', (req, res) => res.render("sangeetX_signup"));
app.post("/pass", (req, res) => {
    const { email } = req.body;
    res.render("signup_pass", { email });
});

// --- Use Routes ---
// Ye saare logic ab alag files me hain
app.use("/", authRoutes);
app.use("/", playlistRoutes);
app.use("/", songRoutes);
app.use("/", userRoutes);
app.use("/", aiRoutes);

// --- HTTP + Socket.IO Server ---
import { Server as SocketServer } from "socket.io";
const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: "*" } });

// Track connected users: userId -> Set of socket IDs
const connectedUsers = new Map();

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  // Register user by ID (sent from client after auth)
  socket.on("register", (data) => {
    const userId = data.id || data;
    socket.userId = userId;
    socket.username = data.name || "Someone";
    if (!connectedUsers.has(userId)) connectedUsers.set(userId, new Set());
    connectedUsers.get(userId).add(socket.id);
    console.log(`🟢 User ${socket.username} (${userId}) registered with socket ${socket.id}`);
  });

  // Now Playing - broadcast to all other connected users
  socket.on("now-playing", (data) => {
    socket.broadcast.emit("friend-now-playing", {
      username: socket.username || socket.userId || "A Friend",
      song: data,
    });
  });

  // Share song to specific user
  socket.on("share-song", (data) => {
    const { to, song } = data;
    const targetSockets = connectedUsers.get(to);
    if (targetSockets) {
      targetSockets.forEach((sid) => {
        io.to(sid).emit("song-shared", {
          from: socket.username || socket.userId || "Someone",
          song,
        });
      });
    }
  });

  // Chat feature: receive message from a client, save to DB, and forward to receiver
  socket.on("send-chat-message", async (data) => {
    try {
      const { to, content } = data; // to is receiver's email/id
      const from = socket.userId; // sender's email/id
      
      // Save to database
      const newMessage = await Message.create({
        senderEmail: from,
        receiverEmail: to,
        content: content
      });

      // Forward to receiver if they are online
      const targetSockets = connectedUsers.get(to);
      if (targetSockets) {
        targetSockets.forEach((sid) => {
          io.to(sid).emit("receive-chat-message", newMessage);
        });
      }
      
      // Also send it back to the sender so they know it was processed successfully (optional, but good for UI confirmation)
      socket.emit("receive-chat-message", newMessage);
    } catch (err) {
      console.error("Error saving chat message:", err);
    }
  });

  socket.on("disconnect", () => {
    if (socket.userId && connectedUsers.has(socket.userId)) {
      connectedUsers.get(socket.userId).delete(socket.id);
      if (connectedUsers.get(socket.userId).size === 0) connectedUsers.delete(socket.userId);
    }
    console.log("❌ Socket disconnected:", socket.id);
  });
});

app.post('/api/ask-ai', async (req, res) => {
    try {
        const { prompt } = req.body;
        console.log(prompt)
        if (!prompt) return res.status(400).json({ error: "Prompt bhej" });

        // IMPORTANT TWEAK: Stream true kiya hai aur options pass kiye hain
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'qwen3.5:4b',
                prompt: prompt,
                stream: false, // Stream ko abhi false hi rakha hai for simplicity
                options: {
                   num_ctx: 1024, // Context window choti kar di VRAM bachane ke liye
                  //  num_predict: 200 // Max 200 words ka answer dega, load kam padega
                }
            })
        });

        // Agar Ollama server down/choke hua toh pakad lenge
        if (!response.ok) {
           throw new Error(`Ollama Error: ${response.status}`);
        }

        const data = await response.json();
        // console.log(data)
        let aiText = data.response;

        // "Thinking" filter
        aiText = aiText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        res.json({ success: true, answer: aiText });

    } catch (error) {
        console.error("LLM Server down hai ya VRAM choke:", error.message);
        res.status(500).json({ error: "Server Load High" });
    }
});


server.listen(port, '0.0.0.0', () => {
    console.log(`App is running on port http://localhost:${port}`);
});