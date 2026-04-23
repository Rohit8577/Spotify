/**
 * dropdown.js — Inline playlist-add dropdown for album / artist / playlist detail views.
 */
import { state } from "../state.js";
import { plus }  from "./playlist.js";

// ─── Toggle the per-song "add to playlist" dropdown ───────────────────────────
export async function toggleDropdown(event, index, songUrl, songName, songImage, songLength, artist, songId) {
    event.stopPropagation();

    const div = document.createElement("div");
    div.className = "shadow-lg hidden playlist-dropdown-1";
    div.id = `dropdown-${index}`;
    div.innerHTML = `<div class="h-full w-full flex items-center justify-center text-lg font-bold font-fam-2 text-white hidden"></div>
              <ul class="flex flex-col gap-1 justify-center"></ul>`;

    document.getElementById(`albumPlusIcon-${index}`).appendChild(div);

    // Close all other open dropdowns
    document.querySelectorAll(".playlist-dropdown-1").forEach(d => d.classList.add("hidden"));
    document.getElementById(`dropdown-${index}`).classList.toggle("hidden");

    await fetchplaylistList(index, songUrl, songName, songImage, songLength, artist, songId);
}

// ─── Populate the dropdown with the user's playlists ─────────────────────────
export async function fetchplaylistList(index, songUrl, songName, songImg, songLength, artist, songId) {
    const res    = await fetch("/fetchplaylist");
    const result = await res.json();
    const ul     = document.getElementById(`dropdown-${index}`).querySelector("ul");
    ul.innerHTML = "";

    for (const song of result.array) {
        const response = await fetch("/tickSymbol", {
            method: "post",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: songUrl, pname: song.name })
        });
        const results = await response.json();
        const check   = results.msg === "exists";

        const li = document.createElement("li");
        li.className = "flex gap-2 items-center justify-between transition btn-hover btn-act pointer";
        li.innerHTML = `<div class="flex gap-4 items-center">
            <img src="${song.image}" alt="" class="rounded img">
            <p class="font-bold">${song.name}</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" id="TickCircle" class="svg-2" style="display: ${check ? "block" : "none"} ;">
            <path d="M12,22A10,10,0,1,0,2,12,10,10,0,0,0,12,22ZM8.293,11.293a.9994.9994,0,0,1,1.414,0L11,12.5859,14.293,9.293a1,1,0,0,1,1.414,1.414l-4,4a.9995.9995,0,0,1-1.414,0l-2-2A.9994.9994,0,0,1,8.293,11.293Z" fill="#0fff00" class="color000000 svgShape"></path>
          </svg>`;

        li.addEventListener("click", () => {
            plus(songName, songImg, songUrl, artist, song.name, songLength, songId);
            document.querySelectorAll(".playlist-dropdown-1").forEach(d => d.classList.add("hidden"));
        });
        ul.appendChild(li);
    }
}

// ─── Fetch song by ID first, then open the dropdown ──────────────────────────
export async function songToggleDropdown(event, index, songId) {
    event.stopPropagation();
    const res    = await fetch(`${state.SAAVN_BASE_URL}/song?id=${songId}`);
    const result = await res.json();
    const song   = result.data[0];
    toggleDropdown(event, index,
        song.downloadUrl[4].url, song.name, song.image[2].url,
        song.duration, song.artists.primary[0].name, song.id);
}

// ─── Close any open dropdown when clicking elsewhere ─────────────────────────
export function initDropdownCloseListener() {
    document.addEventListener("click", () => {
        document.querySelectorAll(".playlist-dropdown-1").forEach(d => d.classList.add("hidden"));
    });
}
