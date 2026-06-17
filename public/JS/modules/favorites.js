// ============================================================
// Favorites Module
// Liked songs: add/remove, display, heart toggle
// ============================================================

import state from "./state.js";
import { popupAlert, logBehavior, highlight } from "./utils.js";
import { playsong } from "./player.js";

export async function favorite(url, image, name, artist, len, songId) {
  const res = await fetch("/favorite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, image, name, artist, len, songId }),
  });
  const result = await res.json();

  if (res.status === 200) {
    console.log("❤️ User Liked:", name);
    logBehavior({ type: "like", song: { songName: name, songId, artist } });
  }
  popupAlert(result.msg);
}

export async function DisplayLiked() {
  const res = await fetch("/get-favorite");
  const result = await res.json();
  renderLikedSongs(result.arr);
}

function renderLikedSongs(songs) {
  const list = document.querySelector(".likedSongList")?.querySelector("ul");
  const warning = document.getElementById("warning1");
  if (!list) return;
  warning?.classList.add("hidden");
  list.innerHTML = "";

  if (!songs || songs.length === 0) {
    warning?.classList.remove("hidden");
    if (warning) warning.innerHTML = "No Liked Song";
    return;
  }

  songs.forEach((song) => {
    const li = document.createElement("li");
    li.innerHTML = `<div class="premium-song-row">
      <div class="song-col-main">
        <img src="${song.image}" alt="Song Image">
        <div class="song-info-text">
          <p class="song-title-text">${song.songName}</p>
          <p class="artist-name-text">${song.artist || "Unknown Artist"}</p>
        </div>
      </div>
      <div class="song-col-duration">
        <span>${Math.floor(song.len / 60)}:${Math.floor(song.len % 60).toString().padStart(2, "0")}</span>
      </div>
      <div class="song-col-action">
        <i class='bx bxs-heart liked-heart-icon text-danger'></i>
      </div>
    </div>`;

    li.addEventListener("click", async () => {
      state.globalLibrary = "Liked";
      highlight(song.songName, "Liked");
      state.currentSong = song.songId;
      const { currentPlayingSongDetails } = await import("./songDetails.js");
      currentPlayingSongDetails(song.songId);
      playsong(song.image, song.songName, song.artist, song.songId, song.songUrl, song.len);
    });

    li.querySelector(".liked-heart-icon").addEventListener("click", async (e) => {
      e.stopPropagation();
      await favorite(song.songUrl, song.image, song.songName, song.artist, song.len, song.songId);
      await DisplayLiked();
    });

    list.appendChild(li);
  });
}

export async function addFavorite(e, songUrl, image, name, artist, duration, index, songId) {
  e.stopPropagation();
  await favorite(songUrl, image, name, artist, duration, songId);
  const heart = document.getElementById(`heart-${index}`);
  if (heart) {
    heart.style.color = heart.style.color === "red" ? "gray" : "red";
  }
}

export async function addSearchSongFavorite(event, index, songId) {
  event.stopPropagation();
  const res = await fetch(`${state.SAAVN_BASE_URL}/song?id=${songId}`);
  const result = await res.json();
  const song = result.data[0];
  addFavorite(event, song.downloadUrl[4].url, song.image[2].url, song.name, song.artists.primary[0].name, song.duration, index, song.id);
}
