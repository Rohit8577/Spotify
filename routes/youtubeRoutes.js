import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Router, HttpError, rateLimit } from '../utils/http.js';
import authMiddleware from '../middlewares/auth.js';
import { requestToken, tokenDigest } from '../utils/tokens.js';
import User from '../models/User.js';
import RevokedToken from '../models/RevokedToken.js';
import { youtubeVideoId, createAudioTicket, verifyAudioTicket, createYouTubeService } from '../services/youtube.js';

const router = Router();
const service = (req) => req.app.locals.services.youtube || (req.app.locals.youtube ||= createYouTubeService());
const audioError = (error, res) => {
  if (!(error instanceof HttpError)) throw error;
  return res.status(error.status).json({ success: false, message: error.message });
};

router.post('/youtube/resolve', authMiddleware, rateLimit({ limit: 30, keyOf: (req) => String(req.user._id) }), async (req, res) => {
  const input = req.body.videoIds;
  if (!Array.isArray(input) || !input.length || input.length > 100 || input.some((id) => youtubeVideoId(id) !== id)) throw new HttpError(400, 'Provide up to 100 valid YouTube video IDs');
  const ids = [...new Set(input)];
  const selected = req.body.selectedVideoId;
  if (selected !== undefined && !ids.includes(selected)) throw new HttpError(400, 'Selected song must be in the queue');
  try {
    const audio = selected ? await service(req).resolve(selected) : null;
    const digest = tokenDigest(requestToken(req));
    res.json({ sources: ids.map((id) => ({ id: `youtube_${id}`, duration: id === selected ? audio.duration : 0,
      url: `/youtube/audio/${id}?ticket=${createAudioTicket(id, req.user, digest)}` })) });
  } catch (error) { audioError(error, res); }
});

router.get('/youtube/audio/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const ticket = verifyAudioTicket(req.query.ticket, videoId);
  const [user, revoked] = await Promise.all([
    User.findById(ticket.userId).select('tokenVersion').lean(), RevokedToken.exists({ _id: ticket.sessionDigest }),
  ]);
  if (!user || (user.tokenVersion || 0) !== ticket.version || revoked) throw new HttpError(401, 'Audio session expired');
  const range = req.headers.range;
  if (range && (range.length > 80 || !/^bytes=(?:\d+-\d*|-\d+)$/.test(range))) throw new HttpError(416, 'Invalid audio range');
  const controller = new AbortController();
  const onClose = () => controller.abort();
  res.once('close', onClose);
  // This timer covers extraction/response headers only, never the song duration.
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const { response, mimeType } = await service(req).open(videoId, { range, signal: controller.signal });
    clearTimeout(timer);
    if (res.destroyed) { await response.body?.cancel(); return; }
    res.status(response.status).set({ 'Content-Type': mimeType, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    for (const name of ['content-length', 'content-range']) {
      const value = response.headers.get(name);
      if (value) res.set(name, value);
    }
    if (req.method === 'HEAD' || response.status === 416) { await response.body?.cancel(); res.end(); return; }
    await pipeline(Readable.fromWeb(response.body), res);
  } catch (error) {
    if (res.destroyed || controller.signal.aborted) {
      if (!res.destroyed && !res.headersSent) res.status(504).json({ message: 'YouTube took too long. Please try again.' });
      else if (!res.destroyed) res.destroy();
      return;
    }
    if (res.headersSent) { res.destroy(); return; }
    audioError(error, res);
  } finally { clearTimeout(timer); res.off('close', onClose); }
});

export default router;
