// ============================================================
// Social Module — Profile, Friends (dynamically loaded)
// ============================================================
import state from "./state.js";
import { escapeHtml, popupAlert } from "./utils.js";
import { navigateTo } from "./navigation.js";
import { librarySongs } from "./playlist.js";

export async function openProfilePage() {
  navigateTo({ view: "MainProfileContainer" });
  document.querySelector(".profile-box")?.classList.remove("visible");
  const res = await fetch("/userprofile");
  const result = await res.json();
  document.querySelector(".profile-name").innerHTML = result.name;
  document.querySelector(".profile-email").innerHTML = result.email;
  document.querySelector(".profilePlaylistCount").innerHTML = `${result.lib.length} Playlist`;
  document.querySelector(".profileArtistCount").innerHTML = `${result.artist.length} Following`;

  document.querySelector(".grid-container").innerHTML = "";
  result.lib.forEach(item => {
    const tile = makePlaylistTile(item);
    document.querySelector(".grid-container").appendChild(tile);
  });

  document.getElementById("profilePageArtist").innerHTML = "";
  result.artist.forEach(async item => {
    const response = await fetch(`${state.SAAVN_BASE_URL}/artist?id=${item.id}`);
    const r = await response.json();
    const div = document.createElement("div");
    div.className = "modern-card artist-card";
    div.innerHTML = `<div class="modern-card-img-wrapper"><img src="${r.data.image[2]?.link}" alt="Artist" class="modern-card-img"><div class="hover-play-btn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div></div><p class="modern-card-title">${r.data.name}</p><p class="modern-card-subtitle">Artist</p>`;
    div.addEventListener("click", async () => { document.querySelector(".MainProfileContainer")?.classList.add("hidden"); const { getArtistDetails } = await import("./home.js"); getArtistDetails(item.id); });
    document.getElementById("profilePageArtist").appendChild(div);
  });
}

function makePlaylistTile(item) {
  const div = document.createElement("div");
  div.className = "modern-card playlist-card";
  div.innerHTML = `
    <div class="modern-card-img-wrapper">
      <img src="${item.image}" alt="Playlist Cover" class="modern-card-img">
      <div class="hover-play-btn play-btn" data-name="${escapeHtml(item.name)}">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </div>
      <div class="hover-share-btn share" data-name="${escapeHtml(item.name)}" style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.6); border-radius: 50%; padding: 6px; color: white; opacity: 0; transition: opacity 0.2s;">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
      </div>
    </div>
    <p class="modern-card-title">${escapeHtml(item.name)}</p>
    <p class="modern-card-subtitle">Playlist</p>
  `;
  div.addEventListener("mouseenter", () => { div.querySelector('.hover-share-btn').style.opacity = '1'; });
  div.addEventListener("mouseleave", () => { div.querySelector('.hover-share-btn').style.opacity = '0'; });
  
  // Notice we delegate the play logic to the button or the whole card, let's keep the existing button selector
  div.querySelector(".play-btn").addEventListener("click", (e) => { e.stopPropagation(); document.querySelector(".MainProfileContainer")?.classList.add("hidden"); librarySongs(item.name); });
  // Add fallback click to the card itself
  div.addEventListener("click", () => { document.querySelector(".MainProfileContainer")?.classList.add("hidden"); librarySongs(item.name); });
  
  div.querySelector(".share").addEventListener("click", (e) => { e.stopPropagation(); state._playlistToShare = { id: item.id || item.name, name: item.name }; openShareModal(state._playlistToShare); });
  return div;
}

export function openFriendSection() {
  navigateTo({ view: "friends-section" });
  document.getElementById("profile")?.classList.remove("visible");
  loadFriendActivity();
}

async function loadFriendActivity() {
  const container = document.querySelector(".friend-cards-container");
  if (!container) return;
  container.innerHTML = '<p class="text-gray text-center p-4">Loading friend activity...</p>';
  try {
    const res = await fetch("/friends/activity");
    const data = await res.json();
    if (data.length === 0) {
      container.innerHTML = '<p class="text-gray text-center p-4">No friend activity yet. Add some friends!</p>';
      return;
    }
    container.innerHTML = "";
    data.forEach(f => {
      const card = document.createElement("div");
      card.className = "friend-card";
      card.innerHTML = `<img src="https://cdn-icons-png.flaticon.com/512/847/847969.png" alt="Friend" class="friend-avatar"><div class="friend-info"><span class="friend-name">${escapeHtml(f.name)}</span><span class="friend-status">${escapeHtml(f.status || "No activity")}</span></div>`;
      card.style.cursor = "pointer";
      card.addEventListener("click", () => openChatWindow(f.id, f.name));
      container.appendChild(card);
    });
  } catch (e) {
    container.innerHTML = '<p class="text-gray text-center p-4">Could not load activity.</p>';
  }
}

export function openShareModal(playlistObj = null) {
  state._playlistToShare = playlistObj;
  document.getElementById("shareModalPlaylistName").textContent = playlistObj ? playlistObj.name : "(pick friend)";
  document.getElementById("shareModal")?.classList.remove("hidden");
  const listDiv = document.getElementById("shareFriendList");
  if (listDiv) listDiv.innerHTML = "";
  if (!state._friendsCache.length) { if (listDiv) listDiv.innerHTML = '<div style="color:#9a9a9a">No friends to share with.</div>'; return; }
  state._friendsCache.forEach(f => {
    const item = document.createElement("div");
    item.className = "share-friend-item";
    item.innerHTML = `<div>${escapeHtml(f.name||f.id)}<div style="font-size:12px;color:#9a9a9a">${escapeHtml(f.email||f.id)}</div></div><div><input type="radio" name="shareFriendRadio" value="${f.id}"/></div>`;
    listDiv?.appendChild(item);
  });
  document.getElementById("shareConfirmBtn").onclick = async () => {
    const checked = document.querySelector('input[name="shareFriendRadio"]:checked');
    const friendId = checked?.value;
    if (!friendId) return alert("Choose a friend");
    if (!state._playlistToShare) return alert("Pick a playlist first.");
    await sharePlaylist(friendId, state._playlistToShare.id);
    document.getElementById("shareModal")?.classList.add("hidden");
  };
}

async function sharePlaylist(friendId, playlistId) {
  try {
    const res = await fetch("/sharePlaylist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friendId, playlistId }) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Share failed");
    popupAlert("Playlist shared ✅");
  } catch (err) { popupAlert("Share failed: " + (err.message || "error")); }
}

export function initSocialEvents() {
  // Friend request modal
  const modal = document.getElementById("friend-request-modal");
  document.getElementById("add-friend-btn")?.addEventListener("click", () => { if (modal) modal.style.display = "flex"; });
  document.getElementById("friend-modal-close-btn")?.addEventListener("click", () => { if (modal) modal.style.display = "none"; });
  window.addEventListener("click", e => { if (e.target === modal && modal) modal.style.display = "none"; });

  // Share modal close
  document.getElementById("shareModalClose")?.addEventListener("click", () => document.getElementById("shareModal")?.classList.add("hidden"));

  // Profile three-dot
  document.getElementById("threedotContent")?.querySelector("#threedotModalClose")?.addEventListener("click", () => document.getElementById("threedotContent")?.classList.add("hidden"));

  // Search friend in modal
  document.querySelector(".search-modal-btn")?.addEventListener("click", searchFriendInModal);

  // Chat Window Logic
  document.getElementById("close-chat-btn")?.addEventListener("click", () => {
    document.getElementById("floating-chat-window")?.classList.add("hidden");
    state._activeChatFriendId = null;
  });

  const chatInput = document.getElementById("chat-input");
  const chatSendBtn = document.getElementById("chat-send-btn");

  if (chatSendBtn && chatInput) {
    chatSendBtn.addEventListener("click", sendChatMessage);
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendChatMessage();
    });
  }
}

// --- Chat Functions ---
export async function openChatWindow(friendId, friendName) {
  state._activeChatFriendId = friendId;
  document.getElementById("chat-friend-name").textContent = friendName;
  document.getElementById("floating-chat-window")?.classList.remove("hidden");
  
  const container = document.getElementById("chat-messages-container");
  container.innerHTML = '<div style="text-align:center; color:#9a9a9a;">Loading...</div>';

  try {
    const res = await fetch(`/chat/history/${encodeURIComponent(friendId)}`);
    const history = await res.json();
    container.innerHTML = "";

    if (!history || history.length === 0) {
      container.innerHTML = '<div style="text-align:center; color:#9a9a9a; margin-top:20px;">No messages yet. Say hi!</div>';
      return;
    }

    history.forEach(msg => appendMessageToChat(msg, friendId));
    container.scrollTop = container.scrollHeight;
  } catch (err) {
    container.innerHTML = '<div style="text-align:center; color:#9a9a9a;">Failed to load chat history.</div>';
  }
}

export function appendMessageToChat(msg, friendId) {
  const container = document.getElementById("chat-messages-container");
  if (!container) return;

  // Clear "Loading" or "No messages" text
  if (container.innerHTML.includes("Loading") || container.innerHTML.includes("No messages")) {
    container.innerHTML = "";
  }

  const isSentByMe = msg.senderEmail !== friendId; // Since friendId is the friend's email/id
  
  const div = document.createElement("div");
  div.className = `chat-message ${isSentByMe ? 'sent' : 'received'}`;
  div.textContent = msg.content;
  
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function sendChatMessage() {
  const input = document.getElementById("chat-input");
  const content = input.value.trim();
  const to = state._activeChatFriendId;

  console.log("Sending chat:", { content, to });

  if (!content || !to) {
    console.error("Missing content or to ID");
    return;
  }
  input.value = "";

  // Send via WebSocket (implemented in ws.js or directly here)
  import("./ws.js").then(({ emitChatMessage }) => {
    console.log("Emitting via ws");
    emitChatMessage(to, content);
  }).catch(console.error);
}

async function searchFriendInModal() {
  const query = document.querySelector(".search-modal-input")?.value.trim();
  if (!query) return;
  const res = await fetch(`/friends/search?username=${query}`);
  const data = await res.json();
  const box = document.querySelector(".friend-search-result");
  if (!box) return;
  box.innerHTML = "";
  if (data.length === 0) { box.innerHTML = '<p style="color:#bbb">No users found 😕</p>'; return; }
  data.forEach(user => {
    const div = document.createElement("div");
    div.className = "request-card";
    div.innerHTML = `<img src="https://cdn-icons-png.flaticon.com/512/847/847969.png" class="request-avatar"><div class="request-info"><span class="request-name">${user.username}</span><span class="request-time">${user.status}</span></div><div class="request-actions">${user.status === "Send Request" ? `<button class="accept-btn" data-user="${user.username}">Send</button>` : `<button class="reject-btn" disabled>${user.status}</button>`}</div>`;
    div.querySelector("[data-user]")?.addEventListener("click", () => sendRequest(user.username));
    box.appendChild(div);
  });
}

async function sendRequest(toUser) {
  const res = await fetch("/friends/send-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: toUser }) });
  const data = await res.json();
  popupAlert(data.message);
  searchFriendInModal();
}

// Global access
window.openProfilePage = openProfilePage;
window.openFriendSection = openFriendSection;
window.profileThreeDot = () => document.getElementById("threedotContent")?.classList.remove("hidden");
