/**
 * player.js — Core audio player module.
 * Owns: the HTML audio element, play/pause, volume seekbar, playbar seekbar,
 * keyboard shortcuts, and audio event wiring.
 *
 * Circular-dependency note: The "ended" event and keyboard next/prev shortcuts
 * need `playbackControl`, which lives in playback.js. Rather than importing
 * playback.js here (which would create a circle since playback.js imports player),
 * we expose `initPlayerListeners({ onSongEnd, onForward, onBackward })` that
 * script.js calls after both modules are loaded.
 */
import { state } from "../state.js";
import { formatTime } from "./helpers.js";

// ─── DOM element refs exported for other modules ──────────────────────────────
export const player         = document.getElementById("player");
export const seekBar1       = document.getElementById("seekBar1");
export const fillBar        = document.getElementById("fillBar");
export const playBar        = document.getElementById("playbar-cont");
export const PlayFillBar    = document.getElementById("playbar-fill");
export const currentTimeSpan = document.getElementById("currentTime");
export const durationSpan   = document.getElementById("duration");
export const playbarFill    = document.getElementById("playbar-fill");

// ─── Play / Pause ─────────────────────────────────────────────────────────────
export function playpause() {
    const playSVG  = document.getElementById("play-svg");
    const pauseSVG = document.getElementById("pause-svg");

    if (typeof ytPlayer !== "undefined" && ytPlayer && ytPlayer.getPlayerState) {
        const ytState = ytPlayer.getPlayerState();
        if (ytState === YT.PlayerState.PLAYING) {
            ytPlayer.pauseVideo();
            playSVG.style.display  = "block";
            pauseSVG.style.display = "none";
        } else {
            ytPlayer.playVideo();
            playSVG.style.display  = "none";
            pauseSVG.style.display = "block";
        }
    } else if (player) {
        if (player.paused) {
            player.play();
            playSVG.style.display  = "none";
            pauseSVG.style.display = "block";
        } else {
            player.pause();
            playSVG.style.display  = "block";
            pauseSVG.style.display = "none";
        }
    }
}

// ─── Volume Seekbar ───────────────────────────────────────────────────────────
export function updateSeekBar(clientX) {
    const rect    = seekBar1.getBoundingClientRect();
    let x         = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    fillBar.style.width = percent + "%";
    document.getElementById("percent").innerHTML = `${Math.round(percent)}%`;
    player.volume = percent / 100;
}

seekBar1.addEventListener("click",     e => updateSeekBar(e.clientX));
seekBar1.addEventListener("mousedown", e => { state.isDragging = true; updateSeekBar(e.clientX); });
document.addEventListener("mousemove", e => { if (state.isDragging) updateSeekBar(e.clientX); });
document.addEventListener("mouseup",   () => { state.isDragging = false; });

// ─── Playbar (Song Progress) Seekbar ─────────────────────────────────────────
export function updateplaytime(clientX) {
    const rect    = playBar.getBoundingClientRect();
    let x         = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    PlayFillBar.style.width  = percent + "%";
    player.currentTime       = (percent / 100) * player.duration;
}

playBar.addEventListener("click",     e => updateplaytime(e.clientX));
playBar.addEventListener("mousedown", e => { state.Draging = true; updateplaytime(e.clientX); });
document.addEventListener("mousemove", e => { if (state.Draging) updateplaytime(e.clientX); });
document.addEventListener("mouseup",  () => { state.Draging = false; });

// ─── Audio Time Events ────────────────────────────────────────────────────────
player.addEventListener("loadedmetadata", () => {
    durationSpan.textContent = formatTime(player.duration);
});

player.addEventListener("timeupdate", () => {
    currentTimeSpan.textContent = formatTime(player.currentTime);
    const percent = (player.currentTime / player.duration) * 100;
    playbarFill.style.width = `${percent}%`;
});

// ─── Wire song-end + keyboard shortcuts AFTER playback.js is loaded ──────────
/**
 * Called from script.js to wire events that depend on playback.js callbacks,
 * avoiding the player.js ↔ playback.js circular dependency.
 *
 * @param {Object} cfg
 * @param {Function} cfg.onSongEnd   — called when a song finishes
 * @param {Function} cfg.onForward   — called for next-track
 * @param {Function} cfg.onBackward  — called for previous-track
 * @param {Function} cfg.onPlayPause — called for space-bar toggle
 */
export function initPlayerListeners({ onSongEnd, onForward, onBackward, onPlayPause }) {
    // Song ended
    player.addEventListener("ended", onSongEnd);

    // Play / Pause buttons in the bar
    document.getElementById("play-svg") .addEventListener("click", () => playpause());
    document.getElementById("pause-svg").addEventListener("click", () => playpause());

    // Forward / Backward transport buttons
    document.getElementById("Forward") .addEventListener("click", onForward);
    document.getElementById("Backward").addEventListener("click", onBackward);

    // Keyboard shortcuts
    document.addEventListener("keydown", (event) => {
        const activeId = document.activeElement.id;
        const ignoredIds = ["search", "new-playlist-name", "searchInput", "searchPageInput", "playlistName"];

        if (event.key === "ArrowUp") {
            event.preventDefault();
            const fw = parseInt(fillBar.style.width) || 0;
            const nw = Math.min(fw + 1, 100);
            fillBar.style.width = nw + "%";
            document.getElementById("percent").innerHTML = `${nw}%`;
            player.volume = nw / 100;
        }
        if (event.key === "ArrowDown") {
            event.preventDefault();
            const fw = parseInt(fillBar.style.width) || 0;
            const nw = Math.max(fw - 1, 0);
            fillBar.style.width = nw + "%";
            document.getElementById("percent").innerHTML = `${nw}%`;
            player.volume = nw / 100;
        }
        if (event.key === "ArrowRight" && !event.ctrlKey) {
            event.preventDefault();
            player.currentTime += 5;
        }
        if (event.key === "ArrowLeft" && !event.ctrlKey) {
            event.preventDefault();
            player.currentTime -= 5;
        }
        if (event.ctrlKey && event.key === "ArrowRight") {
            event.preventDefault();
            onForward();
        }
        if (event.ctrlKey && event.key === "ArrowLeft") {
            event.preventDefault();
            onBackward();
        }
        if (event.ctrlKey && event.key === "k") {
            event.preventDefault();
            document.getElementById("searchPageInput").focus();
        }
        if (event.code === "Space" && !ignoredIds.includes(activeId)) {
            event.preventDefault();
            playpause();
        }
        if (event.key === "l" && !ignoredIds.includes(activeId) && activeId !== "playlistSearch") {
            // Toggled from navigation.js via the recentlyDisplay / displayRecently callbacks
            onPlayPause && onPlayPause("l");
        }
    });
}
