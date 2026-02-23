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

//     // -----------------------------
//     // 1️⃣ Fetch last 200 interactions
//     // -----------------------------
//     const interactions = await Interaction.find({ user: userId })
//       .sort({ createdAt: -1 })
//       .limit(200);

//     const artistScore = {};
//     const songScore = {};
//     const skippedSongs = new Set();

//     // -----------------------------
//     // 2️⃣ Build score using time decay
//     // -----------------------------
//     for (const i of interactions) {

//       if (!i.song) continue;

//       const songId = i.song.songId;
//       const artist = i.song.artistName;

//       const daysOld = (Date.now() - i.createdAt) / 86400000;
//       const decay = Math.exp(-0.05 * daysOld);

//       switch (i.type) {

//         case "complete":
//           songScore[songId] = (songScore[songId] || 0) + 4 * decay;
//           artistScore[artist] = (artistScore[artist] || 0) + 3 * decay;
//           break;

//         case "play":
//           songScore[songId] = (songScore[songId] || 0) + 2 * decay;
//           artistScore[artist] = (artistScore[artist] || 0) + 1 * decay;
//           break;

//         case "like":
//           artistScore[artist] = (artistScore[artist] || 0) + 5 * decay;
//           break;

//         case "skip":
//           skippedSongs.add(songId);
//           break;
//       }
//     }

//     // -----------------------------
//     // 3️⃣ Get Top 2 + Recent Artist
//     // -----------------------------
//     const sortedArtists = Object.entries(artistScore)
//       .sort((a, b) => b[1] - a[1]);

//     const topTwo = sortedArtists.slice(0, 2).map(([a]) => a);

//     const recentValid = interactions.find(
//       i => i.song?.artistName && i.type !== "skip"
//     );

//     const recentArtist = recentValid?.song?.artistName || null;

//     let finalArtists = [...topTwo];

//     if (recentArtist && !finalArtists.includes(recentArtist)) {
//       finalArtists.push(recentArtist);
//     } else {
//       for (let i = 2; i < sortedArtists.length; i++) {
//         const next = sortedArtists[i][0];
//         if (!finalArtists.includes(next)) {
//           finalArtists.push(next);
//           break;
//         }
//       }
//     }

//     // -----------------------------
//     // 4️⃣ Get 2 most recent songs
//     // -----------------------------
//     const recentSongs = interactions
//       .filter(i => i.song && i.type !== "skip")
//       .slice(0, 2)
//       .map(i => i.song.songId);

//     // -----------------------------
//     // 5️⃣ Seed based recommendations
//     // -----------------------------
//     let seedRecommendations = [];

//     for (const songId of recentSongs) {
//       try {
//         const resAPI = await fetch(`${process.env.SAVAN_URL}/song/recommend?id=${songId}`);
//         const data = await resAPI.json();

//         if (Array.isArray(data?.data)) {

//           const selected = data.data.slice(0, 5);

//           const formatted = selected.map(song => ({
//             songId: song.id,
//             title: song.name,
//             artist: song.artist_map?.primary_artists?.map(a => a.name).join(", "),
//             image: song.image?.find(i => i.quality === "500x500")?.link,
//             url: song.download_url?.find(u => u.quality === "320kbps")?.link,
//             duration: song.duration,
//             source: "seed",
//             boost: 1.3
//           }));

//           seedRecommendations.push(...formatted);
//         }

//       } catch (err) {
//         console.error("Seed Error:", err.message);
//       }
//     }

//     // -----------------------------
//     // 6️⃣ Artist expansion seeds
//     // -----------------------------
//     let artistSeedSongIds = [];

//     for (const artistName of finalArtists) {

//       try {
//         const resAPI = await fetch(`${process.env.SAVAN_URL}/search/songs?q=${encodeURIComponent(artistName)}`);
//         const data = await resAPI.json();

//         const songs = data?.data?.results || [];
//         const topTen = songs.slice(0, 10);
//         const shuffled = topTen.sort(() => Math.random() - 0.5);
//         const randomTwo = shuffled.slice(0, 2);

//         artistSeedSongIds.push(...randomTwo.map(s => s.id));

//       } catch (err) {
//         console.error("Artist Seed Error:", err.message);
//       }
//     }

//     // -----------------------------
//     // 7️⃣ Parallel artist recommendations
//     // -----------------------------
//     const artistResults = await Promise.all(
//       artistSeedSongIds.map(async (songId) => {

//         try {
//           const resAPI = await fetch(`${process.env.SAVAN_URL}/song/recommend?id=${songId}`);
//           const data = await resAPI.json();

//           if (!Array.isArray(data?.data)) return [];

//           const shuffled = data.data.slice(0, 10).sort(() => Math.random() - 0.5);
//           const randomTwo = shuffled.slice(0, 2);

//           return randomTwo.map(song => ({
//             songId: song.id,
//             title: song.name,
//             artist: song.artist_map?.primary_artists?.map(a => a.name).join(", "),
//             image: song.image?.find(i => i.quality === "500x500")?.link,
//             url: song.download_url?.find(u => u.quality === "320kbps")?.link,
//             duration: song.duration,
//             source: "artist",
//             boost: 1.15
//           }));

//         } catch {
//           return [];
//         }

//       })
//     );

//     const artistRecommendations = artistResults.flat();

//     // -----------------------------
//     // 8️⃣ Trending fallback (3-5)
//     // -----------------------------
//     let trendingFormatted = [];

//     try {
//       const resAPI = await fetch(`${process.env.SAVAN_URL}/get/trending`);
//       const data = await resAPI.json();

//       const onlySongs = data?.data?.filter(i => i.type === "song") || [];
//       const shuffled = onlySongs.sort(() => Math.random() - 0.5);

//       const count = Math.floor(Math.random() * 3) + 3;
//       const selected = shuffled.slice(0, count);

//       trendingFormatted = selected.map(song => ({
//         songId: song.id,
//         title: song.name,
//         artist: song.artist_map?.primary_artists?.map(a => a.name).join(", "),
//         image: song.image?.find(i => i.quality === "500x500")?.link,
//         url: song.download_url?.find(u => u.quality === "320kbps")?.link,
//         duration: song.duration,
//         source: "trending",
//         boost: 1.1
//       }));

//     } catch (err) {
//       console.error("Trending Error:", err.message);
//     }

//     // -----------------------------
//     // 9️⃣ Combine all candidates
//     // -----------------------------
//     let candidateSongs = [
//       ...seedRecommendations,
//       ...artistRecommendations,
//       ...trendingFormatted
//     ];

//     // Remove duplicates
//     candidateSongs = candidateSongs.filter(
//       (song, index, self) =>
//         index === self.findIndex(s => s.songId === song.songId)
//     );

//     // Remove skipped songs
//     candidateSongs = candidateSongs.filter(
//       song => !skippedSongs.has(song.songId)
//     );

//     // -----------------------------
//     // 🔟 Rank with weighted score
//     // -----------------------------
//     candidateSongs.sort((a, b) => {
//       const scoreA = (songScore[a.songId] || 0) * (a.boost || 1);
//       const scoreB = (songScore[b.songId] || 0) * (b.boost || 1);
//       return scoreB - scoreA;
//     });

//     // Controlled shuffle
//     const topFixed = candidateSongs.slice(0, 6);
//     const rest = candidateSongs.slice(6).sort(() => Math.random() - 0.5);
//     const finalFeed = [...topFixed, ...rest].slice(0, 20);

//     // -----------------------------
//     // Final response
//     // -----------------------------
//     res.json({
//       success: true,
//       reason: finalArtists.length > 0 ? "Hybrid Personalized Mix" : "Trending Mix",
//       songs: finalFeed.map(song => ({
//         id: song.songId,
//         title: song.title,
//         artist: song.artist,
//         image: song.image,
//         url: song.url,
//         duration: song.duration,
//         type: "recommendation"
//       }))
//     });

//   } catch (err) {
//     console.error("Recommendation Error:", err);
//     res.status(500).json({ success: false });
//   }
// });


router.get("/recommendations", authMiddleware, async (req, res) => {
  try {

    const userId = req.user._id;

    // 1️⃣ Fetch last 200 interactions
    const interactions = await Interaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(200);

    const artistScore = {};
    const songScore = {};
    const skippedSongs = new Set();

    // 2️⃣ Build score with decay
    for (const i of interactions) {

      if (!i.song) continue;

      const songId = i.song.songId;
      const artist = i.song.artistName;

      const daysOld = (Date.now() - i.createdAt) / 86400000;
      const decay = Math.exp(-0.05 * daysOld);

      switch (i.type) {
        case "complete":
          songScore[songId] = (songScore[songId] || 0) + 4 * decay;
          artistScore[artist] = (artistScore[artist] || 0) + 3 * decay;
          break;

        case "play":
          songScore[songId] = (songScore[songId] || 0) + 2 * decay;
          artistScore[artist] = (artistScore[artist] || 0) + 1 * decay;
          break;

        case "like":
          artistScore[artist] = (artistScore[artist] || 0) + 5 * decay;
          break;

        case "skip":
          skippedSongs.add(songId);
          break;
      }
    }

    // 3️⃣ Determine Top Artists
    const sortedArtists = Object.entries(artistScore)
      .sort((a, b) => b[1] - a[1])
      .map(([a]) => a);

    const topArtist1 = sortedArtists[0] || null;
    const topArtist2 = sortedArtists[1] || null;

    const recentValid = interactions.find(
      i => i.song?.artistName && i.type !== "skip"
    );

    const recentArtist = recentValid?.song?.artistName || null;

    // 4️⃣ Get 2 most recent songs
    const recentSongs = interactions
      .filter(i => i.song && i.type !== "skip")
      .slice(0, 2)
      .map(i => i.song.songId);

    // ----------------------------
    // BUCKET STRUCTURE
    // ----------------------------

    let bucket = {
      recentSeeds: [],
      recentArtist: [],
      topArtist1: [],
      topArtist2: [],
      trending: []
    };

    // Helper function
    const formatSong = (song, source) => ({
      songId: song.id,
      title: song.name,
      artist: song.artist_map?.primary_artists?.map(a => a.name).join(", "),
      image: song.image?.find(i => i.quality === "500x500")?.link,
      url: song.download_url?.find(u => u.quality === "320kbps")?.link,
      duration: song.duration,
      source
    });

    // ----------------------------
    // 5️⃣ Recent Song Seeds (10)
    // ----------------------------
    for (const id of recentSongs) {

      const r = await fetch(`${process.env.SAVAN_URL}/song/recommend?id=${id}`);
      const d = await r.json();

      if (Array.isArray(d?.data)) {
        const selected = d.data.slice(0, 5);
        bucket.recentSeeds.push(...selected.map(s => formatSong(s, "recentSeed")));
      }
    }

    bucket.recentSeeds = bucket.recentSeeds.slice(0, 10);

    // ----------------------------
    // 6️⃣ Artist Based Buckets
    // ----------------------------
    const fetchArtistSongs = async (artistName, limit) => {

      const r = await fetch(`${process.env.SAVAN_URL}/search/songs?q=${encodeURIComponent(artistName)}`);
      const d = await r.json();

      const songs = d?.data?.results?.slice(0, limit) || [];
      return songs.map(s => formatSong(s, "artist"));
    };

    if (recentArtist)
      bucket.recentArtist = (await fetchArtistSongs(recentArtist, 10)).slice(0, 6);

    if (topArtist1)
      bucket.topArtist1 = (await fetchArtistSongs(topArtist1, 10)).slice(0, 5);

    if (topArtist2)
      bucket.topArtist2 = (await fetchArtistSongs(topArtist2, 10)).slice(0, 4);

    // ----------------------------
    // 7️⃣ Trending Bucket (5)
    // ----------------------------
    try {

      const r = await fetch(`${process.env.SAVAN_URL}/get/trending`);
      const d = await r.json();

      const songs = d?.data?.filter(i => i.type === "song") || [];
      const shuffled = songs.sort(() => Math.random() - 0.5);

      bucket.trending = shuffled.slice(0, 5).map(s => formatSong(s, "trending"));

    } catch (err) {
      console.log("Trending fetch failed");
    }

    // ----------------------------
    // 8️⃣ Merge Buckets (Structured Order)
    // ----------------------------
    let finalFeed = [
      ...bucket.recentSeeds,
      ...bucket.recentArtist,
      ...bucket.topArtist1,
      ...bucket.topArtist2,
      ...bucket.trending
    ];

    // Remove duplicates
    finalFeed = finalFeed.filter(
      (song, index, self) =>
        index === self.findIndex(s => s.songId === song.songId)
    );

    // Remove skipped
    finalFeed = finalFeed.filter(
      song => !skippedSongs.has(song.songId)
    );

    // ----------------------------
    // 9️⃣ Fallback Fill If < 30
    // ----------------------------
    if (finalFeed.length < 30) {

      const r = await fetch(`${process.env.SAVAN_URL}/get/trending`);
      const d = await r.json();
      const extra = d?.data?.filter(i => i.type === "song") || [];

      for (const s of extra) {

        if (finalFeed.length >= 30) break;

        if (!finalFeed.find(f => f.songId === s.id)) {
          finalFeed.push(formatSong(s, "fallback"));
        }
      }
    }

    finalFeed = finalFeed.slice(0, 30);

    // ----------------------------
    // Final Response
    // ----------------------------
    res.json({
      success: true,
      reason: "Structured Hybrid Feed",
      total: finalFeed.length,
      songs: finalFeed.map(song => ({
        id: song.songId,
        title: song.title,
        artist: song.artist,
        image: song.image,
        url: song.url,
        duration: song.duration,
        type: "recommendation"
      }))
    });

  } catch (err) {
    console.error("Recommendation Error:", err);
    res.status(500).json({ success: false });
  }
});


export default router;