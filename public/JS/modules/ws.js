// ============================================================
// WebSocket Module — Real-time song sharing via Socket.IO
// ============================================================
import state from "./state.js";
import { popupAlert, escapeHtml } from "./utils.js";

let socket = null;

export function initSocket() {
  if (typeof io === "undefined") { console.warn("Socket.IO not loaded"); return; }
  socket = io();

  socket.on("connect", async () => {
    console.log("🔌 WebSocket connected:", socket.id);
    try {
      const res = await fetch("/userprofile");
      const user = await res.json();
      if (user && user.id) {
        socket.emit("register", { id: user.id, name: user.name || user.email });
      }
    } catch (e) {
      console.warn("Could not register socket:", e);
    }
  });

  // Listen for shared songs
  socket.on("song-shared", (data) => {
    showSongToast(data);
  });

  // Listen for now-playing updates from friends
  socket.on("friend-now-playing", (data) => {
    updateFriendActivity(data);
  });

  // Listen for chat messages
  socket.on("receive-chat-message", async (msg) => {
    if (state._activeChatFriendId === msg.senderEmail || state._activeChatFriendId === msg.receiverEmail) {
      // Chat is open, append message
      const { appendMessageToChat } = await import("./social.js");
      appendMessageToChat(msg, msg.senderEmail === state._activeChatFriendId ? msg.senderEmail : msg.receiverEmail);
    } else {
      // Chat is closed, maybe show a toast
      popupAlert(`New message from ${msg.senderEmail}`);
    }
  });
}

// --- Emit current song to server ---
export function emitNowPlaying(songData) {
  if (!socket) return;
  socket.emit("now-playing", songData);
}

// --- Share song to a friend ---
export async function shareSongToFriend(friendId, songData) {
  if (!socket) { popupAlert("Not connected"); return; }
  socket.emit("share-song", { to: friendId, song: songData });
  popupAlert("Song shared! 🎵");
}

// --- Send chat message ---
export function emitChatMessage(friendId, content) {
  if (!socket) { popupAlert("Not connected"); return; }
  socket.emit("send-chat-message", { to: friendId, content });
}

// --- Toast notification for incoming shared songs ---
function showSongToast(data) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "song-toast";
  toast.innerHTML = `
    <img src="${data.song.image || "https://cdn-icons-png.flaticon.com/512/847/847969.png"}" alt="Song" class="toast-img">
    <div class="toast-info">
      <p class="toast-sender">${escapeHtml(data.from)} shared a song</p>
      <p class="toast-song-name">${escapeHtml(data.song.songName)}</p>
      <p class="toast-artist">${escapeHtml(data.song.artist)}</p>
    </div>
    <button class="toast-play-btn"><i class="fa-solid fa-play"></i></button>
    <button class="toast-close-btn">✕</button>`;

  toast.querySelector(".toast-play-btn")?.addEventListener("click", async () => {
    // Fetch full song data and play
    try {
      const res = await fetch(`/search?type=songID&query=${data.song.songId}`);
      const result = await res.json();
      const song = result.data.data.songs[0];
      const { playsong } = await import("./player.js");
      playsong(song.image[2].link, song.name, song.artist_map.artists[0].name, song.id, song.download_url[4].link, song.duration, "shared");
    } catch (e) { console.error("Failed to play shared song", e); }
    toast.remove();
  });

  toast.querySelector(".toast-close-btn")?.addEventListener("click", () => toast.remove());

  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 400); }, 8000);
}

function updateFriendActivity(data) {
  // Update friend activity cards if visible
  const cards = document.querySelectorAll(".friend-card");
  cards.forEach(card => {
    const nameEl = card.querySelector(".friend-name");
    if (nameEl?.textContent === data.username) {
      const statusEl = card.querySelector(".friend-status");
      if (statusEl) statusEl.textContent = `Listening to: "${data.song.songName}" by ${data.song.artist}`;
    }
  });
}

// --- Open share modal for current song ---
export function openSongShareModal() {
  if (typeof sess !== "undefined" && sess !== true) {
    import("./utils.js").then(({ popupAlert }) => popupAlert("Please Sign Up to share songs"));
    return;
  }
  const modal = document.getElementById("shareSongModal");
  if (!modal) return;
  modal.classList.remove("hidden");

  const songInfo = modal.querySelector(".share-song-info");
  if (songInfo) {
    songInfo.innerHTML = `
      <img src="${document.getElementById("currentPlayingSongImg")?.src || ""}" class="share-song-thumb">
      <div>
        <p class="share-song-title">${state.globalSongName || "No song playing"}</p>
        <p class="share-song-artist">${state.globalArtist || ""}</p>
      </div>`;
  }

  // Load friends list
  loadShareFriends();
}

async function loadShareFriends() {
  const list = document.getElementById("shareSongFriendList");
  if (!list) return;
  list.innerHTML = '<p class="text-gray">Loading friends...</p>';

  try {
    const res = await fetch("/friends/list");
    const friends = await res.json();
    list.innerHTML = "";

    if (!friends.length) { list.innerHTML = '<p class="text-gray">No friends yet.</p>'; return; }

    friends.forEach(f => {
      const item = document.createElement("div");
      item.className = "share-friend-row";
      item.innerHTML = `
        <img src="https://cdn-icons-png.flaticon.com/512/847/847969.png" class="share-friend-avatar">
        <span class="share-friend-name">${escapeHtml(f.name || f.username)}</span>
        <button class="share-send-btn" data-id="${f.id || f._id}"><i class="fa-solid fa-paper-plane"></i></button>`;

      item.querySelector(".share-send-btn")?.addEventListener("click", () => {
        shareSongToFriend(item.querySelector(".share-send-btn").dataset.id, {
          songName: state.globalSongName,
          artist: state.globalArtist,
          songId: state.globalSongId,
          image: document.getElementById("currentPlayingSongImg")?.src || "",
        });
        document.getElementById("shareSongModal")?.classList.add("hidden");
      });

      list.appendChild(item);
    });
  } catch (e) { list.innerHTML = '<p class="text-gray">Failed to load friends.</p>'; }
}

export function initShareEvents() {
  // Share button in player bar
  document.getElementById("shareSongBtn")?.addEventListener("click", openSongShareModal);

  // Close share modal
  document.getElementById("shareSongModalClose")?.addEventListener("click", () => {
    document.getElementById("shareSongModal")?.classList.add("hidden");
  });
}
