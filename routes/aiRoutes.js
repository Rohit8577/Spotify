import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import dotenv from "dotenv";
import authMiddleware from "../middlewares/auth.js"; 
import User from "../models/User.js";

dotenv.config();

const router = express.Router();

// --- Configuration ---
const GEMINI_API_KEY = process.env.googleApi;
const SAAVN_BASE_URL = process.env.SAVAN_URL;
const JIOSAAVN_API_URL = `${SAAVN_BASE_URL}/search/songs`;

// --- Initialize Gemini ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- AI Routes ---

// 1. Smart Playlist Generator (Simple)
router.get('/smart-playlist', async (req, res) => {
    try {
        const userVibe = req.query.vibe;
        if (!userVibe) return res.status(400).json({ message: "Vibe missing" });

        console.log(`\n🧠 AI Creating Playlist for: "${userVibe}"...`);

        const prompt = `
            You are an expert Music Curator & Trend Spotter. The user wants a playlist for: "${userVibe}".
            Suggest exactly 15 to 20 songs.

            ### 🧠 INTELLIGENT LOGIC (Follow this strictly):
            1. **Trend/Social Media:** If user asks for "Trending", "Insta", "Reels", or "Viral", suggest songs that are currently famous on Instagram/TikTok (Mix of Hindi, English, Regional).
            2. **Specific Genre:** If user specifies a genre like "Phonk", "K-Pop", "Techno", or "Ghazal", stick STRICTLY to that genre and language.
            3. **Vibe/Mood:** If input is generic like "Party", "Gym", "Drive", provide a **Mix of Hindi (Bollywood) & English (Pop/Rap)** to keep it versatile.
            4. **Language Specific:** If user explicitly says "Hindi" or "English", respect that strictly.
            5. **Do not repeat same songs multiple times.

            ### ⛔ FORMAT RULES:
            - Return ONLY a comma-separated list of: Song Name - Artist
            - NO numbering, NO new lines, NO intro text.
            - JUST THE LIST.

            Example Output:
            Metamorphosis - Interworld, Apna Bana Le - Arijit Singh, Starboy - The Weeknd, Jamal Kudu - KGV
        `;

        const aiResult = await model.generateContent(prompt);
        const aiText = aiResult.response.text();

        const songKeywords = aiText.split(',').map(s => s.trim());

        const searchPromises = songKeywords.map(async (keyword) => {
            try {
                const response = await axios.get(JIOSAAVN_API_URL, { params: { q: keyword } });

                if (response.data.status === "Success" && response.data.data.results.length > 0) {
                    const song = response.data.data.results[0]; // Top result
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
                return null;
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(searchPromises);
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

// 2. Smart Playlist Generator (Advanced/Mobile)
router.get('/get-smart-playlist', async (req, res) => {
    try {
        const userVibe = req.query.vibe;
        if (!userVibe) return res.status(400).json({ message: "Vibe missing" });

        console.log(`\n🧠 AI Creating Playlist for: "${userVibe}"...`);

        const prompt = `
            You are an expert Music Curator. The user wants a playlist for: "${userVibe}".
            Suggest exactly 30 popular songs.

            ### 🧠 INTELLIGENT LOGIC:
            1. **Trend/Social Media:** If user asks for "Trending", suggest viral Reels/TikTok hits.
            2. **Specific Genre:** If user says "Phonk", "K-Pop", "Ghazal", stick STRICTLY to that.
            3. **Vibe/Mood:** If generic ("Party", "Gym"), mix Hindi (Bollywood) & English (Pop/Rap).
            4. **Language:** Respect "Hindi" or "English" if mentioned.

            ### ⛔ FORMAT RULES:
            - Return ONLY a comma-separated list of: Song Name - Artist
            - NO numbering, NO new lines, NO intro text.
            - JUST THE LIST.

            Example Output:
            Song A - Artist A, Song B - Artist B, Song C - Artist C
        `;

        const aiResult = await model.generateContent(prompt);
        const aiText = aiResult.response.text();
        const songKeywords = aiText.split(',').map(s => s.trim());
        
        console.log(`🤖 AI Suggested ${songKeywords.length} songs. Fetching details...`);

        const searchPromises = songKeywords.map(async (keyword) => {
            try {
                const response = await axios.get(JIOSAAVN_API_URL, { params: { q: keyword } });

                if (response.data.status === "Success" && response.data.data.results.length > 0) {
                    const song = response.data.data.results[0]; 
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
                return null; 
            } catch (err) {
                return null; 
            }
        });

        const results = await Promise.all(searchPromises);
        const validSongs = results.filter(song => song !== null);

        console.log(`✅ Playlist Ready: Sent ${validSongs.length} songs`);

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

// 3. AI Equalizer (EQ) Tuning
router.get('/get-ai-eq', async (req, res) => {
    try {
        const { song, artist } = req.query;

        if (!song) {
            return res.status(400).json({ success: false, message: "Song name required" });
        }

        console.log(`\n🎛️ AI Tuning Audio for: "${song}" by "${artist || 'Unknown'}"...`);

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

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        console.log(`🤖 AI Suggestion: ${text}`);

        const cleanText = text.replace(/```json|```/g, '').trim();
        const aiData = JSON.parse(cleanText);

        res.json({
            success: true,
            genre: aiData.genre,
            values: aiData.values,
            message: `Tuned for ${song}`
        });

    } catch (error) {
        console.error("🔥 AI EQ Error:", error.message);
        res.json({
            success: false,
            genre: "Flat Profile",
            values: [0, 0, 0, 0, 0, 0],
            message: "AI Busy, Resetting to Flat."
        });
    }
});

// routes/aiRoutes.js

router.get('/recommendations', authMiddleware, async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // --- 📊 STEP 1: AI Data Bucketing (Text Context) ---
        // (Yeh waisa hi rakhenge kyunki ye AI ko "Context" deta hai)
        const interactionLikes = user.interactions
            .filter(i => ['like', 'search_play'].includes(i.type))
            .map(i => `${i.metadata} ${i.artist ? `(${i.artist})` : ''}`);
        
        const legacyLikes = user.favorite.slice(0, 5).map(s => `${s.songName} - ${s.artist}`);
        const superLoved = [...new Set([...interactionLikes, ...legacyLikes])].slice(0, 15);
        
        const highEngagement = user.interactions
            .filter(i => ['complete', 'view_artist', 'view_album'].includes(i.type))
            .map(i => `${i.metadata} ${i.artist ? `(${i.artist})` : ''}`).slice(0, 10);
            
        const curiosity = user.interactions
            .filter(i => ['play', 'search', 'playlist_view'].includes(i.type))
            .map(i => `${i.metadata} ${i.artist ? `(${i.artist})` : ''}`).slice(0, 10);
            
        const skipped = user.interactions
            .filter(i => i.type === 'skip')
            .map(i => `${i.metadata}`).slice(0, 10);

        if (superLoved.length === 0 && curiosity.length === 0) {
            return res.json({ success: true, message: "No Data", type: "Trending", songs: [] });
        }

        // --- 🤖 STEP 2: AI Generation ---
        const prompt = `
            Act as an elite AI Music Curator. Create a "Discovery Mix".
            CORE TASTE: ${superLoved.join(", ")}
            HIGH INTEREST: ${highEngagement.join(", ")}
            CURIOSITY: ${curiosity.join(", ")}
            NEGATIVE: ${skipped.join(", ")}
            
            Task: Suggest 8 NEW songs (Hidden Gems + Hits).
            Output: Comma-separated list ONLY (Song - Artist).
        `;

        const aiPromise = model.generateContent(prompt);
        
        // --- ⚡ STEP 2.5: Algorithmic Recommendations (Improved) ---
        let apiRecommendations = [];

        // 🔥 UPGRADE: Seed Pool (Favorites + Recently Played)
        // Hum sirf likes nahi, user ki listening history bhi use karenge
        const allSeeds = [
            ...user.favorite, 
            ...user.recently
        ];

        // Valid songId hona zaroori hai
        const validSeeds = allSeeds.filter(s => s.songId);

        if (validSeeds.length > 0) {
            // 🔥 RANDOMNESS: Har baar alag seed pick karo
            const randomSeed = validSeeds[Math.floor(Math.random() * validSeeds.length)];
            
            console.log(`📡 Fetching Algo Recos based on: "${randomSeed.songName}" (Source: ${user.favorite.includes(randomSeed) ? 'Liked' : 'Recent'})`);

            try {
                const apiUrl = `${process.env.SAVAN_URL}/song/recommend?id=${randomSeed.songId}`;
                const apiRes = await axios.get(apiUrl);
                
                if (apiRes.data) {
                     const rawList = Array.isArray(apiRes.data) ? apiRes.data : (apiRes.data.data || []);
                     
                     // 🔥 INCREASED LIMIT: Ab 5 nahi, 10 songs uthayenge API se
                     apiRecommendations = rawList.slice(0, 10).map(song => {
                         const bestAudio = song.download_url.find(u => u.quality === "320kbps") || song.download_url[song.download_url.length - 1];
                         const bestImage = song.image.find(i => i.quality === "500x500") || song.image[song.image.length - 1];
                         return {
                             id: song.id,
                             title: song.name,
                             artist: song.subtitle || song.artist_map?.artists[0]?.name,
                             image_url: bestImage.link,
                             audio_url: bestAudio.link,
                             duration: song.duration,
                             source: "Algo" 
                         };
                     });

                     console.log("\n🎵 --- API SUGGESTIONS (Based on Algo) ---");
                     apiRecommendations.forEach(s => console.log(`   🔹 ${s.title} - ${s.artist}`));
                     console.log("----------------------------------------\n");
                }
            } catch (e) {
                console.error("⚠️ API Reco Failed:", e.message);
            }
        } else {
            console.log("⚠️ No Seed Data (Likes/History) found for API.");
        }

        // --- 🔍 STEP 3: Process AI Results ---
        const aiResult = await aiPromise; 
        const aiText = aiResult.response.text();
        const songKeywords = aiText.split(',').map(s => s.trim());

        const searchPromises = songKeywords.map(async (keyword) => {
            try {
                const response = await axios.get(JIOSAAVN_API_URL, { params: { q: keyword } });
                if (response.data.status === "Success" && response.data.data.results.length > 0) {
                    const song = response.data.data.results[0];
                    const bestAudio = song.download_url.find(u => u.quality === "320kbps") || song.download_url[song.download_url.length - 1];
                    const bestImage = song.image.find(i => i.quality === "500x500") || song.image[song.image.length - 1];
                    return {
                        id: song.id,
                        title: song.name,
                        artist: song.subtitle,
                        image_url: bestImage.link,
                        audio_url: bestAudio.link,
                        duration: song.duration,
                        source: "AI" 
                    };
                }
                return null;
            } catch (err) { return null; }
        });

        const aiSongs = await Promise.all(searchPromises);
        const validAiSongs = aiSongs.filter(s => s !== null);

        // --- 🔄 STEP 4: MERGE & SHUFFLE ---
        // Ab mix balance better hoga: AI (Concept) + API (Similar Sound)
        let finalMix = [...validAiSongs, ...apiRecommendations];
        
        finalMix = finalMix.filter((song, index, self) => 
            index === self.findIndex((t) => (t.id === song.id))
        );

        finalMix = finalMix.sort(() => Math.random() - 0.5);

        console.log(`✅ Final Mix: ${finalMix.length} Songs (${validAiSongs.length} AI + ${apiRecommendations.length} API)`);

        res.json({
            success: true,
            type: "Made For You",
            songs: finalMix
        });

    } catch (error) {
        console.error("Recommendation Error:", error);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

export default router;