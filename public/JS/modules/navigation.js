// ============================================================
// Navigation Module — Sidebar, page switching, responsive
// ============================================================
import state from "./state.js";

const mq = window.matchMedia("(max-width: 768px)");

export function universalPageHandler() {
  const ids = ["mainSongContent","likedSongList","MainProfileContainer","default-container-parent","Search-History","MainHomePage-2","friends-section","now-playing-details-page","recentlyPlayForMobile","equalizer"];
  ids.forEach(id => document.getElementById(id)?.classList.add("hidden"));
}

export async function navigateTo(routeObj, isBack = false) {
  if (!isBack) {
    // Only push if it's different from the current top of the stack
    const topRoute = state.navigationStack[state.navigationStack.length - 1];
    if (!topRoute || JSON.stringify(topRoute) !== JSON.stringify(routeObj)) {
      state.navigationStack.push(routeObj);
    }
  }

  universalPageHandler();
  document.getElementById(routeObj.view)?.classList.remove("hidden");

  // If this is a detail view, we need to dynamically re-fetch the details
  if (routeObj.view === "MainHomePage-2") {
    if (routeObj.type === "artist") {
      const { getArtistDetails } = await import("./home.js");
      getArtistDetails(routeObj.id, true); // true indicates it's a back navigation so don't push again
    } else if (routeObj.type === "album") {
      const { getAlbumDetails } = await import("./home.js");
      getAlbumDetails(routeObj.id, true);
    } else if (routeObj.type === "playlist") {
      const { getPlayListDetails } = await import("./home.js");
      getPlayListDetails(routeObj.id, routeObj.name, routeObj.image, true);
    }
  } else if (routeObj.view === "Search-History") {
    // Assuming search logic needs re-init if needed
  }
}

export function goBack() {
  if (state.navigationStack.length <= 1) return; // Can't go back further
  
  // Pop current
  state.navigationStack.pop();
  
  // Get previous
  const prevRoute = state.navigationStack[state.navigationStack.length - 1];
  if (prevRoute) {
    navigateTo(prevRoute, true);
  }
}

// Bind the global back button
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("global-back-btn")?.addEventListener("click", goBack);
});

export function homename(icon, name) {
  const lib = document.querySelector(".lib");
  if (lib) lib.innerHTML = `<i class='bx bx-${icon} text-gray-3 text-2xl'></i> <span class="text-gray-3 text-xl font-bold">${name}</span>`;
}

export function closePopup() {
  document.querySelector(".inputPopup")?.classList.toggle("flex");
  document.querySelector(".inputPopup")?.classList.toggle("hidden");
}

export function MQchange() {
  const left = document.querySelector(".left1");
  const right = document.querySelector(".righ1");
  
  // Treat empty string, 0%, or 0px as closed
  if (!left.style.width || left.style.width === "0%" || left.style.width === "0px") { 
    left.style.display = "block"; 
    left.style.width = "100%"; 
    right.style.width = "0%"; 
    right.style.display = "none"; // Hide right content to avoid overlap
  } else { 
    left.style.width = "0%"; 
    left.style.display = "none";
    right.style.width = "100%"; 
    right.style.display = "block";
  }
}

export function checkMQ(e) {
  if (e.matches) {
    document.querySelector(".left1").style.width = "0%";
    document.querySelector(".left1").style.display = "none";
    document.querySelector(".righ1").style.width = "100%";
    document.querySelector(".righ1").style.display = "block";
    const cpm = document.querySelector(".currentPlayingMusic");
    if (cpm) cpm.style.display = "flex";
    const qp = document.getElementById("queryPlus");
    if (qp) qp.style.display = "none";
    const cpn = document.getElementById("currentPlayingName");
    if (cpn) cpn.style.fontSize = "13px";
  } else {
    document.querySelector(".left1").style.width = "";
    document.querySelector(".left1").style.display = "";
    document.querySelector(".righ1").style.width = "";
    document.querySelector(".righ1").style.display = "";
    const cpm = document.querySelector(".currentPlayingMusic");
    if (cpm) cpm.style.display = "flex";
    const qp = document.getElementById("queryPlus");
    if (qp) qp.style.display = "flex";
    const cpn = document.getElementById("currentPlayingName");
    if (cpn) cpn.style.fontSize = "16px";
  }
}

export function initNavigation() {
  // Sidebar navigation
  function home() {
    const arr = { home: ["Home","home"], search: ["Search","search"], library: ["My Library","library"] };
    const sidebarUl = document.querySelector(".sidebar-nav")?.querySelector("ul");
    if (sidebarUl) sidebarUl.innerHTML = "";
    Object.entries(arr).forEach(([key, value], index) => {
      const li = document.createElement("li");
      li.innerHTML = `<i class='bx bx-${value[1]}'></i> <span>${value[0]}</span>`;
      if (index === 0) { li.className = "active"; homename(value[1], value[0]); navigateTo({ view: "default-container-parent" }); }
      li.addEventListener("click", async () => {
        document.querySelectorAll(".sidebar-nav ul li").forEach(i => i.classList.remove("active"));
        homename(value[1], value[0]); li.className = "active";
        if (key === "search") { if (mq.matches) MQchange(); document.querySelector("input")?.focus(); renderSearch(); }
        if (key === "library") {
          if (sess !== true) { window.location.href = "/signup"; return; }
          document.getElementById("leftarrow")?.classList.remove("hidden"); setTimeout(() => libraryshow(), 150);
        }
        if (key === "home") { navigateTo({ view: "default-container-parent" }); if (mq.matches) MQchange(); }
      });
      const navUl = document.querySelector(".sidebar-nav")?.querySelector("ul");
      if (navUl) navUl.appendChild(li);
    });
  }

  function renderSearch() { navigateTo({ view: "Search-History" }); }

  function libraryshow() {
    const arr = { yplaylist:["My Playlist","headphone"], liked:["Liked Songs","heart"], mixplaylist:["Mix Playlists","shuffle"], eq:["Equilizer","equalizer"], recently:["Recently played","music"], playlist:["Create Playlist","plus"] };
    document.querySelector(".sidebar1 .sidebar-nav ul").innerHTML = "";
    document.querySelector(".sidebar").style.display = "none";
    document.querySelector(".sidebar1")?.classList.remove("hidden");
    Object.entries(arr).forEach(([key, value], index) => {
      const li = document.createElement("li");
      li.innerHTML = `<i class='bx bx-${value[1]}'></i> <span>${value[0]}</span>`;
      if (index === 0) homename(value[1], value[0]);
      li.addEventListener("click", async () => {
        document.querySelectorAll(".sidebar-nav ul li").forEach(i => i.classList.remove("active"));
        homename(value[1], value[0]); li.className = "active";
        if (key === "playlist") { document.querySelector(".inputPopup")?.classList.toggle("flex"); document.querySelector(".inputPopup")?.classList.toggle("hidden"); document.getElementById("playlistName").value = ""; if (mq.matches) MQchange(); document.getElementById("playlistName")?.focus(); }
        if (key === "liked") { navigateTo({ view: "likedSongList" }); const { DisplayLiked } = await import("./favorites.js"); DisplayLiked(); if (mq.matches) MQchange(); }
        if (key === "yplaylist") { document.getElementById("leftarrow")?.classList.remove("hidden"); setTimeout(async () => { const { fetchPlaylist } = await import("./playlist.js"); fetchPlaylist(); }, 300); }
        if (key === "recently") { navigateTo({ view: "recentlyPlayForMobile" }); const { displayRecently } = await import("./recently.js"); displayRecently(); if (mq.matches) MQchange(); }
        if (key === "eq") { navigateTo({ view: "equalizer" }); if (mq.matches) MQchange(); }
        if (key === "mixplaylist") { const { openMultiPlaylistSelector } = await import("./multiPlaylist.js"); openMultiPlaylistSelector(); if (mq.matches) MQchange(); }
      });
      document.querySelector(".sidebar1 .sidebar-nav ul").appendChild(li);
    });
  }

  // Mobile Bottom Navigation logic
  document.getElementById("mobileNavHome")?.addEventListener("click", () => {
    document.querySelectorAll(".mobile-nav-item").forEach(el => el.classList.remove("active"));
    document.getElementById("mobileNavHome").classList.add("active");
    const left = document.querySelector(".left1");
    const right = document.querySelector(".righ1");
    if (mq.matches) {
      left.style.width = "0%"; 
      left.style.display = "none";
      right.style.width = "100%";
      right.style.display = "block";
    }
    navigateTo({ view: "default-container-parent" });
  });

  document.getElementById("mobileNavSearch")?.addEventListener("click", () => {
    document.querySelectorAll(".mobile-nav-item").forEach(el => el.classList.remove("active"));
    document.getElementById("mobileNavSearch").classList.add("active");
    const left = document.querySelector(".left1");
    const right = document.querySelector(".righ1");
    if (mq.matches) {
      left.style.width = "0%"; 
      left.style.display = "none";
      right.style.width = "100%";
      right.style.display = "block";
    }
    renderSearch();
    document.querySelector("input")?.focus();
  });

  document.querySelector(".lib")?.addEventListener("click", () => {
    if (sess !== true) {
      import("./utils.js").then(({ popupAlert }) => popupAlert("Please Sign Up to access Library"));
      return;
    }
    document.querySelectorAll(".mobile-nav-item").forEach(el => el.classList.remove("active"));
    document.getElementById("leftarrow")?.classList.remove("hidden");
    setTimeout(() => libraryshow(), 150);
    const left = document.querySelector(".left1");
    const right = document.querySelector(".righ1");
    if (mq.matches) {
      left.style.display = "block";
      left.style.width = "100%";
      right.style.width = "0%";
      right.style.display = "none";
    }
    renderSearch();
    document.querySelector("input")?.focus();
  });

  document.getElementById("mobileNavLibrary")?.addEventListener("click", () => {
    if (sess !== true) {
      import("./utils.js").then(({ popupAlert }) => popupAlert("Please Sign Up to access Library"));
      return;
    }
    document.querySelectorAll(".mobile-nav-item").forEach(el => el.classList.remove("active"));
    document.getElementById("mobileNavLibrary").classList.add("active");
    // Force show sidebar (library view) for mobile
    const left = document.querySelector(".left1");
    const right = document.querySelector(".righ1");
    if (mq.matches) {
      left.style.display = "block"; 
      left.style.width = "100%"; 
      right.style.width = "0%";
      right.style.display = "none";
    }
    document.getElementById("leftarrow")?.classList.remove("hidden"); 
    setTimeout(() => libraryshow(), 150);
  });

  // Hamburger Menu logic
  document.getElementById("hamburgermenu")?.addEventListener("click", MQchange);

  // Init sidebar
  home();
  checkMQ(mq);
  mq.addEventListener("change", checkMQ);

  // Sidebar collapse toggle
  const collapseBtn = document.getElementById("sidebarCollapseBtn");
  if (collapseBtn) {
    // Always start open on desktop; removed localStorage forced collapse on load
    collapseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const left = document.querySelector(".left1");
      if (!left) return;
      left.classList.toggle("collapsed");
      localStorage.setItem("sidebarCollapsed", left.classList.contains("collapsed"));
    });
  }

  // Back button
  document.getElementById("Arrow2")?.addEventListener("click", () => {
    const playlist = document.querySelector(".playlists");
    if (playlist?.style.display === "block") { playlist.style.display = "none"; document.querySelector(".sidebar1")?.classList.remove("hidden"); }
    else if (!document.querySelector(".sidebar1")?.classList.contains("hidden")) { document.querySelector(".sidebar").style.display = "flex"; document.getElementById("leftarrow")?.classList.add("hidden"); document.querySelector(".sidebar1")?.classList.add("hidden"); home(); if (mq.matches) MQchange(); }
  });

  // Home logo
  document.getElementById("home-logo")?.addEventListener("click", () => { navigateTo({ view: "default-container-parent" }); });

  // Logo1 click
  document.querySelector(".logo1")?.addEventListener("click", () => { navigateTo({ view: "default-container-parent" }); if (mq.matches) { const right = document.querySelector(".righ1"); right.style.width = "100%"; document.querySelector(".left1").style.width = "0%"; } });

  // Close btn
  document.querySelector(".close-btn")?.addEventListener("click", closePopup);

  // Profile button
  document.getElementById("profile-button")?.addEventListener("click", () => document.getElementById("profile")?.classList.toggle("visible"));
  document.getElementById("media-profile-button")?.addEventListener("click", () => document.getElementById("profile")?.classList.toggle("visible"));

  // Search SVG focus
  document.getElementById("onlineSongSearchSVG")?.addEventListener("click", () => document.getElementById("search")?.focus());

  // Sign up / login buttons
  document.getElementById("signUp")?.addEventListener("click", () => window.open("/signup"));
  document.getElementById("loginBtn")?.querySelector("button")?.addEventListener("click", () => window.location.href = "/login");
  document.querySelector(".playSignup")?.addEventListener("click", () => window.location.href = "/signup");
  document.querySelector(".MediaLogin")?.addEventListener("click", () => window.location.href = "/login");

  // Click to close popups
  document.addEventListener("click", (e) => {
    document.getElementById("playname")?.classList.add("hidden");
    document.querySelectorAll(".dropdown")?.forEach(m => m.classList.add("hidden"));
    const inpList = document.querySelector(".inpSongList");
    if (inpList) inpList.style.display = "none";
    document.querySelectorAll(".playlist-dropdown-1").forEach(d => d.classList.add("hidden"));
  });

  // Current playing song details click
  document.getElementById("currentPlayingSongDetails")?.addEventListener("click", async () => { navigateTo({ view: "now-playing-details-page" }); });

  // Recently played button
  document.getElementById("recentlyPlayedShow")?.addEventListener("click", async () => { const { recentlyDisplay, displayRecently } = await import("./recently.js"); recentlyDisplay(); displayRecently(); });

  // Session-based UI
  if (sess) {
    // Hide login/signup elements for logged-in users
    document.getElementById("loginBtn")?.querySelector("button")?.classList.add("hidden");
    const playSignupEl = document.querySelector(".playSignup");
    if (playSignupEl) playSignupEl.style.display = "none";
    const signUpEl = document.getElementById("signUp");
    if (signUpEl) signUpEl.style.display = "none";
  } else {
    // Guest mode — show player controls, hide profile and auth-only elements
    const profileBtn = document.getElementById("profile-button");
    if (profileBtn) profileBtn.style.display = "none";
    // Hide left sidebar auth content
    const left1vEl = document.querySelector(".left1-v");
    if (left1vEl) left1vEl.style.display = "none";
  }
}
