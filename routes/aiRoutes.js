import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import dotenv from "dotenv";
import authMiddleware from "../middlewares/auth.js";
import User from "../models/User.js";
import Interaction from "../models/Interactions.js"

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


// router.get("/recommendations", authMiddleware, async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // 1️⃣ FETCH INTERACTIONS
//     const interactions = await Interaction.find({ user: userId })
//       .sort({ createdAt: -1 })
//       .limit(200);

//     const artistScore = {};
//     const songScore = {};
//     const skippedSongs = new Set();
//     const skippedArtists = {};

//     for (const i of interactions) {
//       if (!i.song) continue;

//       const songId = i.song.songId;
//       const artist = i.song.artistName;

//       const daysOld = (Date.now() - i.createdAt) / 86400000;
//       const decay = Math.exp(-0.05 * daysOld);

//       let weight = 0;

//       switch (i.type) {
//         case "complete": weight = 4; break;
//         case "play": weight = 2; break;
//         case "like": weight = 5; break;
//         case "skip":
//           skippedSongs.add(songId);
//           skippedArtists[artist] = (skippedArtists[artist] || 0) + 2 * decay;
//           continue;
//       }

//       // Artist score
//       artistScore[artist] = (artistScore[artist] || 0) + weight * decay;

//       // Song score (NEW 🔥)
//       songScore[songId] = (songScore[songId] || 0) + weight * decay;
//     }

//     // 2️⃣ BUILD TASTE PROFILE
//     const topArtistsList = Object.entries(artistScore)
//       .sort((a, b) => b[1] - a[1])
//       .slice(0, 8)
//       .map(([name]) => name);

//     const recentHistory = interactions
//       .filter((i) => i.song && i.type !== "skip")
//       .slice(0, 10)
//       .map((i) => `${i.song.songName} by ${i.song.artistName}`);

//     const tasteProfile = {
//       favoriteArtists: topArtistsList,
//       recentlyVibingTo: recentHistory,
//       avoidArtists: Object.keys(skippedArtists).slice(0, 5)
//     };

//     // ----------------------------
//     // 🤖 AI RECOMMENDATION
//     // ----------------------------
//     let aiTracks = [];
//     let aiVibe = "Fresh mix based on trending hits";

//     try {
//       if (topArtistsList.length > 0) {
//         const aiPrompt = `
//               You are a world-class AI Music Recommendation DJ.
//               Your job is to deeply analyze the user's taste and generate HIGHLY ACCURATE, PERSONALIZED song recommendations.

//               🎧 USER TASTE PROFILE:
//               ${JSON.stringify(tasteProfile)}

//               ---

//               🎯 INSTRUCTIONS:
//               1. Recommend EXACTLY 15 songs.
//               2. Distribution:
//               - 40% songs from user's favorite artists
//               - 40% songs from similar artists (same vibe/genre)
//               - 20% discovery songs (new but highly relevant)
//               3. Strictly AVOID:
//               - Any artist listed in avoidArtists
//               - Songs that are overly mainstream unless they strongly match taste
//               4. Match user's taste based on:
//               - Mood (sad, chill, hype, romantic, etc.)
//               - Genre patterns
//               - Energy level (lofi vs energetic)
//               - Recency (prefer modern songs unless user likes old ones)
//               5. DO NOT repeat:
//               - Same song
//               - Same artist more than 2 times
//               6. Prioritize songs similar to recentlyVibingTo.
//               7. Songs must be REAL and POPULAR enough to be searchable.

//               ---

//               💡 OUTPUT RULES:
//               - Return ONLY valid JSON
//               - NO markdown, NO explanation
//               - Keep it clean and parseable

//               FORMAT:
//               {
//                 "vibeCheck": "A short Gen Z style line describing user's vibe",
//                 "tracks": [
//                   { "title": "Song Name", "artist": "Artist Name" }
//                 ]
//               }
//               `;

//         // 🔥 USE THE PROPER SDK INSTEAD OF DIRECT FETCH
//         // Defining model here specifically to use 2.0-flash like your fetch URL did
//         const recModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

//         const aiResult = await recModel.generateContent({
//           contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
//           generationConfig: { 
//             temperature: 0.5 
//           }
//         });

//         // SDK se direct text extract karna easy hai
//         const raw = aiResult.response.text();
//         console.log("Raw AI Output:", raw);

//         if (raw) {
//           // Extra safety: Removing markdown JSON blocks if AI still sends them
//           const cleaned = raw.replace(/```json|```/gi, "").trim();
//           const parsed = JSON.parse(cleaned);

//           aiTracks = parsed.tracks || [];
//           aiVibe = parsed.vibeCheck || aiVibe;

//           console.log("Parsed Tracks:", aiTracks);
//         }
//       }
//     } catch (e) {
//       console.log("AI Recommendation failed bro 💀:", e.message);
//     }

//     // ----------------------------
//     // 🎵 SAAVN FETCH
//     // ----------------------------
//     const formatSong = (song, source) => ({
//       id: song.id,
//       title: song.name || song.title,
//       artist:
//         song.artist_map?.primary_artists?.map(a => a.name).join(", ") ||
//         song.primaryArtists,
//       image:
//         song.image?.find(i => i.quality === "500x500")?.link ||
//         song.image?.[song.image.length - 1]?.link,
//       url:
//         song.download_url?.find(u => u.quality === "320kbps")?.link ||
//         song.downloadUrl?.[song.downloadUrl.length - 1]?.link,
//       duration: song.duration,
//       type: source
//     });

//     let finalFeed = [];
//     const artistCount = {};

//     // 🔍 AI SONG FETCH WITH VALIDATION (SEQUENTIAL - RATE LIMIT SAFE 🛡️)
//     if (aiTracks.length > 0) {
//       finalFeed = []; 

//       for (const t of aiTracks) {
//         try {
//           const mainArtist = t.artist.split(',')[0].trim(); 
//           const cleanTitle = t.title.replace(/[-_]/g, ' ').replace(/\(.*?\)/g, '').trim();

//           let query = encodeURIComponent(`${cleanTitle} ${mainArtist}`);
//           let r = await fetch(`${process.env.SAVAN_URL}/search/songs?q=${query}`);

//           let d = await r.json();

//           let results = d?.data?.results || [];

//           if (results.length === 0) {
//             console.log(`⚠️ Artist ke saath fail hua: "${t.title}". Ab sirf title try kar rahe hain...`);
//             const fallbackQuery = encodeURIComponent(cleanTitle);
//             r = await fetch(`${process.env.SAVAN_URL}/search/songs?q=${fallbackQuery}`);
//             d = await r.json();
//             results = d?.data?.results || [];
//           }

//           if (results.length === 0) {
//              console.log(`❌ Saavn pe bilkul nahi mila bhai: ${t.title}`);
//              continue; 
//           }

//           const match = results[0]; 

//           // 🔥 THE FIX: Agar Saavn primaryArtists na de, toh apna AI wala artist use kar lo
//           const artistName = match.primaryArtists || match.subtitle || mainArtist;

//           // Skip rules (WITH LOGS NOW 👀)
//           if (skippedSongs.has(match.id)) {
//             console.log(`⏭️ Skipped (Disliked previously): ${t.title}`);
//             continue;
//           }
//           if ((artistCount[artistName] || 0) >= 2) {
//             console.log(`⏭️ Skipped (Artist Limit Hit for ${artistName}): ${t.title}`);
//             continue;
//           }

//           artistCount[artistName] = (artistCount[artistName] || 0) + 1;

//           console.log(`✅ Match Mil Gaya: ${match.name}`);
//           finalFeed.push(formatSong(match, "ai"));

//           await new Promise(resolve => setTimeout(resolve, 300));

//         } catch (e) {
//           console.log(`⚠️ Fetch error for ${t.title}:`, e.message);
//         }
//       }
//     }
//     // ----------------------------
//     // 🎲 EXPLORATION (NEW 🔥)
//     // ----------------------------
//     try {
//       console.log(`\n🔥 Adding Trending hits... Current AI tracks: ${finalFeed.length}`);

//       const r = await fetch(`${process.env.SAVAN_URL}/get/trending`);
//       const d = await r.json();

//       // Sirf gaane filter karo (Albums/Playlists ko ignore maro)
//       const trendingSongs = d?.data?.filter(i => i.type === "song" || i.type === "track") || [];

//       for (const s of trendingSongs) {
//         // Target: Total 30 gaane (AI + Trending milake)
//         if (finalFeed.length >= 30) {
//           break; 
//         }

//         // Duplicate Check: Agar AI ne pehle hi ye gaana de diya hai, toh dobara mat daalo
//         if (!finalFeed.find(f => f.id === s.id)) {
//           finalFeed.push(formatSong(s, "trending"));
//         }
//       }

//       console.log(`✅ Final Playlist Ready: ${finalFeed.length} songs locked in!`);

//     } catch (e) {
//       console.log("❌ Trending fetch hag diya:", e.message);
//     }

//     // ----------------------------
//     // 🧹 FINAL CLEANUP & SHUFFLE
//     // ----------------------------
//     // Array se koi bhi aakhri bache huye duplicates uda do
//     finalFeed = finalFeed.filter(
//       (song, i, arr) => i === arr.findIndex(s => s.id === song.id)
//     );

//     res.json({
//       success: true,
//       aiVibe,
//       total: finalFeed.length, // Ab ye humesha ~30 aayega
//       songs: finalFeed
//     });

//   } catch (err) {
//     console.error("Recommendation Error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// });



// ════════════════════════════════════════════════════════════════════════════
// 📦  RECOMMENDATION CACHE
// ════════════════════════════════════════════════════════════════════════════
//
// Structure stored per userId:
//   { songs, aiVibe, total, cachedAt, revalidatingAt }
//
// STRATEGY: Stale-While-Revalidate with:
//   • TTL: 30 minutes  — serve cache instantly, refresh in background after TTL
//   • Revalidation lock: Only one background refresh per user at a time
//   • Server-restart safe: first request rebuilds automatically
//
const CACHE_TTL_MS        = 30 * 60 * 1000; // 30 minutes
const recsCache           = new Map();       // userId → CacheEntry
const revalidatingUsers   = new Set();       // prevents concurrent background rebuilds

function getCacheEntry(userId) {
  return recsCache.get(userId) || null;
}

function isCacheStale(entry) {
  return !entry || (Date.now() - entry.cachedAt) > CACHE_TTL_MS;
}

function setCacheEntry(userId, data) {
  recsCache.set(userId, {
    ...data,
    cachedAt: Date.now()
  });
}

// ════════════════════════════════════════════════════════════════════════════
// 🎵  SONG FORMATTER  (handles both Saavn search results & trending formats)
// ════════════════════════════════════════════════════════════════════════════
function formatSong(song, source) {
  // Image: search results use `image` array; trending uses `image` string
  let image = "";
  if (Array.isArray(song.image)) {
    image =
      song.image.find(i => i.quality === "500x500" || i.quality === "500x500px")?.link ||
      song.image.find(i => i.quality === "150x150")?.link ||
      song.image[song.image.length - 1]?.link || "";
  } else if (typeof song.image === "string") {
    image = song.image;
  }

  // URL: search results use `download_url`; some trending use `downloadUrl`
  let url = "";
  const urlArr = song.download_url || song.downloadUrl;
  if (Array.isArray(urlArr)) {
    url =
      urlArr.find(u => u.quality === "320kbps")?.link ||
      urlArr.find(u => u.quality === "160kbps")?.link ||
      urlArr[urlArr.length - 1]?.link || "";
  }

  // Artist: prefer the structured map, fall back to plain string fields
  const artist =
    song.artist_map?.artists?.map(a => a.name).join(", ") ||
    song.primaryArtists ||
    song.subtitle ||
    "Unknown";

  return {
    id:       song.id,
    title:    song.name || song.title || "",
    artist,
    image,
    url,
    duration: Number(song.duration) || 0,
    type:     source
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 🛠️  GENERATE FRESH RECOMMENDATIONS
// ════════════════════════════════════════════════════════════════════════════
async function generateFreshRecommendations(userId) {

  // ── 1. FETCH INTERACTIONS ──────────────────────────────────────────────
  const interactions = await Interaction.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const artistScore   = {};
  const songScore     = {};
  const skippedSongs  = new Set();
  const skippedArtists = {};

  for (const i of interactions) {
    if (!i.song) continue;
    const songId = i.song.songId;
    const artist = i.song.artistName;
    const daysOld = (Date.now() - new Date(i.createdAt).getTime()) / 86_400_000;
    const decay   = Math.exp(-0.05 * daysOld);
    let weight    = 0;

    switch (i.type) {
      case "complete": weight = 4; break;
      case "play":     weight = 2; break;
      case "like":     weight = 5; break;
      case "skip":
        skippedSongs.add(songId);
        skippedArtists[artist] = (skippedArtists[artist] || 0) + 2 * decay;
        continue;
      default: continue;
    }

    artistScore[artist] = (artistScore[artist] || 0) + weight * decay;
    songScore[songId]   = (songScore[songId]   || 0) + weight * decay;
  }

  // ── 2. BUILD TASTE PROFILE ─────────────────────────────────────────────
  const topArtistsList = Object.entries(artistScore)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name);

  const recentHistory = interactions
    .filter(i => i.song && i.type !== "skip")
    .slice(0, 10)
    .map(i => `${i.song.songName} by ${i.song.artistName}`);

  const tasteProfile = {
    favoriteArtists:  topArtistsList,
    recentlyVibingTo: recentHistory,
    avoidArtists:     Object.keys(skippedArtists).slice(0, 5)
  };

  const hasHistory = topArtistsList.length > 0;

  // ── 3. AI TRACK SUGGESTIONS ────────────────────────────────────────────
  let aiTracks = [];
  let aiVibe   = "Fresh mix based on trending hits";

  try {
    const aiPrompt = hasHistory
      // ── Personalised prompt ──────────────────────────────────────────
      ? `You are a world-class AI Music Recommendation DJ.
Deeply analyse the user's taste profile and return HIGHLY PERSONALISED song recommendations.

🎧 USER TASTE PROFILE:
${JSON.stringify(tasteProfile, null, 2)}

🎯 INSTRUCTIONS:
1. Recommend EXACTLY 15 songs.
2. Distribution:
   - 40% from the user's favorite artists
   - 40% from similar artists (same vibe/genre/era)
   - 20% discovery (new but relevant)
3. Strictly AVOID:
   - Artists listed in avoidArtists
   - Overly mainstream songs unless they strongly match the taste
4. Match based on: Mood · Genre · Energy · Language
5. Same artist MAX 2 times.
6. Prioritise songs similar to recentlyVibingTo.
7. Only real, popular, searchable songs.

💡 OUTPUT — return ONLY valid JSON, no markdown:
{
  "vibeCheck": "Short Gen-Z style vibe line",
  "tracks": [
    { "title": "Song Name", "artist": "Artist Name" }
  ]
}`
      // ── Cold-start prompt (new user, no history) ─────────────────────
      : `You are an expert Music Curator.
The user is brand new with no listening history. Give them a great starter playlist.
Recommend EXACTLY 15 popular, diverse songs from 2022-2025 across Hindi Bollywood and English Pop/Hip-hop.
Same artist max 2 times.

💡 OUTPUT — return ONLY valid JSON, no markdown:
{
  "vibeCheck": "Short Gen-Z style vibe line for a new user",
  "tracks": [
    { "title": "Song Name", "artist": "Artist Name" }
  ]
}`;

    const recModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const aiResult = await recModel.generateContent({
      contents: [{ role: "user", parts: [{ text: aiPrompt }] }],
      generationConfig: { temperature: 0.55 }
    });

    const raw = aiResult.response.text();
    if (raw) {
      const cleaned = raw.replace(/```json|```/gi, "").trim();
      const parsed  = JSON.parse(cleaned);
      aiTracks  = parsed.tracks   || [];
      aiVibe    = parsed.vibeCheck || aiVibe;
      console.log(`🤖 AI suggested ${aiTracks.length} tracks`);
    }
  } catch (e) {
    console.error("AI Recommendation failed:", e.message);
  }

  // ── 4. FETCH SONGS FROM SAAVN (parallel with concurrency cap) ─────────
  // BUG FIX: Old code used sequential 300ms delays → 4-5 second minimum
  // FIX: Parallel with a concurrency limiter (max 4 at once) for speed +
  //      rate-limit safety.

  // Artist-count check uses ONLY the FIRST artist to avoid false misses
  // (e.g. "Arijit Singh, Shreya Ghoshal" counted as a unique string before)
  const artistCount = {};

  async function fetchOneTrack(t) {
    try {
      const mainArtist = t.artist.split(",")[0].trim();
      const cleanTitle = t.title.replace(/[-_]/g, " ").replace(/\(.*?\)/g, "").trim();

      // Primary query: title + artist
      let query   = encodeURIComponent(`${cleanTitle} ${mainArtist}`);
      let r       = await fetch(`${process.env.SAVAN_URL}/search/songs?q=${query}`);
      let d       = await r.json();
      let results = d?.data?.results || [];

      // Fallback: title only
      if (results.length === 0) {
        query   = encodeURIComponent(cleanTitle);
        r       = await fetch(`${process.env.SAVAN_URL}/search/songs?q=${query}`);
        d       = await r.json();
        results = d?.data?.results || [];
      }

      if (results.length === 0) {
        console.log(`❌ Not found on Saavn: ${t.title}`);
        return null;
      }

      const match       = results[0];
      // FIX: Use FIRST artist from the string for the per-artist limit check
      const firstArtist = (match.primaryArtists || match.subtitle || mainArtist)
        .split(",")[0].trim();

      if (skippedSongs.has(match.id)) {
        console.log(`⏭️ Skipped (previously disliked): ${t.title}`);
        return null;
      }
      if ((artistCount[firstArtist] || 0) >= 2) {
        console.log(`⏭️ Artist limit hit (${firstArtist}): ${t.title}`);
        return null;
      }

      artistCount[firstArtist] = (artistCount[firstArtist] || 0) + 1;
      console.log(`✅ Found: ${match.name}`);
      return formatSong(match, "ai");

    } catch (e) {
      console.error(`⚠️ Fetch error for "${t.title}":`, e.message);
      return null;
    }
  }

  // Concurrency limiter: process max CONCURRENCY tracks in parallel at once
  const CONCURRENCY = 4;
  let finalFeed     = [];

  for (let i = 0; i < aiTracks.length; i += CONCURRENCY) {
    const batch   = aiTracks.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(t => fetchOneTrack(t)));
    finalFeed.push(...results.filter(Boolean));
  }

  // ── 5. PAD WITH TRENDING if we got fewer than 20 AI songs ─────────────
  try {
    const r            = await fetch(`${process.env.SAVAN_URL}/get/trending`);
    const d            = await r.json();
    const trendingSongs = d?.data?.filter(i => i.type === "song" || i.type === "track") || [];

    for (const s of trendingSongs) {
      if (finalFeed.length >= 30) break;
      if (!finalFeed.find(f => f.id === s.id)) {
        finalFeed.push(formatSong(s, "trending"));
      }
    }
  } catch (e) {
    console.error("Trending fetch failed:", e.message);
  }

  // ── 6. DEDUPLICATE & RETURN ────────────────────────────────────────────
  finalFeed = finalFeed.filter(
    (song, idx, arr) => idx === arr.findIndex(s => s.id === song.id)
  );

  console.log(`✅ Final feed: ${finalFeed.length} songs for userId=${userId}`);
  return { aiVibe, total: finalFeed.length, songs: finalFeed };
}


// ════════════════════════════════════════════════════════════════════════════
// 🚀  /recommendations  ROUTE
// ════════════════════════════════════════════════════════════════════════════
router.get("/recommendations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const entry  = getCacheEntry(userId);

    // ── CACHE HIT: fresh enough (< TTL) ───────────────────────────────
    if (entry && !isCacheStale(entry)) {
      console.log(`⚡ Cache hit (${Math.round((Date.now() - entry.cachedAt) / 1000)}s old) for ${userId}`);
      return res.json({ success: true, fromCache: true, ...entry });
    }

    // ── CACHE HIT: stale — serve stale, revalidate in background ──────
    if (entry && isCacheStale(entry)) {
      console.log(`⚡ Stale cache — serving instantly, refreshing in background for ${userId}`);
      res.json({ success: true, fromCache: true, stale: true, ...entry });

      // One background refresh per user at a time (prevents hammering Gemini)
      if (!revalidatingUsers.has(userId)) {
        revalidatingUsers.add(userId);
        generateFreshRecommendations(userId)
          .then(newData => {
            setCacheEntry(userId, newData);
            console.log(`🔄 Background refresh done for ${userId}`);
          })
          .catch(err => console.error(`Background refresh failed for ${userId}:`, err))
          .finally(() => revalidatingUsers.delete(userId));
      }
      return;
    }

    // ── CACHE MISS: first request or after server restart ─────────────
    console.log(`🐌 Cache miss — generating fresh recommendations for ${userId}`);
    const newData = await generateFreshRecommendations(userId);
    setCacheEntry(userId, newData);
    return res.json({ success: true, fromCache: false, ...newData });

  } catch (err) {
    console.error("Recommendation route error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
