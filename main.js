import express from "express";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken"; // Used for JWT
import cookieParser from "cookie-parser"; // Used to parse cookies
// import session from "express-session"; // <-- This is now removed
import { readdir } from "fs/promises";
import dotenv from "dotenv"
dotenv.config();
import passport from "passport";
import session from "express-session";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Resend } from "resend";
import nodemailer from "nodemailer"
console.log(process.env)
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
    }]
});
const User = new mongoose.model("user", usersc);

// --- Middlewares ---
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: 'someSecret',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


// --- NEW: JWT Authentication Middleware ---
const authMiddleware = async (req, res, next) => {
    const token = req.cookies.token; // Get the token from the 'token' cookie

    if (!token) {
        // If no token exists, the user is not authorized
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

//Google Signup section

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



// --- Public Routes (No authentication required) ---

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
app.get("/login", (req, res) => res.render("spotify_login"));
app.get("/download", (req, res) => res.render("download"));
app.get('/signup', (req, res) => res.render("spotify_signup"));
app.post("/pass", (req, res) => {
    const { email } = req.body;  // <-- yahan se milega
    res.render("signup_pass", { email });
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

    res.status(201).json({ message: "Signup successful" });
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

    res.status(200).json({ message: "Login successful" });
});

app.get("/logout", (req, res) => {
    // To log out, just clear the cookie containing the token
    res.clearCookie('token');
    res.redirect("/");
});


// --- Protected Routes (Require authentication) ---
// We apply our `authMiddleware` to all routes that need a logged-in user.

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


// --- Other Public Routes ---
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
    if (user.recently.length > 10) {
        user.recently = user.recently.slice(0, 10);
    }

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
                pass: "izge thgs blkt rwoa",         // jo popup me mila tha
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
        const response = await fetch(apiURL1, {
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

app.post("/playlistData", async(req, res) => {
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
        res.json({playlistSongs})
})

app.post("/save",authMiddleware ,async(req,res)=>{
    const { pname,songList } = req.body;
    const user = req.user
    const playlist = req.user.library.find((pl) => pl.name === pname);
    playlist.songs = songList
    await user.save()
    res.status(200).json({msg:"Added"})
    // console.log(playlist)
})


app.get("/test", (req, res) => {
    res.render("profile")
})

// --- Start Server ---
app.listen(port, '0.0.0.0', () => {
    console.log(`App is running on port ${port}`);
});
