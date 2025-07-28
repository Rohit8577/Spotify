const playlists = [
  {
    title: "Coding Vibes",
    description: "Lo-fi beats for deep focus",
    image: "https://i.scdn.co/image/ab67706f000000029dd3cd00bde0c3ea3beec2e6"
  },
  {
    title: "Workout Boost",
    description: "High energy tracks",
    image: "https://i.scdn.co/image/ab67706f00000002c54ac7b6d6c84b78147df2d8"
  },
  {
    title: "Romantic Hits",
    description: "Feel the love",
    image: "https://i.scdn.co/image/ab67706f00000002dd13c0cf6f2c21c1b7e16c2f"
  }
];

const playlistContainer = document.getElementById("playlistContainer");

playlists.forEach(playlist => {
  const div = document.createElement("div");
  div.className = "playlist-card";
  div.innerHTML = `
    <img src="${playlist.image}" alt="${playlist.title}">
    <h4>${playlist.title}</h4>
    <p>${playlist.description}</p>
  `;
  div.addEventListener("click", () => {
    alert(`Opening playlist: ${playlist.title}`);
  });
  playlistContainer.appendChild(div);
});
