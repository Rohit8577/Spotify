/**
 * recently.js — Recently played songs: update, display, and side-panel toggle.
 */
import { state }            from "../state.js";
import { handleSongClick }  from "./playback.js";

// ─── Save current song to "recently played" on server ─────────────────────────
export async function updateRecently(songUrl, image, songName, artist, len, songId) {
    await fetch("/updateRecently", {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songUrl, image, songName, artist, len, songId })
    });
}

// ─── Fetch recently played and render both desktop + mobile lists ─────────────
export async function displayRecently() {
    const res    = await fetch("/updateRecently");
    const result = await res.json();

    const ul  = document.querySelector(".recentlyPlayed").querySelector("ul");
    const ul2 = document.querySelector(".recentlyPlayedForMobile").querySelector("ul");
    ul.innerHTML  = "";
    ul2.innerHTML = "";

    result.arr.forEach(song => {
        const li = document.createElement("li");
        li.className = "recently-song-item";
        li.innerHTML = `
            <img src="${song.image}" alt="song-img">
            <div class="recently-song-info">
                <p class="song-name"><b>${song.songName}</b></p>
                <p class="recently-artist-name"><b>${song.artist}</b></p>
            </div>`;

        li.addEventListener("click", () => handleSongClick(song, "recently"));

        const liClone = li.cloneNode(true);
        liClone.addEventListener("click", () => handleSongClick(song, "recently_1"));

        ul.appendChild(li);
        ul2.appendChild(liClone);
    });
}

// ─── Toggle the recently-played side panel ────────────────────────────────────
export function recentlyDisplay() {
    const recently = document.querySelector(".recentlyPlayedSong");
    const right    = document.querySelector(".righ1");
    const left     = document.querySelector(".left1");

    if (recently.classList.contains("active")) {
        recently.classList.remove("active");
        right.style.width = "75%";
        left.style.width  = "25%";
    } else {
        recently.classList.add("active");
        right.style.width = "50%";
        left.style.width  = "25%";
    }
}
