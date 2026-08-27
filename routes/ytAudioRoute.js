import express from "express";
import youtubedl from "youtube-dl-exec";

const router = express.Router();

// Simple in-memory cache for extracted audio URLs (they expire after ~5 hours)
const audioCache = new Map();
const CACHE_TTL = 5 * 60 * 60 * 1000; // 5 hours in ms

function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of audioCache) {
    if (now - entry.timestamp > CACHE_TTL) {
      audioCache.delete(key);
    }
  }
}

// Clean cache every 30 minutes
setInterval(cleanExpiredCache, 30 * 60 * 1000);

// Startup check: verify yt-dlp is actually callable via youtube-dl-exec
let ytDlpAvailable = false;
(async () => {
  try {
    await youtubedl("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
      simulate: true,
      skipDownload: true,
      noWarnings: true,
      noCheckCertificates: true,
    });
    ytDlpAvailable = true;
    console.log("🎵 yt-dlp (via youtube-dl-exec) is available ✅");
  } catch (err) {
    // If the above fails, try a simpler version check
    try {
      await youtubedl.exec(["--version"]);
      ytDlpAvailable = true;
      console.log("🎵 yt-dlp (via youtube-dl-exec) is available ✅");
    } catch {
      console.warn("⚠️  yt-dlp not available via youtube-dl-exec");
      console.warn("   YouTube audio features will be disabled.");
      console.warn("   Error:", err.message);
    }
  }
})();

/**
 * Helper: extract audio URL + metadata using youtube-dl-exec
 */
async function extractAudioInfo(videoId) {
  // Check cache first
  const cached = audioCache.get(videoId);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached;
  }

  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Use dumpSingleJson to get all metadata including the direct audio URL
  const output = await youtubedl(ytUrl, {
    dumpSingleJson: true,
    format: "bestaudio[ext=webm]/bestaudio",
    noPlaylist: true,
    noWarnings: true,
    noCheckCertificates: true,
    noCacheDir: true,
    socketTimeout: 15,
  });

  // output is a parsed JSON object with all video metadata
  const audioUrl = output.url;
  
  if (!audioUrl) {
    // Try to find in formats array
    const formats = output.formats || [];
    const audioFormat = formats
      .filter(f => f.acodec !== "none" && f.vcodec === "none")
      .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];
    
    if (!audioFormat || !audioFormat.url) {
      throw new Error("Failed to extract audio URL from yt-dlp output");
    }
    
    const info = {
      audioUrl: audioFormat.url,
      title: output.title || "Unknown",
      duration: output.duration || 0,
      timestamp: Date.now()
    };
    audioCache.set(videoId, info);
    return info;
  }

  const info = {
    audioUrl,
    title: output.title || "Unknown",
    duration: output.duration || 0,
    timestamp: Date.now()
  };

  // Cache the result
  audioCache.set(videoId, info);
  return info;
}

/**
 * GET /api/yt-audio?videoId=<youtube_video_id>
 * 
 * Returns metadata + proxy stream URL (not the raw googlevideo URL).
 */
router.get("/api/yt-audio", async (req, res) => {
  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ success: false, error: "videoId is required" });
  }

  if (!/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
    return res.status(400).json({ success: false, error: "Invalid videoId format" });
  }

  if (!ytDlpAvailable) {
    return res.status(503).json({ 
      success: false, 
      error: "YouTube audio is temporarily unavailable (yt-dlp not installed on server)" 
    });
  }

  try {
    const info = await extractAudioInfo(videoId);

    return res.json({
      success: true,
      // Point to our proxy stream endpoint instead of raw googlevideo URL
      audioUrl: `/api/yt-stream?videoId=${videoId}`,
      title: info.title,
      duration: info.duration,
    });

  } catch (error) {
    console.error("yt-dlp error:", error.message);

    if (error.killed) {
      return res.status(504).json({ success: false, error: "Audio extraction timed out" });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to extract audio. Make sure yt-dlp is installed.",
      details: error.stderr || error.message
    });
  }
});

/**
 * GET /api/yt-stream?videoId=<youtube_video_id>
 * 
 * Proxies the actual audio stream through our server.
 * This avoids CORS issues since the browser fetches from our own origin.
 * Supports Range requests for seeking.
 */
router.get("/api/yt-stream", async (req, res) => {
  const { videoId } = req.query;

  if (!videoId || !/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
    return res.status(400).send("Invalid videoId");
  }

  try {
    const info = await extractAudioInfo(videoId);
    const audioUrl = info.audioUrl;

    // Forward range headers for seeking support
    // Use same client type as yt-dlp to avoid googlevideo rejecting for client mismatch
    const headers = {
      "User-Agent": "com.google.android.apps.vr.audioplayer/1.0 (Linux; Android 12) ExoPlayer",
      "Referer": "https://www.youtube.com/",
      "Origin": "https://www.youtube.com",
    };

    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }

    const upstream = await fetch(audioUrl, { headers });

    if (!upstream.ok && upstream.status !== 206) {
      // URL might have expired, clear cache and retry once
      audioCache.delete(videoId);
      const freshInfo = await extractAudioInfo(videoId);
      const retryUpstream = await fetch(freshInfo.audioUrl, { headers });
      
      if (!retryUpstream.ok && retryUpstream.status !== 206) {
        return res.status(502).send("Failed to fetch audio stream");
      }

      // Stream the retry response
      res.status(retryUpstream.status);
      res.set("Content-Type", retryUpstream.headers.get("content-type") || "audio/webm");
      if (retryUpstream.headers.get("content-length")) res.set("Content-Length", retryUpstream.headers.get("content-length"));
      if (retryUpstream.headers.get("content-range")) res.set("Content-Range", retryUpstream.headers.get("content-range"));
      if (retryUpstream.headers.get("accept-ranges")) res.set("Accept-Ranges", retryUpstream.headers.get("accept-ranges"));

      const reader = retryUpstream.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { res.end(); break; }
          if (!res.writableEnded) res.write(Buffer.from(value));
        }
      };
      pump().catch(() => res.end());
      return;
    }

    // Stream the response to client
    res.status(upstream.status);
    res.set("Content-Type", upstream.headers.get("content-type") || "audio/webm");
    if (upstream.headers.get("content-length")) res.set("Content-Length", upstream.headers.get("content-length"));
    if (upstream.headers.get("content-range")) res.set("Content-Range", upstream.headers.get("content-range"));
    if (upstream.headers.get("accept-ranges")) res.set("Accept-Ranges", upstream.headers.get("accept-ranges"));

    const reader = upstream.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        if (!res.writableEnded) res.write(Buffer.from(value));
      }
    };

    pump().catch(() => res.end());

    // If client disconnects, stop reading
    req.on("close", () => {
      reader.cancel().catch(() => {});
    });

  } catch (error) {
    console.error("yt-stream error:", error.message);
    if (!res.headersSent) {
      res.status(500).send("Stream error");
    }
  }
});

export default router;
