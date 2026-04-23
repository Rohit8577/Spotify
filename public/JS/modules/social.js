/**
 * social.js — Profile page, friends system, friend requests,
 *             and playlist sharing. Now fully wired to real endpoints.
 */
import { state }         from "../state.js";
import { escapeHtml }    from "./helpers.js";
import { universalPageHandler, popupAlert } from "./ui.js";
import { librarySongs }  from "./playlist.js";
import { getArtistDetails } from "./detail.js";
import { openChatWith, sendPlaylistShare, sendSongShare, getMyUserId } from "./chat.js";

// ─── Open full profile page ───────────────────────────────────────────────────
export async function openProfilePage() {
    universalPageHandler();
    document.querySelector(".profile-box").classList.remove("visible");
    document.querySelector(".MainProfileContainer").classList.remove("hidden");

    const res    = await fetch("/userprofile");
    const result = await res.json();

    document.querySelector(".profile-name").innerHTML         = result.name;
    document.querySelector(".profile-email").innerHTML        = result.email;
    document.querySelector(".profilePlaylistCount").innerHTML = `${result.lib.length} Playlist`;
    document.querySelector(".profileArtistCount").innerHTML   = `${result.artist.length} Following`;

    // Playlists
    const gridContainer = document.querySelector(".grid-container");
    gridContainer.innerHTML = "";
    result.lib.forEach(item => {
        const tile = makePlaylistTile(item);
        gridContainer.appendChild(tile);
    });

    // Artists
    document.getElementById("profilePageArtist").innerHTML = "";
    result.artist.forEach(async (item) => {
        const response = await fetch(`${state.SAAVN_BASE_URL}/artist?id=${item.id}`);
        const result1  = await response.json();
        const div      = document.createElement("div");
        div.innerHTML  = `<div class="grid-item artist">
                      <img src=${result1.data.image[2]?.link} alt="Artist Picture">
                      <p class="item-title">${result1.data.name}</p>
                    </div>`;
        div.addEventListener("click", () => {
            document.querySelector(".MainProfileContainer").classList.add("hidden");
            document.getElementById("MainHomePage").classList.remove("hidden");
            getArtistDetails(item.id);
        });
        document.getElementById("profilePageArtist").appendChild(div);
    });
}

// ─── Playlist tile with Play + Share buttons ───────────────────────────────────
export function makePlaylistTile(item) {
    const div    = document.createElement("div");
    div.className = "playlist-tile";
    div.innerHTML = `
    <div class="grid-item">
      <img src="${item.image}" alt="Playlist Cover">
      <p class="item-title">${escapeHtml(item.name)}</p>
      <div style="margin-top:8px; display:flex; gap:8px;">
        <button class="btn play-1" data-name="${escapeHtml(item.name)}">Play</button>
        <button class="btn share" data-id="${item.id || item.name}" data-name="${escapeHtml(item.name)}">Share</button>
      </div>
    </div>`;

    div.querySelector(".play-1").addEventListener("click", () => {
        document.querySelector(".MainProfileContainer").classList.add("hidden");
        librarySongs(item.name);
    });
    div.querySelector(".share").addEventListener("click", () => {
        state._playlistToShare = { id: item.id || item.name, name: item.name, image: item.image, songs: item.songs || [] };
        openShareModal(state._playlistToShare);
    });
    return div;
}

// ─── Search users globally (for Add Friend modal) ────────────────────────────
export async function searchUsersForRequest() {
    const input = document.querySelector(".search-modal-input");
    const query = (input?.value || "").trim();
    if (!query) return;

    const res  = await fetch(`/friends/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    const box  = document.querySelector(".friend-search-result");
    box.innerHTML = "";

    if (!data.length) {
        box.innerHTML = `<p style='margin-top:10px; color:#bbb;'>No users found 😕</p>`;
        return;
    }
    data.forEach(user => {
        const div   = document.createElement("div");
        div.className = "request-card";
        div.innerHTML = `
            <div class="request-avatar-placeholder">${(user.name || user.email).slice(0,2).toUpperCase()}</div>
            <div class="request-info">
                <span class="request-name">${escapeHtml(user.name || user.email)}</span>
                <span class="request-time">${escapeHtml(user.email)}</span>
            </div>
            <div class="request-actions">
                ${user.status === "Send Request"
                    ? `<button class="accept-btn send-req-btn">Send</button>`
                    : `<button class="reject-btn" disabled>${escapeHtml(user.status)}</button>`}
            </div>`;
        div.querySelector(".send-req-btn")?.addEventListener("click", () => sendRequest(user.email));
        box.appendChild(div);
    });
}

// ─── Send friend request ──────────────────────────────────────────────────────
export async function sendRequest(toEmail) {
    const res  = await fetch("/friends/send-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: toEmail })
    });
    const data = await res.json();
    popupAlert(data.message || "Request sent!");
    searchUsersForRequest();
}

// ─── Open friends section page ────────────────────────────────────────────────
export async function openFriendSection() {
    universalPageHandler();
    document.getElementById("profile").classList.remove("visible");
    document.getElementById("friends-section").classList.remove("hidden");

    // Load real friends
    try {
        const res     = await fetch("/friends");
        const friends = await res.json();
        state._friendsCache = friends;

        // Fetch online status
        if (friends.length) {
            const ids = friends.map(f => f.id);
            const onlineRes  = await fetch("/friends/online-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userIds: ids })
            });
            const onlineMap = await onlineRes.json();
            friends.forEach(f => { f.online = !!onlineMap[f.id]; });
        }

        renderFriendList(friends);
    } catch (err) {
        console.error("openFriendSection error:", err);
    }

    // Load friend requests
    loadFriendRequests();
}

// ─── Load and render received friend requests in the modal ───────────────────
export async function loadFriendRequests() {
    try {
        const res  = await fetch("/friends/requests");
        const data = await res.json();

        // Received
        const receivedList = document.getElementById("received-requests-list");
        const receivedCount = document.getElementById("received-requests-count");
        if (receivedList) {
            receivedList.innerHTML = "";
            if (receivedCount) receivedCount.textContent = `Received Requests (${data.received?.length || 0})`;
            (data.received || []).forEach(r => {
                const div = document.createElement("div");
                div.className = "request-card";
                div.innerHTML = `
                    <div class="request-avatar-placeholder">${(r.name || r.email).slice(0,2).toUpperCase()}</div>
                    <div class="request-info">
                        <span class="request-name">${escapeHtml(r.name || r.email)}</span>
                        <span class="request-time">${escapeHtml(r.email)}</span>
                    </div>
                    <div class="request-actions">
                        <button class="accept-btn" data-email="${escapeHtml(r.email)}">Accept</button>
                        <button class="reject-btn" data-email="${escapeHtml(r.email)}">Reject</button>
                    </div>`;
                div.querySelector(".accept-btn").addEventListener("click", async () => {
                    await fetch("/friends/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fromEmail: r.email }) });
                    popupAlert(`✅ You and ${r.name || r.email} are now friends!`);
                    loadFriendRequests();
                    openFriendSection();
                });
                div.querySelector(".reject-btn").addEventListener("click", async () => {
                    await fetch("/friends/reject", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fromEmail: r.email }) });
                    popupAlert("Request rejected");
                    loadFriendRequests();
                });
                receivedList.appendChild(div);
            });
            if (!data.received?.length) {
                receivedList.innerHTML = `<p style="color:#9a9a9a; padding:10px">No pending requests</p>`;
            }
        }

        // Sent
        const sentList  = document.getElementById("sent-requests-list");
        const sentCount = document.getElementById("sent-requests-count");
        if (sentList) {
            sentList.innerHTML = "";
            if (sentCount) sentCount.textContent = `Sent Requests (${data.sent?.length || 0})`;
            (data.sent || []).forEach(r => {
                const div = document.createElement("div");
                div.className = "request-card sent";
                div.innerHTML = `
                    <div class="request-avatar-placeholder">${r.email.slice(0,2).toUpperCase()}</div>
                    <div class="request-info">
                        <span class="request-name">${escapeHtml(r.email)}</span>
                        <span class="request-time">Pending</span>
                    </div>`;
                sentList.appendChild(div);
            });
            if (!data.sent?.length) {
                sentList.innerHTML = `<p style="color:#9a9a9a; padding:10px">No sent requests</p>`;
            }
        }
    } catch (err) {
        console.error("loadFriendRequests error:", err);
    }
}

// ─── Render the friends list in the Friends section ───────────────────────────
export function renderFriendList(friends) {
    const container = document.getElementById("friend-cards-container");
    if (!container) return;
    container.innerHTML = "";

    if (!friends.length) {
        container.innerHTML = `<div class="no-friends-msg"><p>No friends yet — add one! 🎵</p></div>`;
        return;
    }

    friends.forEach(f => {
        const div    = document.createElement("div");
        div.className = "friend-card";
        div.innerHTML = `
            <div class="friend-avatar-wrap">
                <div class="friend-avatar-initials">${(f.name || f.email || "?").slice(0,2).toUpperCase()}</div>
                <span class="online-dot ${f.online ? 'online' : 'offline'}" data-uid="${f.id}" title="${f.online ? 'Online' : 'Offline'}"></span>
            </div>
            <div class="friend-info">
                <span class="friend-name">${escapeHtml(f.name || f.email)}</span>
                <span class="friend-status">${f.online ? '● Online' : '○ Offline'}</span>
            </div>
            <div class="friend-actions">
                <button class="message-btn chat-btn" title="Chat">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a9 9 0 0 0-9-9 9 9 0 0 0-9 9c0 1.95.5 3.8 1.5 5.4l-.5 2.1 2.1-.5c1.6.9 3.4 1.5 5.4 1.5a9 9 0 0 0 9-9z"></path></svg>
                </button>
                <button class="message-btn share-btn" title="Share">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                </button>
            </div>`;

        div.querySelector(".chat-btn").addEventListener("click", () => openChatWith(f));
        div.querySelector(".share-btn").addEventListener("click", () => {
            // Share currently playing song, or open playlist share modal
            const song = state.currentSong;
            if (song && song.songId) {
                sendSongShare(f.id, {
                    songId:   song.songId,
                    songName: song.songName,
                    artist:   song.artist,
                    image:    song.image,
                    songUrl:  song.songUrl
                });
                popupAlert(`🎵 Sent "${song.songName}" to ${f.name || f.email}!`);
            } else {
                state._shareTargetFriend = f;
                openShareModal(state._playlistToShare || null, f.id);
            }
        });

        container.appendChild(div);
    });
}

// ─── Search among friends ─────────────────────────────────────────────────────
export async function searchFriend(query) {
    const q = (query || "").trim().toLowerCase();
    if (!q) { renderFriendList(state._friendsCache || []); return; }
    const local = (state._friendsCache || []).filter(f =>
        (f.name || "").toLowerCase().includes(q) ||
        (f.email || "").toLowerCase().includes(q)
    );
    renderFriendList(local);
}

// ─── Share modal (share a playlist with a friend) ────────────────────────────
export function openShareModal(playlistObj = null, preselectFriendId = null) {
    state._playlistToShare = playlistObj;
    document.getElementById("shareModalPlaylistName").textContent =
        playlistObj ? playlistObj.name : "(no playlist selected)";
    document.getElementById("shareModal").classList.remove("hidden");

    const listDiv = document.getElementById("shareFriendList");
    listDiv.innerHTML = "";

    const friends = state._friendsCache || [];
    if (!friends.length) {
        listDiv.innerHTML = `<div style="color:#9a9a9a">No friends to share with.</div>`;
        return;
    }
    friends.forEach(f => {
        const item    = document.createElement("div");
        item.className = "share-friend-item";
        item.innerHTML = `
      <div>
        <div class="share-friend-initials">${(f.name || f.email).slice(0,2).toUpperCase()}</div>
        ${escapeHtml(f.name || f.id)}
        <div style="font-size:12px;color:#9a9a9a">${escapeHtml(f.email || f.id)}</div>
      </div>
      <div><input type="radio" name="shareFriendRadio" value="${f.id}" ${preselectFriendId === f.id ? "checked" : ""} /></div>`;
        listDiv.appendChild(item);
    });

    document.getElementById("shareConfirmBtn").onclick = async () => {
        const checked  = document.querySelector('input[name="shareFriendRadio"]:checked');
        const friendId = (checked && checked.value) || preselectFriendId;
        if (!friendId) return popupAlert("Choose a friend first");
        if (!state._playlistToShare) return popupAlert("Pick a playlist first");
        sendPlaylistShare(friendId, state._playlistToShare);
        document.getElementById("shareModal").classList.add("hidden");
        popupAlert("🎶 Playlist shared!");
    };
}

// ─── Three-dot profile modal ──────────────────────────────────────────────────
export function profileThreeDot() {
    document.getElementById("threedotContent").classList.remove("hidden");
    document.getElementById("threedotModalClose").addEventListener("click", () => {
        document.getElementById("threedotContent").classList.add("hidden");
    });
}

// ─── Wire share/friend modal close buttons & search ──────────────────────────
export function initSocialListeners() {
    // Share modal close
    document.getElementById("shareModalClose")?.addEventListener("click", () => {
        document.getElementById("shareModal").classList.add("hidden");
    });

    // Friend request modal open/close
    // Wait, the button id is add-friend-btn. We handle all elements with that ID or class safely.
    const addFriendBtns = document.querySelectorAll("#add-friend-btn, .add-friend-btn");
    const modal = document.getElementById("friend-request-modal");
    const span  = document.getElementById("friend-modal-close-btn");

    addFriendBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            if (modal) modal.style.display = "flex";
            loadFriendRequests();
        });
    });

    if (span) {
        span.addEventListener("click", () => {
            if (modal) modal.style.display = "none";
        });
    }

    // Use addEventListener instead of overwriting window.onclick
    document.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });

    // Search in Add Friend modal
    document.querySelector(".search-modal-btn")?.addEventListener("click", searchUsersForRequest);
    document.querySelector(".search-modal-input")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") searchUsersForRequest();
    });

    // Friend search in friends section
    document.querySelector(".search-activity-input")?.addEventListener("input", (e) => {
        searchFriend(e.target.value);
    });

    // Now-playing detail panel
    document.getElementById("currentPlayingSongDetails")?.addEventListener("click", () => {
        window.universalPageHandler?.();
        document.getElementById("now-playing-details-page").classList.remove("hidden");
    });
}
