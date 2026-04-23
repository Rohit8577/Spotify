/**
 * ui.js — Pure DOM utility functions shared across all modules.
 * No circular dependencies — only imports state.
 */
import { state } from "../state.js";

// ─── Highlight currently playing song in any list ────────────────────────────
export function highlight(name, source) {
    if (source === "OnlineSongList") {
        const listItems = document.getElementById("LibrarySongList").querySelectorAll("li");
        listItems.forEach(item => {
            item.classList.remove("playing");
            const songName = item.querySelector("span")?.innerText?.trim();
            if (songName === name.trim()) item.classList.add("playing");
        });

    } else if (source === "Liked") {
        document.querySelectorAll(".likedSongList li").forEach(item => {
            item.classList.remove("playing");
            if (item.querySelector(".song-name")?.innerHTML?.trim() === name) item.classList.add("playing");
        });

    } else if (source === "recently") {
        document.querySelectorAll(".recentlyPlayed li").forEach(item => {
            item.classList.remove("playing");
            if (item.querySelector(".song-name")?.textContent?.trim() === name) item.classList.add("playing");
        });

    } else if (source === "recently_1") {
        document.querySelectorAll(".recentlyPlayedForMobile li").forEach(item => {
            item.classList.remove("playing");
            if (item.querySelector(".song-name")?.textContent?.trim() === name) item.classList.add("playing");
        });

    } else if (source === "album") {
        document.querySelectorAll(".song-list-item .song-info .song-name").forEach(item => {
            item.classList.remove("playing");
            if (item?.textContent.trim() === name) item.classList.add("playing");
        });

    } else if (source === "artist") {
        document.querySelectorAll(".song-list-item.artistTopSongs .song-info .song-title").forEach(item => {
            item.classList.remove("playing");
            if (item?.textContent.trim() === name) item.classList.add("playing");
        });

    } else if (source === "playlist") {
        document.querySelectorAll(".playlist-song-title").forEach(item => {
            item.classList.remove("playing");
            if (item.textContent.trim() === name) item.classList.add("playing");
        });
    }
}

// ─── Toast / popup notification ───────────────────────────────────────────────
export function popupAlert(message) {
    const el = document.getElementById("popupmessage");
    el.classList.remove("hidden");
    el.innerHTML = message;
    setTimeout(() => el.classList.add("hidden"), 2500);
}

// ─── Close the create-playlist popup ─────────────────────────────────────────
export function closePopup() {
    document.querySelector(".inputPopup").classList.toggle("flex");
    document.querySelector(".inputPopup").classList.toggle("hidden");
}

// ─── Set currentSong + load default library for "Add to Playlist" ────────────
export async function updateInitialPlaylist(id) {
    state.currentSong = id;
    const res = await fetch("/fetchplaylist");
    const result = await res.json();
    state.globalLibrary = result.array[0]?.name || "";
}

// ─── Download a song (browser or Android WebView) ─────────────────────────────
export async function downloadSong(songUrl, filename) {
    try {
        const response = await fetch(songUrl, { mode: "cors" });
        const blob = await response.blob();

        if (window.Android && window.Android.processBlobData) {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = function () {
                window.Android.processBlobData(reader.result, filename, blob.type);
            };
            console.log("Sent to Android App for download");
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename || "download.mp3";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    } catch (err) {
        console.error("Download failed", err);
    }
}

// ─── Universal page hider: hides all major view containers ───────────────────
export function universalPageHandler() {
    const ids = [
        "mainSongContent", "likedSongList", "MainProfileContainer",
        "default-container-parent", "Search-History", "MainHomePage-2",
        "friends-section", "now-playing-details-page", "recentlyPlayForMobile", "equalizer"
    ];
    ids.forEach(id => document.getElementById(id)?.classList.add("hidden"));
}

// ─── Back-button stack: add unique entry ─────────────────────────────────────
export function addUnique(value) {
    const index = state.backButtonArray.indexOf(value);
    if (index !== -1) state.backButtonArray.splice(index, 1);
    state.backButtonArray.push(value);
}
