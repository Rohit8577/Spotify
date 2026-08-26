import express from "express";
import { execFile, execSync } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { join } from "path";

const execFileAsync = promisify(execFile);

// Find yt-dlp binary - check PATH first, then common install locations
function findYtDlpBinary() {
  // Try to find in PATH
  try {
    const result = execSync("where yt-dlp", { encoding: "utf-8", windowsHide: true }).trim().split("\n")[0].trim();
    if (result && existsSync(result)) return result;
  } catch {}

  // Common Windows install locations
  const homeDir = process.env.USERPROFILE || process.env.HOME || "";
  const candidates = [
    join(homeDir, "AppData", "Local", "Microsoft", "WinGet", "Links", "yt-dlp.exe"),
    join(homeDir, "AppData", "Local", "Microsoft", "WinGet", "Packages", "yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe", "yt-dlp.exe"),
    "yt-dlp", // fallback to PATH
  ];

  for (const candidate of candidates) {
    if (candidate === "yt-dlp" || existsSync(candidate)) return candidate;
  }

  return "yt-dlp"; // ultimate fallback
}

const YT_DLP_BIN = findYtDlpBinary();
console.log(`🎵 yt-dlp binary: ${YT_DLP_BIN}`);
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

/**
 * Helper: extract audio URL + metadata from yt-dlp
 */
async function extractAudioInfo(videoId) {
  // Check cache first
  const cached = audioCache.get(videoId);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached;
  }

  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const { stdout } = await execFileAsync(YT_DLP_BIN, [
    "-f", "bestaudio",
    "--get-url",
    "--print", "%(title)s",
    "--print", "%(duration)s",
    "--no-playlist",
    "--no-warnings",
    "--no-check-certificates",
    ytUrl
  ], {
    timeout: 15000,
    windowsHide: true
  });

  const lines = stdout.trim().split("\n").map(l => l.trim());

  if (lines.length < 3 || !lines[2].startsWith("http")) {
    console.error("yt-dlp unexpected output:", stdout);
    throw new Error("Failed to extract audio URL");
  }

  const info = {
    audioUrl: lines[2],
    title: lines[0] || "Unknown",
    duration: parseInt(lines[1]) || 0,
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
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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
