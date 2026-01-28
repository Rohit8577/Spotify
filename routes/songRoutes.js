import express from "express";
import authMiddleware from "../middlewares/auth.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { readdir } from "fs/promises";
import path from "path";
import dotenv from "dotenv"
dotenv.config();
const SAAVN_BASE_URL = process.env.SAVAN_URL

const router = express.Router();

// Init Gemini
const genAI = new GoogleGenerativeAI(process.env.googleApi);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- Search & APIs ---
router.get("/search", async (req, res) => {
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
            url = `${SAAVN_BASE_URL}/get/lyrics?id=${query}`
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

// --- Local Songs ---
router.get("/get-songs", async (req, res) => {
    try {
        const songsPath = path.join(process.cwd(), "public/songs");
        const files = await readdir(songsPath);
        res.json(files);
    } catch (error) {
        console.error("Error reading songs folder:", error);
        res.status(500).json({ error: "Failed to load songs" });
    }
});

// --- Favorites & History ---
router.get("/get-favorite", authMiddleware, (req, res) => {
    const user = req.user
    res.json({ arr: user.favorite })
});

router.post("/favorite", authMiddleware, async (req, res) => {
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
});

router.post("/updateRecently", authMiddleware, async (req, res) => {
    const { songUrl, image, songName, artist, len, songId } = req.body;
    const user = req.user;

    // Remove the song if it already exists to avoid duplicates
    user.recently = user.recently.filter(song => song.songId != songId);

    // Add new song to the front
    user.recently.unshift({ songUrl, image, songName, artist, len, songId });

    await user.save();
    res.json({ msg: "Recently Updated" });
});

router.get("/updateRecently", authMiddleware, (req, res) => {
    const user = req.user
    res.json({ arr: user.recently })
});

// Flutter History
// Import User model at the top if not already imported
// import User from "../models/User.js"; 

router.post('/api/update-recently-email', authMiddleware, async (req, res) => {
    try {
        const { email, songUrl, image, songName, artist, len, songId } = req.body;

        if (!email) return res.status(400).json({ error: "Email required" });
        if (!songId) return res.status(400).json({ error: "Song ID required" });

        // Naya Song Object taiyar karo
        const newSong = { 
            songUrl, image, songName, artist, len, songId 
        };

        const email_1 = req.user.email;

        // 🔥 STEP 1: Agar ye gaana pehle se list me hai, toh usse REMOVE karo ($pull)
        // Taaki duplicates na banne aur hum usse upar move kar sakein
        await User.updateOne(
            { email: email_1 },
            { $pull: { recently: { songId: songId } } }
        );

        // 🔥 STEP 2: Naya gaana TOP pe add karo ($push + $position: 0)
        // Aur list ko 20 tak limit karo ($slice: 20)
        await User.updateOne(
            { email: email_1 },
            { 
                $push: { 
                    recently: { 
                        $each: [newSong], 
                        $position: 0, 
                        $slice: 20 
                    } 
                } 
            }
        );

        // console.log(`✅ History Updated for ${email}: ${songName}`);
        res.json({ success: true, msg: "History Updated" });

    } catch (e) {
        console.error("🔥 Error in /api/update-recently-email:", e);
        // User ko error mat dikhao, bas server pe log karo. Client side pe ignore ho jayega.
        res.status(200).json({ success: false, msg: "Error ignored" }); 
    }
});

export default router;