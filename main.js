import express from "express";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
// import session from "express-session"; // <-- This is now removed
import { readdir } from "fs/promises";
import dotenv from "dotenv"
dotenv.config();
import passport from "passport";
import session from "express-session";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import nodemailer from "nodemailer"
import { GoogleGenerativeAI } from "@google/generative-ai"
import axios from "axios";
import cors from "cors"
import { env } from "process";
import admin from "firebase-admin";

// --- Database Connection ---
const mongoDB = process.env.DATABASE_URL;
mongoose.connect(mongoDB)
    .then(() => console.log("Connected to MongoDB Atlas!"))
    .catch(err => console.error("Could not connect to MongoDB Atlas...", err));

// --- Initial Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const SAAVN_BASE_URL = process.env.SAVAN_URL
const JIOSAAVN_API_URL = `${SAAVN_BASE_URL}/search/songs`;
// const JIOSAAVN_API_URL = "https://jiosaavn.rajputhemant.dev/search/songs"; // Tera Unofficial API
const GEMINI_API_KEY = process.env.googleApi;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
// --- Database Schema (No changes needed) ---
const usersc = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String },
    name: { type: String },
    dob: { type: Date },
    gender: { type: String },
    library: [{
        image: { type: String },
        name: { type: String },
        songs: [{
            songUrl: { type: String },
            image: { type: String },
            songName: { type: String },
            artist: { type: String },
            len: { type: Number },
            songId: { type: String }
        }]

    }],
    favorite: [{
        songUrl: { type: String },
        image: { type: String },
        songName: { type: String },
        artist: { type: String },
        len: { type: Number },
        songId: { type: String }
    }],
    recently: [{
        songUrl: { type: String },
        image: { type: String },
        songName: { type: String },
        artist: { type: String },
        len: { type: Number },
        songId: { type: String }
    }],
    artist: [{
        id: { type: Number }
    }],
    friendRequestsend: [{
        email: { type: String },
        currStatus: { type: Number }
    }],
    friendRequestreceive: [{
        email: { type: String },
        currStatus: { type: Number }
    }],
    friends: [{
        id: { type: String },
        name: { type: String }
    }],
    history: [{
        song: {
            songUrl: { type: String },
            image: { type: String },
            songName: { type: String },
            artist: { type: String },
            len: { type: Number },
            songId: { type: String },
            date: { type: Date }
        },
        query: { type: String }
    }]
});
const User = new mongoose.model("user", usersc);

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
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT
);


const authMiddleware = async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(decoded.id).select("-password");

        if (!req.user) {
            return res.status(401).json({ message: "User not found." });
        }

        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token." });
    }
};

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

passport.serializeUser((user, done) => {
    done(null, user._id);
});
passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Generate JWT manually since you're using JWT not sessions
        const token = jwt.sign({ id: req.user._id, email: req.user.email }, JWT_SECRET, {
            expiresIn: '365d'
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 365 * 24 * 60 * 60 * 1000
        });

        res.redirect("/"); // or wherever you want
    }
);

app.get('/', (req, res) => {
    const token = req.cookies.token;
    let isAuthenticated = false;
    if (token) {
        try {
            // Check if the token is valid without throwing an error if it's not
            jwt.verify(token, JWT_SECRET);
            isAuthenticated = true;
        } catch (error) {
            isAuthenticated = false;
        }
    }
    res.render("spotify", { sess: isAuthenticated, message: isAuthenticated ? "Session Active" : "No active session" });
});
app.get("/url", (req, res) => {
    res.json({ url: SAAVN_BASE_URL })
})
app.get("/login", (req, res) => res.render("spotify_login"));
app.get("/download", (req, res) => res.render("download"));
app.get('/signup', (req, res) => res.render("spotify_signup"));
app.post("/pass", (req, res) => {
    const { email } = req.body;  // <-- yahan se milega
    res.render("signup_pass", { email });
});

// App ke liye hai 
app.post("/google-login", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Token missing" });
    }

    // ✅ Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(token);

    const email = decoded.email;
    const name = decoded.name;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        name,
      });
    }

    // 🔐 Create your OWN JWT
    const jwtToken = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "365d" }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Invalid Google token" });
  }
});



// --- Authentication Routes ---

app.post("/signup", async (req, res) => {
    const { email, userdata, globalPassword } = req.body;
    console.log(userdata)
    if (!email) {
        return res.status(400).json({ message: "Email required" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
    }

    const user = await new User({ email, password: globalPassword, name: userdata.name, gender: userdata.gender, dob: userdata.dob }).save();

    // Create a JWT
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
        expiresIn: '365d' // Token expires in 1 year
    });

    // Send the token in an httpOnly cookie
    res.cookie('token', token, {
        httpOnly: true, // Prevents client-side JS from accessing the cookie
        secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
        maxAge: 365 * 24 * 60 * 60 * 1000 // 1 day in milliseconds
    });

    res.status(201).json({ message: "Signup successful", token: token, user: { id: user._id, name: user.name, email: user.email } });
});

app.post("/emailCheck", async (req, res) => {
    const { email } = req.body
    console.log(email)
    const alreadyExists = await User.findOne({ email })

    if (alreadyExists) {
        return res.status(400).json({ msg: "Email already exists" })
    } else {
        return res.status(200).json({ msg: "New Email" })
    }
})

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        return res.status(400).json({ message: "Email does not exist" });
    }
    // IMPORTANT: In a real app, you must hash passwords and use a comparison function like bcrypt.compare()
    if (user.password !== password) {
        return res.status(401).json({ message: "Wrong Password" });
    }

    // Create and send the token, same as in signup
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '365d' });
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 365 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
        message: "Login successful",
        token: token, // Ye line add kar de Flutter ke liye
        user: { id: user._id, name: user.name, email: user.email }
    });
});

app.get("/logout", (req, res) => {
    // To log out, just clear the cookie containing the token
    res.clearCookie('token');
    res.redirect("/");
});

app.post("/pass", async (req, res) => {
    // Thanks to the middleware, `req.user` is available here.
    const { password } = req.body;

    // We can update the user directly from req.user
    const checkuser = await User.findOne({ email: req.user })
    console.log(checkuser)
    req.user.password = password;
    await req.user.save();

    res.status(200).json({ message: "Password updated successfully" });
});

app.post("/playlistname", authMiddleware, async (req, res) => {
    const { name, imageUrl } = req.body;
    const user = req.user;

    const alreadyExists = user.library.some((item) => item.name === name);
    if (!alreadyExists) {
        user.library.push({ name, image: imageUrl });
        await user.save();
        res.status(200).json({ msg: "Playlist Created" });
    } else {
        res.status(201).json({ msg: "Playlist Already Exists" });
    }
});

app.post("/songinfo", authMiddleware, async (req, res) => {
    try {
        const { name, url, songUrl, artist, pname, time, songId } = req.body;
        const user = req.user;

        const playlist = user.library.find(pl => pl.name === pname);
        if (!playlist) {
            console.log(pname)
            return res.status(404).send("Playlist not found");
        }

        const alreadyExists = playlist.songs.some(n => n.songId === songId);
        if (alreadyExists) {
            return res.status(201).json({ msg: `Song already exists in ${pname}` });
        }

        playlist.songs.push({ songUrl, image: url, songName: name, artist, len: time, songId });
        await user.save();
        res.status(200).json({ msg: `Song added to ${pname}` });

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/fetchplaylist", authMiddleware, async (req, res) => {
    res.status(200).json({ array: req.user.library });
});

app.post("/librarySongs", authMiddleware, async (req, res) => {
    const { pname } = req.body;
    const playlist = req.user.library.find((pl) => pl.name === pname);
    if (playlist) {
        res.json({ arr: playlist.songs });
    } else {
        res.status(404).json({ msg: "Playlist not found" });
    }
});

app.post("/tickSymbol", authMiddleware, async (req, res) => {
    const { url, pname } = req.body;
    const playlist = req.user.library.find((item) => item.name === pname);
    if (!playlist) return res.status(404).json({ msg: "Playlist not found" });

    const exists = playlist.songs.some((song) => song.songId === url);
    return res.status(200).json({ msg: exists ? "exists" : "not exists" });
});

app.post("/forgetpass", async (req, res) => {
    const { forgetemail } = req.body;
    // console.log(forgetemail)
    const user = await User.findOne({ email: forgetemail });
    if (user) {
        res.status(200).json({ ischeck: true, message: "User found, proceed to reset." });
    } else {
        res.status(400).json({ ischeck: false, message: "Email not found" });
    }
});

app.post("/updtpass", async (req, res) => {
    const { newpassword, email } = req.body;
    const check = await User.findOne({ email })
    if (!check) {
        res.status(400).json({ message: "Some error occured" })
    } else {
        const updt = await User.updateOne({ email: email }, { $set: { password: newpassword } })
        if (updt) {
            res.status(200).json({ message: "Password Updated" })
        } else {
            res.status(400).json({ message: "Some error occured" })
        }
    }
    console.log(check.password)
});

app.get("/get-songs", async (req, res) => {
    try {
        const songsPath = path.join(process.cwd(), "public/songs");
        const files = await readdir(songsPath);
        res.json(files);
    } catch (error) {
        console.error("Error reading songs folder:", error);
        res.status(500).json({ error: "Failed to load songs" });
    }
});

app.get("/get-favorite", authMiddleware, (req, res) => {
    const user = req.user
    // console.log(user.library)
    res.json({ arr: user.favorite })
})

app.post("/favorite", authMiddleware, async (req, res) => {
    const { url, image, name, artist, len, songId } = req.body
    const user = req.user

    const alreadyExists = user.favorite.find(item => item.songId === songId)

    if (alreadyExists) {
        user.favorite = user.favorite.filter(item => item.songId !== songId)
        await user.save()
        res.status(201).json({ msg: "Remove From Liked" })
    } else {
        user.favorite.push({ songUrl: url, image: image, songName: name, artist: artist, len: len, songId })
        await user.save()
        res.status(200).json({ msg: "Added To Liked" })
    }


})

app.post("/deleteSong", authMiddleware, async (req, res) => {
    const { playlistName, songId } = req.body;
    const user = req.user;

    const playlist = user.library.find(p => p.name === playlistName);
    if (playlist) {
        playlist.songs = playlist.songs.filter(song => song.songId != songId);
        await user.save();
        res.status(200).json({ msg: "Deleted Successfully" });
    } else {
        res.status(404).json({ msg: "playlist not found" });
    }
});

app.post("/deletePlaylist", authMiddleware, (req, res) => {
    const { playlistName } = req.body
    const user = req.user

    user.library = user.library.filter(item => item.name !== playlistName)
    user.save()
    res.json({ msg: "Playlist Deleted" })
})

app.post("/renamePlaylist", authMiddleware, async (req, res) => {
    const { oldName, newName } = req.body
    const user = req.user
    const alreadyExists = user.library.find(item => item.name === newName)
    if (alreadyExists) {
        return res.status(400).json({ msg: "Playlist Already Exist" })
    }
    const playlistToRename = user.library.find(item => item.name === oldName);
    if (!playlistToRename) {
        return res.status(404).json({ msg: "Original playlist not found" });
    }
    playlistToRename.name = newName;
    await user.save();
    res.status(200).json({ msg: "Renamed successfully", updatedLibrary: user.library });
})

app.post("/updateRecently", authMiddleware, async (req, res) => {
    const { songUrl, image, songName, artist, len, songId } = req.body;
    const user = req.user;

    // Remove the song if it already exists to avoid duplicates
    user.recently = user.recently.filter(song => song.songId != songId);

    // Add new song to the front
    user.recently.unshift({ songUrl, image, songName, artist, len, songId });

    // Limit to latest 10 songs
    // if (user.recently.length > 10) {
    //     user.recently = user.recently.slice(0, 10);
    // }

    await user.save();
    res.json({ msg: "Recently Updated" });
});

app.get("/updateRecently", authMiddleware, (req, res) => {
    const user = req.user
    res.json({ arr: user.recently })
})

app.get("/userprofile", authMiddleware, (req, res) => {
    const user = req.user
    res.json({ email: user.email, name: user.name, lib: user.library, artist: user.artist })
})

app.post("/addArtist", authMiddleware, async (req, res) => {
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
})

app.post("/send-otp", async (req, res) => {
    const { email } = req.body;
    console.log("Sending OTP to:", email);

    const otp = Math.floor(1000 + Math.random() * 9000);

    try {
        // Gmail transporter
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "noreply.musicplayer7@gmail.com", // tera gmail
                pass: "eufz kvna uujn tyxu",         // jo popup me mila tha
            },
        });

        // send mail
        let info = await transporter.sendMail({
            from: `"Music Player 🎵" <noreply.musicplayer7@gmail.com>`,
            to: email,
            subject: `${otp} - Your Music Player code`,
            html: `<p>Your OTP is <b>${otp}</b>. It will expire in 5 minutes.</p>`,
        });

        console.log("Message sent:", info.messageId);

        res.json({ success: true, otp: otp });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to send OTP" });
    }
});

app.get("/api/search", async (req, res) => {
    const q = (req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "missing query" });

    const apiURL = `https://www.jiosaavn.com/api.php?p=1&q=${encodeURIComponent(q)}&_format=json&_marker=0&api_version=4&ctx=wap6dot0&n=20&__call=search.getResults`;
    const apiURL1 = `https://www.jiosaavn.com/api.php?p=1&q=${encodeURIComponent(q)}&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=20&__call=search.getPlaylistResults`;

    try {
        // Search songs
        const r = await fetch(apiURL, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "application/json, text/plain, */*",
                "Referer": "https://www.jiosaavn.com/",
                "Origin": "https://www.jiosaavn.com"
            }
        });

        // Search playlists
        const response = await fetch(apiURL, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "application/json, text/plain, */*",
                "Referer": "https://www.jiosaavn.com/",
                "Origin": "https://www.jiosaavn.com"
            }
        });

        const result = await response.json();
        let text = await r.text();

        // clean JSON
        text = text.replace(/^[^\{]+/, "").replace(/;$/, "");

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error("Parse error:", e);
            console.error("RAW RESPONSE:", text.slice(0, 200));
            return res.status(500).json({ error: "JSON parse failed" });
        }

        let playlistSongs = [];
        if (result?.results?.length > 0) {
            const playlistId = result.results[0].id;
            const playlistAPI = `https://www.jiosaavn.com/api.php?__call=playlist.getDetails&listid=${playlistId}&_format=json&_marker=0`;

            const pRes = await fetch(playlistAPI, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Accept": "application/json, text/plain, */*",
                    "Referer": "https://www.jiosaavn.com/",
                    "Origin": "https://www.jiosaavn.com"
                }
            });

            let pText = await pRes.text();
            pText = pText.replace(/^[^\{]+/, "").replace(/;$/, "");
            try {
                const pData = JSON.parse(pText);
                playlistSongs = pData.songs || [];
            } catch (err) {
                console.error("Playlist parse error:", err);
            }
        }

        res.json({ songs: data, playlists: result, playlistSongs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "server error" });
    }
});

app.post("/playlistData", async (req, res) => {
    const { playlistId } = req.body
    let playlistSongs = [];
    if (playlistId) {
        const playlistAPI = `https://www.jiosaavn.com/api.php?__call=playlist.getDetails&listid=${playlistId}&_format=json&_marker=0`;

        const pRes = await fetch(playlistAPI, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "application/json, text/plain, */*",
                "Referer": "https://www.jiosaavn.com/",
                "Origin": "https://www.jiosaavn.com"
            }
        });

        let pText = await pRes.text();
        pText = pText.replace(/^[^\{]+/, "").replace(/;$/, "");
        try {
            const pData = JSON.parse(pText);
            playlistSongs = pData.songs || [];
        } catch (err) {
            console.error("Playlist parse error:", err);
        }
    }
    res.json({ playlistSongs })
})

app.post("/save", authMiddleware, async (req, res) => {
    const { pname, songList } = req.body;
    const user = req.user
    const playlist = req.user.library.find((pl) => pl.name === pname);
    playlist.songs = songList
    await user.save()
    res.status(200).json({ msg: "Added" })
    // console.log(playlist)
})

// POST /searchFriend
app.post("/searchFriend", async (req, res) => {
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

app.post("/sendFriendRequest", authMiddleware, async (req, res) => {
    const user = req.user
    const { friendId } = req.body
    user.friendRequestsend = user.friendRequestsend.filter(item => item.email != friendId)
    user.friendRequestsend.unshift({ email: friendId, currStatus: 0 })
    await user.save()
    res.json({ msg: "Request Send Successfully" })
    console.log(friendId)
})

app.get('/smart-playlist', async (req, res) => {
    try {
        const userVibe = req.query.vibe;
        if (!userVibe) return res.status(400).json({ message: "Vibe missing" });

        console.log(`\n🧠 AI Creating Playlist for: "${userVibe}"...`);

        // --- 1. AI Prompt (Playlist wala) ---
        const prompt = `
                        You are an expert Music Curator & Trend Spotter. The user wants a playlist for: "${userVibe}".
                        Suggest exactly 15 to 20 songs.

                        ### 🧠 INTELLIGENT LOGIC (Follow this strictly):
                        1. **Trend/Social Media:** If user asks for "Trending", "Insta", "Reels", or "Viral", suggest songs that are currently famous on Instagram/TikTok (Mix of Hindi, English, Regional).
                           - *Example:* "Insta Trending" -> Jamal Kudu, Khalasi, One Love, Mockingbird.

                        2. **Specific Genre:** If user specifies a genre like "Phonk", "K-Pop", "Techno", or "Ghazal", stick STRICTLY to that genre and language.
                           - *Example:* "Gym Phonk" -> Metamorphosis, Murder In My Mind, Override. (NO Bollywood here).

                        3. **Vibe/Mood:** If input is generic like "Party", "Gym", "Drive", provide a **Mix of Hindi (Bollywood) & English (Pop/Rap)** to keep it versatile.
                           - *Example:* "Party" -> Jhoome Jo Pathaan, Levitating, Bijlee Bijlee, Starboy.

                        4. **Language Specific:** If user explicitly says "Hindi" or "English", respect that strictly.

                        ### ⛔ FORMAT RULES:
                        - Return ONLY a comma-separated list of: Song Name - Artist
                        - NO numbering, NO new lines, NO intro text.
                        - JUST THE LIST.

                        Example Output:
                        Metamorphosis - Interworld, Apna Bana Le - Arijit Singh, Starboy - The Weeknd, Jamal Kudu - KGV
                        `;

        const aiResult = await model.generateContent(prompt);
        const aiText = aiResult.response.text();

        // Comma se tod kar Array bana lo
        // Example: ["Channa Mereya - Arijit", "Tum Hi Ho - Arijit", ...]
        const songKeywords = aiText.split(',').map(s => s.trim());

        const searchPromises = songKeywords.map(async (keyword) => {
            try {
                const response = await axios.get(JIOSAAVN_API_URL, { params: { q: keyword } });

                if (response.data.status === "Success" && response.data.data.results.length > 0) {
                    const song = response.data.data.results[0]; // Top result

                    // Best Quality nikalna
                    const bestAudio = song.download_url.find(u => u.quality === "320kbps") || song.download_url[song.download_url.length - 1];
                    const bestImage = song.image.find(i => i.quality === "500x500") || song.image[song.image.length - 1];

                    return {
                        id: song.id,
                        title: song.name,
                        artist: song.subtitle,
                        image_url: bestImage.link,
                        audio_url: bestAudio.link,
                        duration: song.duration
                    };
                }
                return null; // Agar nahi mila
            } catch (err) {
                return null; // Agar error aaya
            }
        });

        // Wait karo jab tak saare gaane search na ho jayein
        const results = await Promise.all(searchPromises);

        // Null hata do (Jo gaane nahi mile unhe filter out karo)
        const validSongs = results.filter(song => song !== null);

        console.log(`✅ Playlist Ready: Found ${validSongs.length} songs`);

        res.json({
            success: true,
            vibe: userVibe,
            songs: validSongs
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// --- NEW ROUTE: Smart Lyrics Fetcher ---
app.post('/lyrics', async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: "Song id required" });
        try {
            const lrcResponse = await axios.get(`http://localhost:3000/get/lyrics?id=${id}&lang=hindi`);

            if (lrcResponse.data) {
                console.log("✅ Lyrics found!");
                // console.log(lrcResponse.data);
                return res.json({
                    success: true,
                    source: "API",
                    lyrics: lrcResponse.data.data.lyrics
                    // synced: lrcResponse.data.syncedLyrics // Ye time-synced wala hai
                });
            }
        } catch (apiError) {
            console.log("⚠️ Lrclib me nahi mila, asking AI...");

            res.json({
                lyrics: "Lyrics not found"
            })
        }
    } catch (error) {
        console.error("Lyrics Error:", error.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.get('/get-ai-eq', async (req, res) => {
    try {
        const { song, artist } = req.query;

        // Validation
        if (!song) {
            return res.status(400).json({ success: false, message: "Song name required" });
        }

        console.log(`\n🎛️ AI Tuning Audio for: "${song}" by "${artist || 'Unknown'}"...`);

        // --- 1. AI Prompt (Updated for Genre + EQ) ---
        const prompt = `
        Act as a Professional Sound Engineer.
        The user is listening to: "${song}" by "${artist}".
        
        Task:
        1. Identify the specific Genre/Vibe (keep it short, max 3 words, e.g., "Bass Heavy", "Acoustic Pop", "Sad Lo-fi").
        2. Generate the best 6-Band Equalizer settings [-12 to +12 dB] for these frequencies: [60Hz, 170Hz, 350Hz, 1kHz, 3kHz, 10kHz].

        CRITICAL OUTPUT RULES:
        1. Return ONLY a valid JSON Object.
        2. Format:
           {
             "genre": "Your Detected Genre",
             "values": [val1, val2, val3, val4, val5, val6]
           }
        3. Do NOT write "Here is the JSON" or use markdown code blocks if possible. Just the raw JSON string.
        `;

        // --- 2. Gemini Call ---
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        console.log(`🤖 AI Suggestion: ${text}`);

        // --- 3. Data Cleaning ---
        // Markdown (```json ... ```) hata kar sirf JSON nikalna
        const cleanText = text.replace(/```json|```/g, '').trim();

        // String ko Object banaya
        const aiData = JSON.parse(cleanText);

        // --- 4. Send Response ---
        res.json({
            success: true,
            genre: aiData.genre,   // Frontend ko Genre milega
            values: aiData.values, // Sliders ke liye numbers
            message: `Tuned for ${song}`
        });

    } catch (error) {
        console.error("🔥 AI EQ Error:", error.message);

        // FALLBACK: Agar AI fail ho jaye ya JSON parse na ho paye
        res.json({
            success: false,
            genre: "Flat Profile",
            values: [0, 0, 0, 0, 0, 0], // Sab zero kar do
            message: "AI Busy, Resetting to Flat."
        });
    }
});

app.get("/search", async (req, res) => {
    const { query, type } = req.query;

    if (!query || !type) {
        return res.status(400).json({ error: "query and type are required" });
    }

    let url = "";
    switch (type) {
        case "song":
            url = `${SAAVN_BASE_URL}/search/songs?q=${query}`;
            break;

        case "songID":
            url = `${SAAVN_BASE_URL}/song?id=${query}`
            break;

        case "artist":
            url = `${SAAVN_BASE_URL}/search/artists?q=${query}`;
            break;
        case "artistID":
            url = `${SAAVN_BASE_URL}/artist?id=${query}`
            break;

        case "album":
            url = `${SAAVN_BASE_URL}/search/albums?q=${query}`;
            break;

        case "albumID":
            url = `${SAAVN_BASE_URL}/album?id=${query}`
            break;

        case "playlist":
            url = `${SAAVN_BASE_URL}/search/playlists?q=${query}`;
            break;

        case "home":
            url = `${SAAVN_BASE_URL}/modules`
            break;

        case "recomended":
            url = `${SAAVN_BASE_URL}/song/recommend?id=${query}`
            break;

        case "lyrics":
            url = `${SAAVN_BASE_URL}/get/lyrics?id=${query}&lang=hindi`
            break;

        default:
            return res.status(400).json({ error: "Invalid search type" });
    }

    try {
        const response = await fetch(url);
        const result = await response.json();
        // console.log(result)

        return res.json({
            type,
            data: result
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Something went wrong" });
    }
});

app.get("/test", (req, res) => {
    res.render("test")
})

app.listen(port, '0.0.0.0', () => {
    console.log(`App is running on port http://localhost:${port}`);
});
