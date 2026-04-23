/**
 * chat.js — Real-time WebSocket chat module
 * Handles WS connection, chat drawer UI, message rendering,
 * song/playlist sharing via chat.
 */
import { state } from "../state.js";
import { escapeHtml } from "./helpers.js";
import { popupAlert } from "./ui.js";

// ── Internal state ─────────────────────────────────────────────────────────────
let ws               = null;
let activeFriendId   = null;
let activeFriendName = "";
let myUserId         = null;
let reconnectTimer   = null;

// ── Exported: get current WS for external senders ─────────────────────────────
export function getWs() { return ws; }
export function getMyUserId() { return myUserId; }

// ── Init WebSocket ─────────────────────────────────────────────────────────────
export function initWebSocket() {
    if (!window.sess) return; // only for logged-in users
    _connect();
}

function _connect() {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${protocol}://${location.host}`);

    ws.addEventListener("open", () => {
        console.log("🔌 WS connected");
        _clearReconnect();
        // After the handshake, server sends us our userId
    });

    ws.addEventListener("message", (evt) => {
        try {
            const data = JSON.parse(evt.data);
            _handleIncoming(data);
        } catch (e) {
            console.warn("WS parse error:", e);
        }
    });

    ws.addEventListener("close", () => {
        console.log("🔌 WS closed — reconnecting in 4s");
        _scheduleReconnect();
    });

    ws.addEventListener("error", (err) => {
        console.warn("WS error:", err);
    });
}

function _scheduleReconnect() {
    _clearReconnect();
    reconnectTimer = setTimeout(_connect, 4000);
}
function _clearReconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

// ── Incoming message dispatcher ────────────────────────────────────────────────
function _handleIncoming(data) {
    switch (data.type) {
        case "init":
            myUserId = data.userId;
            break;

        case "chat":
        case "song":
        case "playlist":
            _appendMessage(data, false);
            // If drawer is closed, show notification badge
            if (data.from !== activeFriendId || document.getElementById("chat-drawer").classList.contains("hidden")) {
                _showChatNotification(data);
            }
            break;

        case "online_status":
            _updateOnlineDot(data.userId, data.online);
            break;

        case "pong":
            break;
    }
}

// ── Send helpers ───────────────────────────────────────────────────────────────
export function sendChatMessage(friendId, text) {
    if (!text.trim()) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        popupAlert("Not connected — retrying…");
        return;
    }
    ws.send(JSON.stringify({ type: "chat", to: friendId, text }));
    // Optimistically render on sender side
    _appendMessage({ type: "chat", from: myUserId, to: friendId, text }, true);
    // Persist via REST
    fetch("/friends/chat-history-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toId: friendId, type: "text", text })
    }).catch(() => {});
}

export function sendSongShare(friendId, song) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        popupAlert("Not connected");
        return;
    }
    ws.send(JSON.stringify({ type: "song", to: friendId, payload: song }));
    _appendMessage({ type: "song", from: myUserId, payload: song }, true);
    fetch("/friends/share-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toId: friendId, song })
    }).catch(() => {});
}

export function sendPlaylistShare(friendId, playlist) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        popupAlert("Not connected");
        return;
    }
    ws.send(JSON.stringify({ type: "playlist", to: friendId, payload: playlist }));
    _appendMessage({ type: "playlist", from: myUserId, payload: playlist }, true);
    fetch("/friends/share-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toId: friendId, playlist })
    }).catch(() => {});
}

// ── Open the chat drawer ───────────────────────────────────────────────────────
export async function openChatWith(friend) {
    activeFriendId   = friend.id;
    activeFriendName = friend.name || friend.email || "Friend";

    const drawer = document.getElementById("chat-drawer");
    drawer.classList.remove("hidden");
    drawer.classList.add("open");

    document.getElementById("chat-friend-name").textContent = activeFriendName;
    document.getElementById("chat-friend-initials").textContent =
        activeFriendName.slice(0, 2).toUpperCase();

    // Clear messages container
    const msgBox = document.getElementById("chat-messages");
    msgBox.innerHTML = `<div class="chat-loading">Loading messages…</div>`;

    // Load history
    try {
        const res  = await fetch(`/friends/chat-history/${friend.id}`);
        const msgs = await res.json();
        msgBox.innerHTML = "";
        if (msgs.length === 0) {
            msgBox.innerHTML = `<div class="chat-empty">Say hi to ${escapeHtml(activeFriendName)}! 👋</div>`;
        } else {
            msgs.forEach((m) => _appendMessage(m, String(m.from) === String(myUserId)));
        }
    } catch (e) {
        msgBox.innerHTML = `<div class="chat-empty">Could not load messages.</div>`;
    }

    document.getElementById("chat-input").focus();
}

export function closeChatDrawer() {
    const drawer = document.getElementById("chat-drawer");
    drawer.classList.remove("open");
    setTimeout(() => {
        drawer.classList.add("hidden");
        activeFriendId = null;
    }, 300);
}

// ── Render a message bubble ────────────────────────────────────────────────────
function _appendMessage(data, isMine) {
    const msgBox = document.getElementById("chat-messages");
    if (!msgBox) return;

    // Remove "say hi" placeholder
    const empty = msgBox.querySelector(".chat-empty, .chat-loading");
    if (empty) empty.remove();

    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${isMine ? "mine" : "theirs"}`;

    if (data.type === "chat" || data.type === "text") {
        bubble.innerHTML = `<div class="bubble-text">${escapeHtml(data.text || "")}</div>`;
    } else if (data.type === "song") {
        const s = data.payload || {};
        bubble.innerHTML = `
        <div class="shared-card song-card">
            <div class="shared-card-icon">🎵</div>
            <img src="${s.image || ""}" alt="${escapeHtml(s.songName || "")}" class="shared-card-img">
            <div class="shared-card-info">
                <div class="shared-card-title">${escapeHtml(s.songName || "Unknown")}</div>
                <div class="shared-card-sub">${escapeHtml(s.artist || "")}</div>
                <button class="shared-play-btn">▶ Play</button>
            </div>
        </div>`;
        bubble.querySelector(".shared-play-btn").addEventListener("click", () => {
            if (window.playSong) {
                window.playSong(s.songUrl || "", s.songId || "", s.songName || "", s.artist || "", s.image || "", s.len || 0, "shared", "");
            }
        });
    } else if (data.type === "playlist") {
        const p = data.payload || {};
        bubble.innerHTML = `
        <div class="shared-card playlist-card">
            <div class="shared-card-icon">🎶</div>
            <img src="${p.image || ""}" alt="${escapeHtml(p.name || "")}" class="shared-card-img">
            <div class="shared-card-info">
                <div class="shared-card-label">Playlist</div>
                <div class="shared-card-title">${escapeHtml(p.name || "Playlist")}</div>
                <div class="shared-card-sub">${p.songs?.length || 0} songs</div>
                <button class="shared-play-btn">▶ Open Playlist</button>
            </div>
        </div>`;
        bubble.querySelector(".shared-play-btn").addEventListener("click", () => {
            if (window.librarySongs) {
                window.librarySongs(p.name || "");
            }
        });
    }

    // Timestamp
    const timeEl = document.createElement("div");
    timeEl.className = "bubble-time";
    timeEl.textContent = _formatTime(data.createdAt || new Date());
    bubble.appendChild(timeEl);

    msgBox.appendChild(bubble);
    msgBox.scrollTop = msgBox.scrollHeight;
}

function _formatTime(ts) {
    const d = new Date(ts);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
}

// ── Online presence dot ────────────────────────────────────────────────────────
function _updateOnlineDot(userId, online) {
    const dots = document.querySelectorAll(`.online-dot[data-uid="${userId}"]`);
    dots.forEach((dot) => {
        dot.classList.toggle("online", online);
        dot.classList.toggle("offline", !online);
        dot.title = online ? "Online" : "Offline";
    });
    // Update chat drawer if open
    if (activeFriendId === userId) {
        const statusEl = document.getElementById("chat-friend-status");
        if (statusEl) statusEl.textContent = online ? "● Online" : "○ Offline";
    }
}

// ── Chat notification badge ────────────────────────────────────────────────────
function _showChatNotification(data) {
    const badge = document.getElementById("chat-notification-badge");
    if (!badge) return;
    let count = parseInt(badge.dataset.count || "0") + 1;
    badge.dataset.count = count;
    badge.textContent   = count;
    badge.classList.remove("hidden");
}

export function clearChatBadge() {
    const badge = document.getElementById("chat-notification-badge");
    if (badge) { badge.dataset.count = "0"; badge.classList.add("hidden"); }
}

// ── Init chat drawer event listeners ──────────────────────────────────────────
export function initChatListeners() {
    // Send button
    document.getElementById("chat-send-btn")?.addEventListener("click", () => {
        const input = document.getElementById("chat-input");
        if (!activeFriendId) return popupAlert("Open a chat first");
        sendChatMessage(activeFriendId, input.value);
        input.value = "";
    });

    // Enter key
    document.getElementById("chat-input")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            document.getElementById("chat-send-btn")?.click();
        }
    });

    // Close button
    document.getElementById("chat-drawer-close")?.addEventListener("click", closeChatDrawer);

    // Share current song button
    document.getElementById("chat-share-song-btn")?.addEventListener("click", () => {
        if (!activeFriendId) return popupAlert("Open a chat first");
        if (!state.globalSongId) return popupAlert("No song is currently playing");
        
        sendSongShare(activeFriendId, {
            songId:   state.globalSongId,
            songName: state.globalSongName,
            artist:   state.globalArtist,
            image:    document.getElementById("currentPlayingSongImg")?.src || "",
            songUrl:  document.getElementById("player")?.src || ""
        });
    });

    // Overlay click (click outside drawer to close)
    document.getElementById("chat-drawer-overlay")?.addEventListener("click", closeChatDrawer);
}
