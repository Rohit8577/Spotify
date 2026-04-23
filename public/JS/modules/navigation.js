/**
 * navigation.js — Sidebar navigation, responsive layout, and all nav
 * event listeners that don't belong to a specific feature module.
 */
import { state }                                     from "../state.js";
import { universalPageHandler, addUnique, closePopup } from "./ui.js";
import { fetchPlaylist, librarySongs }               from "./playlist.js";
import { DisplayLiked }                              from "./favorites.js";
import { displayRecently, recentlyDisplay }          from "./recently.js";
import { initializeHomePage }                        from "./home.js";

const mq = window.matchMedia("(max-width: 768px)");

// ─── Build main sidebar (Home / Search / Library) ─────────────────────────────
export function home() {
    const arr = {
        home:    ["Home",       "home"],
        search:  ["Search",     "search"],
        library: ["My Library", "library"]
    };

    const ul = document.querySelector(".sidebar-nav").querySelector("ul");
    if (
        document.getElementById("OnlineSongList")?.classList.contains("hidden") ||
        document.querySelector(".likedSongList")?.classList.contains("hidden")
    ) {
        document.getElementById("OnlineSongList")?.classList.add("hidden");
        document.querySelector(".likedSongList").classList.add("hidden");
    }

    ul.innerHTML = "";
    Object.entries(arr).forEach(([key, value], index) => {
        const li = document.createElement("li");
        li.innerHTML = `<i class='bx bx-${value[1]}'></i> <span>${value[0]}</span>`;

        if (index === 0) {
            li.className = "active";
            homename(value[1], value[0]);
            universalPageHandler();
            addUnique("default-container-parent");
            document.getElementById("default-container-parent").classList.remove("hidden");
        }

        li.addEventListener("click", () => {
            document.querySelectorAll(".sidebar-nav ul li").forEach(item => item.classList.remove("active"));
            homename(value[1], value[0]);
            li.className = "active";

            if (key === "search") {
                if (mq.matches) MQchange();
                document.querySelector("input").focus();
                renderSearch();
            }
            if (key === "library") {
                document.getElementById("leftarrow").classList.remove("hidden");
                setTimeout(() => libraryshow(), 150);
            }
            if (key === "home") {
                universalPageHandler();
                document.getElementById("default-container-parent").classList.remove("hidden");
                if (mq.matches) MQchange();
            }
        });
        ul.appendChild(li);
    });
}

// ─── Build library sub-nav (Playlist / Liked / EQ / Recently / Create) ───────
export function libraryshow() {
    const arr = {
        yplaylist: ["My Playlist",      "headphone"],
        liked:     ["Liked Songs",      "heart"],
        eq:        ["Equilizer",        "equalizer"],
        recently:  ["Recently played",  "music"],
        playlist:  ["Create Playlist",  "plus"]
    };

    const subNav = document.querySelector(".sidebar1").querySelector(".sidebar-nav").querySelector("ul");
    subNav.innerHTML = "";
    document.querySelector(".sidebar").style.display  = "none";
    document.querySelector(".sidebar1").classList.remove("hidden");

    Object.entries(arr).forEach(([key, value], index) => {
        const li = document.createElement("li");
        li.innerHTML = `<i class='bx bx-${value[1]}'></i> <span>${value[0]}</span>`;
        if (index === 0) homename(value[1], value[0]);

        li.addEventListener("click", () => {
            document.querySelectorAll(".sidebar-nav ul li").forEach(item => item.classList.remove("active"));
            homename(value[1], value[0]);
            li.className = "active";

            if (key === "playlist") {
                document.querySelector(".inputPopup").classList.toggle("flex");
                document.querySelector(".inputPopup").classList.toggle("hidden");
                document.getElementById("playlistName").value = "";
                if (mq.matches) MQchange();
                document.getElementById("playlistName").focus();
            }
            if (key === "liked") {
                addUnique("likedSongList");
                universalPageHandler();
                addUnique("likedSongList");
                document.getElementById("likedSongList").classList.remove("hidden");
                DisplayLiked();
                if (mq.matches) MQchange();
            }
            if (key === "yplaylist") {
                document.getElementById("leftarrow").classList.remove("hidden");
                setTimeout(() => fetchPlaylist(), 300);
            }
            if (key === "recently") {
                universalPageHandler();
                addUnique("recentlyPlayForMobile");
                document.getElementById("recentlyPlayForMobile").classList.remove("hidden");
                displayRecently();
                if (mq.matches) MQchange();
            }
            if (key === "eq") {
                universalPageHandler();
                document.getElementById("equalizer").classList.remove("hidden");
                if (mq.matches) MQchange();
            }
        });
        subNav.appendChild(li);
    });
}

// ─── Update the header breadcrumb ────────────────────────────────────────────
export function homename(icon, name) {
    const lib = document.querySelector(".lib");
    lib.innerHTML = `<i class='bx bx-${icon} text-gray-3 text-2xl'></i> <span class="text-gray-3 text-xl font-bold">${name}</span>`;
    lib.addEventListener("click", () => {
        document.querySelector(".left1").style.width  = "5%";
        document.querySelector(".righ1").style.width  = "95%";
    });
}

// ─── Show the search page view ────────────────────────────────────────────────
export function renderSearch() {
    universalPageHandler();
    const searchPage = document.getElementById("Search-History");
    searchPage.classList.remove("hidden");
}

// ─── Responsive layout: initial check ────────────────────────────────────────
export function checkMQ(e) {
    if (e.matches) {
        document.querySelector(".left1").style.width  = "0%";
        document.querySelector(".righ1").style.width  = "100%";
        document.querySelector(".currentPlayingMusic").style.display = "flex";
        document.getElementById("queryPlus").style.display  = "none";
        document.getElementById("currentPlayingName").style.fontSize = "13px";
        document.getElementById("hamburgermenu")?.addEventListener("click", () => MQchange());
    } else {
        document.querySelector(".left1").style.width  = "24%";
        document.querySelector(".righ1").style.width  = "75%";
        document.querySelector(".currentPlayingMusic").style.display = "flex";
        document.getElementById("queryPlus").style.display  = "flex";
        document.getElementById("currentPlayingName").style.fontSize = "16px";
    }
}
mq.addEventListener("change", checkMQ);

// ─── Toggle left/right panel on mobile ───────────────────────────────────────
export function MQchange() {
    const left  = document.querySelector(".left1");
    const right = document.querySelector(".righ1");
    if (left.style.width === "0%") {
        left.style.display = "block";
        left.style.width   = "100%";
        right.style.width  = "0%";
    } else {
        left.style.width   = "0%";
        right.style.width  = "100%";
    }
}

// ─── Wire all top-level navigation event listeners ────────────────────────────
export function initNavListeners(sess) {
    const btn1     = document.getElementById("signUp");
    const btn      = document.getElementById("loginBtn").querySelector("button");
    const search   = document.getElementById("onlineSongSearchSVG");
    const download = document.getElementById("OpenDownloadPage");
    const btn3     = document.getElementById("home-logo");
    const btn2     = document.getElementById("install");

    btn1?.addEventListener("click", () => window.open("/signup"));
    btn?.addEventListener("click",  () => { window.location.href = "/login"; });

    document.getElementById("profile-button")?.addEventListener("click", () =>
        document.getElementById("profile").classList.toggle("visible")
    );
    document.querySelector(".playSignup")?.addEventListener("click",  () => { window.location.href = "/signup"; });
    document.querySelector(".MediaLogin")?.addEventListener("click",  () => { window.location.href = "/login"; });

    document.querySelector(".lib")?.addEventListener("click", () => {
        document.querySelector(".left1-v").classList.toggle("hidden");
        document.querySelector(".left1").classList.toggle("left1-h");
        document.querySelector(".top").classList.toggle("flex");
        document.querySelector(".left1").classList.toggle("width");
        document.getElementsByTagName("p")[6].classList.toggle("none");
        document.getElementsByTagName("svg")[7].classList.toggle("none");
        document.querySelector(".right-box").classList.toggle("width1");
    });

    btn3?.addEventListener("click", () => {
        universalPageHandler();
        document.getElementById("default-container-parent").classList.remove("hidden");
    });

    btn2?.addEventListener("click", () => {
        universalPageHandler();
        document.querySelector(".install-page").style.display = "block";
    });

    search?.addEventListener("click",   () => document.getElementById("search").focus());
    download?.addEventListener("click", () => window.open("download", "_blank"));

    // Session-based UI show/hide
    if (sess) {
        btn.classList.add("hidden");
        document.getElementsByTagName("p")[5].style.display = "none";
        document.querySelector(".line2").style.display = "none";
        document.querySelector(".playSignup").style.display = "none";
        document.getElementsByTagName("p")[1].style.display = "none";
        document.getElementsByTagName("p")[2].style.display = "none";
        document.getElementById("active1").classList.add("active1");
    } else {
        document.querySelector(".right").style.left = "28%";
        document.querySelector(".line2").style.right = "56.5%";
        document.querySelector(".custom-audio").style.display = "none";
        document.querySelector(".left1-v").style.display = "block";
        document.querySelector(".songs").style.display = "none";
    }

    // Arrow2: back button
    document.getElementById("Arrow2")?.addEventListener("click", () => {
        const playlist = document.querySelector(".playlists");
        if (playlist.style.display === "block") {
            playlist.style.display = "none";
            document.querySelector(".sidebar1").classList.remove("hidden");
        } else if (!document.querySelector(".sidebar1").classList.contains("hidden")) {
            document.querySelector(".sidebar").style.display = "flex";
            document.getElementById("leftarrow").classList.add("hidden");
            document.querySelector(".sidebar1").classList.add("hidden");
            home();
            if (mq.matches) MQchange();
        }
    });

    // Shuffle / Repeat cycle
    document.getElementById("Repeat")?.addEventListener("click", () => {
        document.getElementById("ShuffleOff").classList.remove("hidden");
        document.getElementById("Repeat").classList.add("hidden");
        state.ShuffleFlag   = 1;
        state.RepeatFlag    = 0;
        state.RepeatOneFlag = 0;
        window.popupAlert?.("Shuffle On");
    });
    document.getElementById("ShuffleOff")?.addEventListener("click", () => {
        document.getElementById("ShuffleOff").classList.add("hidden");
        document.getElementById("RepeatOnce").classList.remove("hidden");
        window.popupAlert?.("Loop Song");
        state.ShuffleFlag   = 0;
        state.RepeatFlag    = 0;
        state.RepeatOneFlag = 1;
    });
    document.getElementById("RepeatOnce")?.addEventListener("click", () => {
        document.getElementById("RepeatOnce").classList.add("hidden");
        document.getElementById("Repeat").classList.remove("hidden");
        state.ShuffleFlag   = 0;
        state.RepeatFlag    = 1;
        state.RepeatOneFlag = 0;
        window.popupAlert?.("Loop List");
    });

    // Close popup menus on document click
    document.addEventListener("click", () => {
        document.getElementById("playname")?.classList.add("hidden");
        document.querySelectorAll(".dropdown")?.forEach(menu => menu.classList.add("hidden"));
        document.querySelector(".inpSongList").style.display = "none";
    });

    // Playlist search in sidebar
    document.getElementById("recentlyPlayedShow")?.addEventListener("click", () => {
        recentlyDisplay();
        displayRecently();
    });

    // Recently played toggle (keyboard "l" key is wired via initPlayerListeners)

    // Popup close button
    document.querySelector(".close-btn")?.addEventListener("click", () => closePopup());

    // Logo click on mobile
    document.querySelector(".logo1")?.addEventListener("click", () => {
        universalPageHandler();
        document.getElementById("default-container-parent").classList.remove("hidden");
        if (mq.matches) MQchange();
    });

    // Media profile button
    document.getElementById("media-profile-button")?.addEventListener("click", () => {
        document.getElementById("profile").classList.toggle("visible");
    });
}
