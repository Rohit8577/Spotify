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

//     // 1️⃣ Fetch last 200 interactions
//     const interactions = await Interaction.find({ user: userId })
//       .sort({ createdAt: -1 })
//       .limit(200);

//     const artistScore = {};
//     const songScore = {};
//     const skippedSongs = new Set();
//     const skippedArtists = {};

//     // 2️⃣ Build score with decay
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
//           skippedArtists[artist] = (skippedArtists[artist] || 0) + 1;
//           break;
//       }
//     }

//     // 3️⃣ Determine Top Artists
//     const sortedArtists = Object.entries(artistScore)
//       .sort((a, b) => b[1] - a[1])
//       .map(([a]) => a);

//     const topArtist1 = sortedArtists[0] || null;
//     const topArtist2 = sortedArtists[1] || null;

//     const recentValid = interactions.find(
//       (i) => i.song?.artistName && i.type !== "skip"
//     );
//     const recentArtist = recentValid?.song?.artistName || null;

//     // 4️⃣ Get 2 most recent songs
//     const recentSongs = interactions
//       .filter((i) => i.song && i.type !== "skip")
//       .slice(0, 2)
//       .map((i) => i.song.songId);

//     // ----------------------------
//     // 🤖 AI TASTE ANALYSIS
//     // ----------------------------

//     let aiDecision = {
//       strategyNote: "default",
//       boostArtists: [],
//       avoidArtists: [],
//       diversityMode: false,
//       artistWeightOverride: {},
//     };

//     try {
//       // Build a taste profile summary to send to Claude
//       const topArtistsList = Object.entries(artistScore)
//         .sort((a, b) => b[1] - a[1])
//         .slice(0, 10)
//         .map(([name, score]) => ({ name, score: Math.round(score * 10) / 10 }));

//       const mostSkippedArtists = Object.entries(skippedArtists)
//         .sort((a, b) => b[1] - a[1])
//         .slice(0, 5)
//         .map(([name, count]) => ({ name, skips: count }));

//       const recentHistory = interactions
//         .filter((i) => i.song)
//         .slice(0, 15)
//         .map((i) => ({
//           artist: i.song.artistName,
//           action: i.type,
//           daysAgo: Math.round((Date.now() - i.createdAt) / 86400000),
//         }));

//       const tasteProfile = {
//         topArtistsByScore: topArtistsList,
//         mostSkippedArtists,
//         recentActivity: recentHistory,
//         totalInteractions: interactions.length,
//       };

//       const aiPrompt = `You are a music recommendation AI. Analyze this user's listening behavior and return a JSON decision object.

// User Taste Profile:
// ${JSON.stringify(tasteProfile, null, 2)}

// Based on this data, return ONLY a valid JSON object (no markdown, no explanation) with this exact shape:
// {
//   "strategyNote": "one sentence describing the user's current taste pattern",
//   "boostArtists": ["artist1", "artist2"],
//   "avoidArtists": ["artist3"],
//   "diversityMode": false,
//   "artistWeightOverride": {
//     "artistName": 1.5
//   }
// }

// Rules:
// - "boostArtists": up to 3 artists from topArtistsByScore the user clearly loves — prioritize these
// - "avoidArtists": artists from mostSkippedArtists that should be excluded from recommendations
// - "diversityMode": set true if the user seems to be exploring many different artists recently (varied recentActivity)
// - "artistWeightOverride": a map of artist name → multiplier (0.5 to 2.0) to re-score certain artists
// - Be decisive. Do not return empty arrays if there is enough data.`;

//       const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

//       const aiResponse = await fetch(geminiUrl, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           contents: [{ parts: [{ text: aiPrompt }] }],
//           generationConfig: {
//             temperature: 0.3,       // Low temp = consistent, structured JSON output
//             maxOutputTokens: 500,
//           },
//         }),
//       });

//       const aiData = await aiResponse.json();
//       const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

//       // Safely parse Claude's response
//       const cleaned = rawText.replace(/```json|```/g, "").trim();
//       aiDecision = { ...aiDecision, ...JSON.parse(cleaned) };

//       console.log("🤖 Gemini Decision:", aiDecision);
//     } catch (aiErr) {
//       console.warn("AI analysis failed, using default strategy:", aiErr.message);
//       // Falls back to aiDecision defaults — recommendation still works
//     }

//     // ----------------------------
//     // BUCKET STRUCTURE
//     // ----------------------------

//     const formatSong = (song, source) => ({
//       songId: song.id,
//       title: song.name,
//       artist: song.artist_map?.primary_artists?.map((a) => a.name).join(", "),
//       image: song.image?.find((i) => i.quality === "500x500")?.link,
//       url: song.download_url?.find((u) => u.quality === "320kbps")?.link,
//       duration: song.duration,
//       source,
//     });

//     let bucket = {
//       recentSeeds: [],
//       recentArtist: [],
//       topArtist1: [],
//       topArtist2: [],
//       aiBoosted: [],   // 🆕 Songs from AI-boosted artists
//       trending: [],
//     };

//     // 5️⃣ Recent Song Seeds (10)
//     for (const id of recentSongs) {
//       const r = await fetch(`${process.env.SAVAN_URL}/song/recommend?id=${id}`);
//       const d = await r.json();

//       if (Array.isArray(d?.data)) {
//         const selected = d.data.slice(0, 5);
//         bucket.recentSeeds.push(
//           ...selected.map((s) => formatSong(s, "recentSeed"))
//         );
//       }
//     }
//     bucket.recentSeeds = bucket.recentSeeds.slice(0, 10);

//     // 6️⃣ Artist Based Buckets
//     const fetchArtistSongs = async (artistName, limit) => {
//       const r = await fetch(
//         `${process.env.SAVAN_URL}/search/songs?q=${encodeURIComponent(artistName)}`
//       );
//       const d = await r.json();
//       const songs = d?.data?.results?.slice(0, limit) || [];
//       return songs.map((s) => formatSong(s, "artist"));
//     };

//     if (recentArtist)
//       bucket.recentArtist = (await fetchArtistSongs(recentArtist, 10)).slice(0, 6);

//     if (topArtist1)
//       bucket.topArtist1 = (await fetchArtistSongs(topArtist1, 10)).slice(0, 5);

//     if (topArtist2)
//       bucket.topArtist2 = (await fetchArtistSongs(topArtist2, 10)).slice(0, 4);

//     // 🆕 6b️⃣ AI Boosted Artist Bucket
//     for (const artist of aiDecision.boostArtists.slice(0, 2)) {
//       const songs = await fetchArtistSongs(artist, 5);
//       bucket.aiBoosted.push(...songs);
//     }
//     bucket.aiBoosted = bucket.aiBoosted.slice(0, 8);

//     // 7️⃣ Trending Bucket (5)
//     try {
//       const r = await fetch(`${process.env.SAVAN_URL}/get/trending`);
//       const d = await r.json();
//       const songs = d?.data?.filter((i) => i.type === "song") || [];
//       const shuffled = songs.sort(() => Math.random() - 0.5);
//       bucket.trending = shuffled.slice(0, 5).map((s) => formatSong(s, "trending"));
//     } catch (err) {
//       console.log("Trending fetch failed");
//     }

//     // ----------------------------
//     // 8️⃣ Merge Buckets
//     // ----------------------------

//     // In diversity mode (AI decision), shuffle artist buckets for variety
//     let artistBuckets = [
//       ...bucket.recentArtist,
//       ...bucket.topArtist1,
//       ...bucket.topArtist2,
//       ...bucket.aiBoosted,
//     ];

//     if (aiDecision.diversityMode) {
//       artistBuckets = artistBuckets.sort(() => Math.random() - 0.5);
//     }

//     let finalFeed = [
//       ...bucket.recentSeeds,
//       ...artistBuckets,
//       ...bucket.trending,
//     ];

//     // Remove duplicates
//     finalFeed = finalFeed.filter(
//       (song, index, self) =>
//         index === self.findIndex((s) => s.songId === song.songId)
//     );

//     // Remove skipped songs
//     finalFeed = finalFeed.filter((song) => !skippedSongs.has(song.songId));

//     // 🆕 Remove songs from AI-flagged avoid artists
//     if (aiDecision.avoidArtists.length > 0) {
//       const avoidSet = new Set(
//         aiDecision.avoidArtists.map((a) => a.toLowerCase())
//       );
//       finalFeed = finalFeed.filter(
//         (song) => !avoidSet.has((song.artist || "").toLowerCase())
//       );
//     }

//     // 🆕 Apply AI weight overrides — boost preferred artists to front
//     if (Object.keys(aiDecision.artistWeightOverride).length > 0) {
//       const overrides = Object.fromEntries(
//         Object.entries(aiDecision.artistWeightOverride).map(([k, v]) => [
//           k.toLowerCase(),
//           v,
//         ])
//       );

//       finalFeed.sort((a, b) => {
//         const wA = overrides[(a.artist || "").toLowerCase()] || 1;
//         const wB = overrides[(b.artist || "").toLowerCase()] || 1;
//         return wB - wA; // Higher weight → earlier in feed
//       });
//     }

//     // 9️⃣ Fallback Fill If < 30
//     if (finalFeed.length < 30) {
//       const r = await fetch(`${process.env.SAVAN_URL}/get/trending`);
//       const d = await r.json();
//       const extra = d?.data?.filter((i) => i.type === "song") || [];

//       for (const s of extra) {
//         if (finalFeed.length >= 30) break;
//         if (!finalFeed.find((f) => f.songId === s.id)) {
//           finalFeed.push(formatSong(s, "fallback"));
//         }
//       }
//     }

//     finalFeed = finalFeed.slice(0, 30);

//     // ----------------------------
//     // Final Response
//     // ----------------------------
//     res.json({
//       success: true,
//       reason: "Gemini AI-Enhanced Hybrid Feed",
//       aiStrategy: aiDecision.strategyNote,       // 🆕 expose AI reasoning
//       diversityMode: aiDecision.diversityMode,   // 🆕 expose mode
//       total: finalFeed.length,
//       songs: finalFeed.map((song) => ({
//         id: song.songId,
//         title: song.title,
//         artist: song.artist,
//         image: song.image,
//         url: song.url,
//         duration: song.duration,
//         type: "recommendation",
//       })),
//     });
//   } catch (err) {
//     console.error("Recommendation Error:", err);
//     res.status(500).json({ success: false });
//   }
// });

router.get("/recommendations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    // 1️⃣ Fetch interactions & build profile (Tera OG logic)
    const interactions = await Interaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(200);

    const artistScore = {};
    const skippedSongs = new Set();
    const skippedArtists = {};

    for (const i of interactions) {
      if (!i.song) continue;
      const songId = i.song.songId;
      const artist = i.song.artistName;
      const daysOld = (Date.now() - i.createdAt) / 86400000;
      const decay = Math.exp(-0.05 * daysOld);

      switch (i.type) {
        case "complete": artistScore[artist] = (artistScore[artist] || 0) + 4 * decay; break;
        case "play": artistScore[artist] = (artistScore[artist] || 0) + 2 * decay; break;
        case "like": artistScore[artist] = (artistScore[artist] || 0) + 5 * decay; break;
        case "skip": 
          skippedSongs.add(songId);
          skippedArtists[artist] = (skippedArtists[artist] || 0) + 1;
          break;
      }
    }

    // 2️⃣ Prepare Taste Profile for Gemini
    const topArtistsList = Object.entries(artistScore)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);

    const recentHistory = interactions
      .filter((i) => i.song && i.type !== "skip")
      .slice(0, 10)
      .map((i) => `${i.song.title} by ${i.song.artistName}`);

    const tasteProfile = {
      favoriteArtists: topArtistsList,
      recentlyVibingTo: recentHistory,
      avoidArtists: Object.keys(skippedArtists).slice(0, 5) // Skip wale AI ko bata do
    };

    // ----------------------------
    // 🤖 GEMINI AI DIRECT RECOMMENDATIONS
    // ----------------------------
    let aiTracks = [];
    let aiVibe = "Fresh mix based on trending hits";

    try {
      if (topArtistsList.length > 0) {
        const aiPrompt = `You are an expert Music AI DJ. Analyze this user's taste:
        ${JSON.stringify(tasteProfile, null, 2)}
        
        Suggest 15 specific songs they will absolutely love. 
        Mix their favorite artists with similar artists they haven't heard.
        Strictly AVOID the 'avoidArtists'.
        
        Return ONLY valid JSON with no markdown, like this:
        {
          "vibeCheck": "One cool Gen Z sentence describing their music taste",
          "tracks": [
            { "title": "Song Name", "artist": "Artist Name" }
          ]
        }`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.googleApi}`;
        
        const aiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: aiPrompt }] }],
            generationConfig: { temperature: 0.4 }, // Thoda creative hone de
          }),
        });

        const aiData = await aiResponse.json();
        const rawText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (rawText) {
          const cleaned = rawText.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
          const parsed = JSON.parse(cleaned);
          aiTracks = parsed.tracks || [];
          aiVibe = parsed.vibeCheck || aiVibe;
        }
      }
    } catch (err) {
      console.error("⚠️ Gemini DJ failed, falling back to defaults:", err.message);
    }

    // ----------------------------
    // 🎵 FETCH REAL AUDIO LINKS FROM SAAVN
    // ----------------------------
    const formatSong = (song, source) => ({
      id: song.id,
      title: song.name || song.title,
      artist: song.artist_map?.primary_artists?.map((a) => a.name).join(", ") || song.primaryArtists,
      image: song.image?.find((i) => i.quality === "500x500")?.link || song.image?.[song.image.length - 1]?.link,
      url: song.download_url?.find((u) => u.quality === "320kbps")?.link || song.downloadUrl?.[song.downloadUrl.length - 1]?.link,
      duration: song.duration,
      type: source,
    });

    let finalFeed = [];

    // Parallel search queries se speed badhegi 🚀
    if (aiTracks.length > 0) {
      const searchPromises = aiTracks.map(async (t) => {
        try {
          const query = encodeURIComponent(`${t.title} ${t.artist}`);
          const r = await fetch(`${process.env.SAVAN_URL}/search/songs?q=${query}`);
          const d = await r.json();
          const bestMatch = d?.data?.results?.[0]; // Get the first valid result
          
          if (bestMatch && !skippedSongs.has(bestMatch.id)) {
            return formatSong(bestMatch, "ai_dj_recommendation");
          }
        } catch (e) { return null; }
      });

      const resolvedSongs = await Promise.all(searchPromises);
      finalFeed = resolvedSongs.filter(song => song != null); // Remove nulls
    }

    // 3️⃣ Fallback / Padding agar AI ne kam gaane diye
    if (finalFeed.length < 15) {
      try {
        const r = await fetch(`${process.env.SAVAN_URL}/get/trending`);
        const d = await r.json();
        const trending = d?.data?.filter(i => i.type === "song") || [];
        
        for (const s of trending) {
          if (finalFeed.length >= 20) break;
          // Duplicate check
          if (!finalFeed.find(f => f.id === s.id)) {
            finalFeed.push(formatSong(s, "trending"));
          }
        }
      } catch (e) {
        console.log("Trending fetch failed");
      }
    }

    // Remove duplicates final check
    finalFeed = finalFeed.filter((song, index, self) => 
      index === self.findIndex((s) => s.id === song.id)
    );

    res.json({
      success: true,
      aiVibe: aiVibe,
      total: finalFeed.length,
      songs: finalFeed
    });

  } catch (err) {
    console.error("Recommendation Error:", err);
    res.status(500).json({ success: false, message: "Server error ho gaya bhai" });
  }
});

export default router;