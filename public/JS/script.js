let btn1 = document.getElementById("signUp")
let btn = document.getElementsByTagName("button")[0]
let search = document.getElementsByTagName("svg")[3]
let download = document.getElementsByTagName("b")[3]
let btn3 = document.getElementById("home-logo")
let btn2 = document.getElementById("install")
let btn5 = document.getElementById("browse")
const seekBar1 = document.getElementById("seekBar1");
const fillBar = document.getElementById("fillBar");
const playBar = document.getElementById("playbar-cont");
const PlayFillBar = document.getElementById("playbar-fill");
const player = document.getElementById("player");
const currentTimeSpan = document.getElementById("currentTime");
const durationSpan = document.getElementById("duration");
const playbarFill = document.getElementById("playbar-fill");
const searchInput = document.getElementById('search');
const resultsList = document.getElementById('results');
let currentSong = null
let Draging = false;
let isDragging = false;
let shufflePname = ""
let globalLibrary = ""
let ShuffleFlag = 0
let RepeatFlag = 1
let globalSongName = ""
let RepeatOneFlag = -1
let LastIndex = -1
btn1.addEventListener("click", () => {
    window.open("/signup")
})
btn.addEventListener("click", () => {
    window.location.href = "/login"
})
document.getElementById("profile-button")?.addEventListener("click", () => {
    document.getElementById("profile").classList.toggle("visible")
})
document.querySelector(".playSignup").addEventListener("click", () => {
    window.location.href = "/signup"
})
document.getElementsByTagName("button")[11].addEventListener("click", () => {
    window.location.href = "/signup"
})
document.querySelector(".lib").addEventListener("click", () => {
    document.querySelector(".left1-v").classList.toggle("hidden")
    document.querySelector(".left1").classList.toggle("left1-h")
    document.querySelector(".top").classList.toggle("flex")
    document.querySelector(".left1").classList.toggle("width")
    document.getElementsByTagName("p")[6].classList.toggle("none")
    document.getElementsByTagName("svg")[7].classList.toggle("none")
    document.querySelector(".right-box").classList.toggle("width1")
})

btn3.addEventListener("click", () => {
    HomePage()
})

btn2.addEventListener("click", () => {
    document.querySelector(".likedSongList").classList.add("hidden")
    document.querySelector(".OnlineSongList").classList.add("hidden")
    document.querySelector(".no-login").style.display = "none"
    document.querySelector(".right-top").style.display = "none"
    document.querySelector(".title").style.display = "none"
    document.querySelector(".music-box").style.display = "none"
    document.querySelector(".music-line").style.display = "none"
    document.getElementsByTagName("svg")[4].style.fill = "gray"
    document.querySelector(".install-page").style.display = "block"
    document.querySelector(".browse-box").style.display = "none"
    document.querySelector(".right-box").style.cssText = "overflow: scroll; overflow-x: hidden"
})


btn5.addEventListener("click", () => {
    document.querySelector(".browse-box").style.display = "block"
    document.querySelector(".install-page").style.display = "none"
    document.querySelector(".right-top").style.display = "none"
    document.querySelector(".title").style.display = "none"
    document.querySelector(".music-box").style.display = "none"
    document.querySelector(".right-box").style.cssText = "overflow: scroll; overflow-x: hidden"
    document.querySelector(".music-line").style.display = "none"
    document.getElementsByTagName("svg")[4].style.fill = "white"
    document.querySelector(".no-login").style.display = "none"
})

if (sess) {
    fetchSongs();
    document.querySelector(".left1").style.height = "80.5vh";
    document.getElementsByTagName("p")[5].style.display = "none"
    document.getElementsByTagName("button")[0].style.display = "none"
    // document.getElementsByTagName("svg")[5].style.cssText = "display: block; position: relative; right: 80%;";
    // document.getElementsByClassName("support")[0].style.cssText = "position: relative; right: 30%;";
    // document.getElementsByClassName("ins")[0].style.cssText = "position: relative; right: 100%;";
    document.querySelector(".line2").style.display = "none"
    document.querySelector(".playSignup").style.display = "none"
    document.getElementsByTagName("p")[1].style.display = "none"
    document.getElementsByTagName("p")[2].style.display = "none"
    document.getElementById("active1").classList.add("active1");
} else {
    document.querySelector(".right").style.left = "28%"
    document.querySelector(".line2").style.right = "56.5%"
    document.querySelector(".custom-audio").style.display = "none";
    document.querySelector(".left1-v").style.display = "block";
    document.querySelector(".songs").style.display = "none";
}

search.addEventListener("click", () => {
    document.querySelector("input").focus()
})

download.addEventListener("click", () => {
    window.open("download")
})

//Dom Load Ka Function
document.addEventListener("DOMContentLoaded", async () => {

    if (sess === true) {
        const dropdown = document.getElementById("playlist-dropdown");
        document.querySelector(".no-login").style.display = "none"
        //document.querySelector(".add").classList.remove("hidden")
        document.querySelector(".currentPlayingMusic").style.display = "flex"
        document.getElementById("percent").innerHTML = `${Math.round(document.getElementById("player").volume * 100)}%`
        document.getElementById("fillBar").style.width = `100%`
        //fetchPlaylist()
        home()

        //librarySongs()
    } else {
        document.querySelector(".no-login").style.display = "flex"
        document.querySelector(".currentPlayingMusic").style.display = "none"

    }
})

//Back Wala Button Jisse Playlists wapas Aa jata hai
document.getElementById("Arrow2").addEventListener("click", () => {
    const playlist = document.querySelector(".playlists")

    if (playlist.style.display === "block") {
        playlist.style.display = "none"
        document.querySelector(".sidebar1").classList.remove("hidden")

    } else if (!document.querySelector(".sidebar1").classList.contains("hidden")) {
        document.querySelector(".sidebar").style.display = "flex"
        document.getElementById("leftarrow").classList.add("hidden")
        document.querySelector(".sidebar1").classList.add("hidden")
        home()
    } else if (!document.querySelector(".sidebar1").classList.contains("hidden")) {
        document.querySelector(".sidebar1").classList.add("hidden")
        document.querySelector(".sidebar").style.display = "flex"
        home()
    }

})

document.getElementById("Repeat").addEventListener("click", () => {
    document.getElementById("ShuffleOff").classList.remove("hidden")
    document.getElementById("Repeat").classList.add("hidden")
    ShuffleFlag = 1
    RepeatFlag = 0
    RepeatOneFlag = 0
    popupAlert("Shuffle On")
})

document.getElementById("ShuffleOff").addEventListener("click", () => {
    document.getElementById("ShuffleOff").classList.add("hidden")
    document.getElementById("RepeatOnce").classList.remove("hidden")
    popupAlert("Loop Song")
    ShuffleFlag = 0
    RepeatFlag = 0
    RepeatOneFlag = 1
})

document.getElementById("RepeatOnce").addEventListener("click", () => {
    document.getElementById("RepeatOnce").classList.add("hidden")
    document.getElementById("Repeat").classList.remove("hidden")
    ShuffleFlag = 0
    RepeatFlag = 1
    RepeatOneFlag = 0
    popupAlert("Loop List")
})


//Document pe click karne pe playlist wala aur online song search wala popup close
document.addEventListener("click", (e) => {
    document.getElementById("playname")?.classList.add("hidden")
    document.querySelectorAll(".dropdown")?.forEach(menu => menu.classList.add("hidden"));
    document.querySelector(".inpSongList").style.display = "none"
})

function redirect() {
    window.open("https://apps.microsoft.com/store/detail/9NCBCSZSJRSB?launch=true&amp;mode=mini&amp;cid=spotifyweb-store-button", "_blank")
}

//System Ke Local Songs Ko Fetch Karne Ka Function
async function fetchSongs() {
    try {
        const response = await fetch("/get-songs");
        const songs = await response.json();
        const songList = document.querySelector(".songs");
        const audioPlayer = document.getElementById("player");
        let currentSongIndex = 0;

        songs.forEach((song, index) => {
            const li = document.createElement("li");
            li.textContent = song.replace(/\.mp3|.mp4|#|\[|\]|\bvideo\b/gi, " ").trim();
            li.addEventListener("click", () => {
                currentSongIndex = index;
                playSong();
            });
            songList.appendChild(li);
        });

        function playSong() {
            audioPlayer.src = `/songs/${songs[currentSongIndex]}`;
            audioPlayer.pause();
            playpause()
            document.querySelectorAll(".songs li").forEach(item => {
                item.classList.remove("playing");
            });
            songList.children[currentSongIndex].classList.add("playing");
            audioPlayer.onerror = () => {
                console.error(`Error playing song: ${songs[currentSongIndex]}`);
                currentSongIndex = (currentSongIndex + 1) % songs.length;
                playSong();
            };
        }

        document.getElementById("play-svg").style.display = "none"
        document.getElementById("play-svg").addEventListener("click", () => {
            playpause()
        })
        document.getElementById("pause-svg").addEventListener("click", () => {
            playpause()
        })
    }
    catch (error) {
        console.error("Error fetching songs:", error);
    }
}

//Plus Button Click (PlayList Me Add Karne Ke Liye)
document.getElementById("Plus")?.addEventListener("click", async () => {
    document.getElementById("playname").querySelector("div").classList.add("hidden");
    if (currentSong) {
        const res = await fetch("/fetchplaylist");
        const result = await res.json();

        const ul = document.getElementById("playname").querySelector("ul");
        ul.innerHTML = "";

        if (result.array.length === 0) {
            const noPlaylistDiv = document.getElementById("playname").querySelector("div");
            noPlaylistDiv.classList.remove("hidden");
            noPlaylistDiv.innerHTML = "No Any Playlist";
        } else {
            for (const playlist of result.array) {
                // Check if song is present in this playlist
                const response = await fetch("/tickSymbol", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        url: currentSong.name,
                        pname: playlist.name
                    })
                });
                const result1 = await response.json();
                const songExists = result1.msg === "exists";

                // Create li and conditionally show tick
                const li = document.createElement("li");
                li.className = "flex gap-2 items-center justify-between transition btn-hover btn-act pointer";

                li.innerHTML = `
          <div class="flex gap-4 items-center">
            <img src="${playlist.image}" alt="" class="rounded img">
            <p class="font-bold">${playlist.name}</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" id="TickCircle" class="svg-2" style="display: ${songExists ? 'block' : 'none'};">
            <path d="M12,22A10,10,0,1,0,2,12,10,10,0,0,0,12,22ZM8.293,11.293a.9994.9994,0,0,1,1.414,0L11,12.5859,14.293,9.293a1,1,0,0,1,1.414,1.414l-4,4a.9995.9995,0,0,1-1.414,0l-2-2A.9994.9994,0,0,1,8.293,11.293Z" fill="#0fff00" class="color000000 svgShape"></path>
          </svg>
        `;
                ul.appendChild(li);
                // Add song on click
                li.addEventListener("click", () => {
                    plus(
                        currentSong.name,
                        currentSong.image[2].url,
                        currentSong.downloadUrl[4].url,
                        currentSong.artists.all[0].name,
                        playlist.name,
                        currentSong.duration
                    );
                    document.getElementById("playname").classList.add("hidden");
                });
            }
        }
        // Toggle the playlist popup
        if (document.getElementById("playname".className !== "hidden")) {
            document.getElementById("playname").classList.add("hidden");
        } else {
            document.getElementById("playname").classList.remove("hidden");
        }
    }
});

//Online Ganna Search Ke lIye Function
searchInput.addEventListener('input', async () => {
    if (sess === true) {
        const query = searchInput.value.trim();
        // alert(query)
        resultsList.innerHTML = "";
        let songlist = document.querySelector(".inpSongList")
        songlist.style.display = "block"

        if (query.length === 0) return;


        try {
            const res = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data && data.data && data.data.results) {
                data.data.results.slice(0, 7).forEach(song => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                                        <img src="${song.image[2].url}" alt="${song.name}" style="width: 50px; height: 50px; border-radius: 4px; margin-right: 10px;">
                                        <span><b>${song.name}</b> - <strong>${song.artists.all[0].name}</strong></span>
                                    `;
                    li.style.display = "flex";
                    li.style.alignItems = "center";
                    li.style.gap = "10px";

                    li.addEventListener('click', async () => {
                        currentPlayingMusic(song.image[2].url, song.name, song.artists.all[0].name, song.downloadUrl[4].url)
                        document.getElementById("player").src = song.downloadUrl[4].url
                        document.getElementById("player").pause()
                        updateRecently(song.downloadUrl[4].url, song.image[2].url, song.name, song.artists.all[0].name, song.duration)
                        displayRecently()
                        playpause()
                        globalSongName = song.name
                        updateInitialPlaylist()
                        songlist.style.display = "none"
                    });

                    resultsList.appendChild(li);
                });
            } else {
                resultsList.innerHTML = "<li>No results found</li>";
            }
        } catch (err) {
            console.error("Error fetching songs:", err);
            resultsList.innerHTML = "<li>API Error</li>";
        }
    } else {
        alert("Please login to listen song")
    }
})
//Jab global library khaali ho tab
async function updateInitialPlaylist() {
    const res = await fetch("/fetchplaylist")
    const result = await res.json()
    globalLibrary = result.array[0].name
}

//KeyBoard Button Press Ke Liye Function
document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") {
        event.preventDefault();
        const fillBar = document.getElementById("fillBar");
        let currentWidth = parseInt(fillBar.style.width);
        currentWidth += 1
        if (currentWidth === 101) {
            console.log("max volume")
        } else {
            fillBar.style.width = currentWidth + "%"
            document.getElementById("percent").innerHTML = `${currentWidth}%`
            document.getElementById("player").volume = currentWidth / 100
        }
    } if (event.key === "ArrowDown") {
        event.preventDefault()
        const fillBar = document.getElementById("fillBar");
        let currentWidth = parseInt(fillBar.style.width);
        currentWidth -= 1
        if (currentWidth === -1) {
            console.log("min volume")
        } else {
            fillBar.style.width = currentWidth + "%"
            document.getElementById("percent").innerHTML = `${currentWidth}%`
            document.getElementById("player").volume = currentWidth / 100
        }
    }
    if (event.key === "ArrowRight") {
        event.preventDefault()
        document.getElementById("player").currentTime += 5
    } if (event.key === "ArrowLeft") {
        event.preventDefault()
        document.getElementById("player").currentTime -= 5
    } if (event.ctrlKey && event.key === "k") {
        event.preventDefault();
        document.querySelector("input").focus();
    } if (event.code === "Space" && document.activeElement.id !== "search" && document.activeElement.id !== "new-playlist-name") {
        event.preventDefault()
        playpause()
    } if (event.ctrlKey && event.key === "ArrowRight") {
        event.preventDefault()
        playbackControl(globalLibrary, globalSongName, "forward");
    } if (event.ctrlKey && event.key === "ArrowLeft") {
        event.preventDefault()
        playbackControl(globalLibrary, globalSongName, "backward");
    } if (event.key === "l" && document.activeElement.id !== "search" && document.activeElement.id !== "playlistSearch" && event.activeElement?.id !== "new-palylist-name") {
        recentlyDisplay()
        displayRecently()
    }
})

//PlayList Ke Andar Ke Gaane Ko Fetch Karne Ka Function
async function librarySongs(name) {
    globalLibrary = name
    document.getElementById("warning").classList.add("hidden")
    document.querySelector(".OnlineSongList").classList.add("hidden")
    if (document.querySelector(".install-page").style.display === "block") {
        document.querySelector(".install-page").style.display = "none"
    }
    const res1 = await fetch("/fetchplaylist")
    const result1 = await res1.json();
    const res = await fetch("/librarySongs", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ pname: name })
    })
    const result = await res.json()
    document.querySelector(".OnlineSongList").classList.remove("hidden")
    const playlistData = result1.array.find(p => p.name === name);
    const fav_res = await fetch("/get-favorite")
    const fav_result = await fav_res.json()
    if (playlistData) {
        let sum = 0;
        result.arr.forEach(song => {
            sum += song.len; // sum is in seconds
        });

        // Proper breakdown
        const hours = Math.floor(sum / 3600);
        const minutes = Math.floor((sum % 3600) / 60); // remaining minutes after taking out hours

        const cover = document.getElementById("cover").querySelector("div");
        cover.querySelector("img").src = playlistData.image;
        cover.querySelector("h2").textContent = playlistData.name;

        cover.querySelector("p").innerHTML = `
  <b>${result.arr.length}</b> 
  <span class="text-sm text-gray">songs</span>
  <div>
    <span>
      &nbsp${hours}
      <span class="text-sm text-gray">&nbsphour</span>
      &nbsp${minutes}
      <span class="text-sm text-gray">&nbspminute</span>
    </span>
  </div>
`;

        document.getElementById("playlist-details").innerHTML = `<p class="dot text-white mr-8 btn-hover1 pointer" onclick="playlistThreeDot()">⋮</p>
                                                                    <div id="playlist-dropdown" class="playlist-dropdown hidden">
                                                                    <ul>
                                                                        <li onclick="playlistDetail('${playlistData.name}')"><b>Delete</b> </li>
                                                                        <li onclick="showRenameInput('${playlistData.name}')"><b>Rename</b></li>


                                                                    </ul>
                    
                  </div> `

    }

    if (result.arr.length !== 0) {
        document.getElementById("LibrarySongList").classList.remove("hidden")
        const list = document.getElementById("LibrarySongList")
        list.innerHTML = ""
        result.arr.forEach(song => {
            const minute = Math.floor(song.len / 60)
            const second = Math.floor(song.len % 60)

            const time = `${minute}:${second.toString().padStart(2, '0')}`

            const li = document.createElement("li")
            li.className = "justify-between"
            let trimmedName = song.songName.split(" ").slice(0, 4).join(" ");
            li.innerHTML = `
  <div class="song-item">
    <div class="flex gap-2 items-center w-400px">
      <img src="${song.image}" class="img rounded">
      <span><b>${trimmedName}</b></span>
    </div>

    <strong class="time">${time}</strong>

    <i class='bx bxs-heart heart-icon ${fav_result?.arr?.some(item => item.songUrl === song.songUrl) ? "liked" : ""
                }'></i>


    <div class="dot btn-hover1 pos-rel">
      <p class="dots">⋮</p>
      <div class="dropdown hidden">
        <ul>
          <li onclick="downloadSong('${song.songUrl}','${song.songName}.mp3')">Download</li>
          <li>Add to another playlist</li>
          <li onclick="removeSong('${name}','${song.songUrl}')">Remove from playlist</li>
        </ul>
      </div>
    </div>
  </div>
`;


            li.addEventListener("click", async () => {
                document.getElementById("player").src = song.songUrl
                globalSongName = song.songName
                await updateRecently(song.songUrl, song.image, song.songName, song.artist, song.len)
                currentPlayingMusic(song.image, song.songName, song.artist, song.songUrl)
                highlight(song.songName, "OnlineSongList")
                li.classList.add("playing")
                await displayRecently()
                playpause()
            })
            li.querySelector(".dot").addEventListener("click", (e) => {
                e.stopPropagation(); // So li click doesn't get triggered
                const dropdown = li.querySelector(".dropdown");
                // Close other open dropdowns first
                document.querySelectorAll(".dropdown").forEach(menu => {
                    if (menu !== dropdown) menu.classList.add("hidden");
                });
                dropdown.classList.toggle("hidden");
            });
            li.querySelector(".heart-icon").addEventListener("click", (e) => {
                e.stopPropagation();
                favorite(song.songUrl, song.image, song.songName, song.artist, song.len)
                e.target.classList.toggle("liked"); // add or remove 'liked' class
            });

            list.appendChild(li)
        })
    } else {
        document.getElementById("LibrarySongList").classList.add("hidden")
        //document.querySelector(".OnlineSongList").classList.add("hidden")
        document.getElementById("warning").classList.remove("hidden")
        document.getElementById("warning").innerHTML = "No Song In Playlist"
    }
}
//Song ko liked song me add karna 
async function favorite(url, image, name, artist, len) {
    const res = await fetch("/favorite", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ url, image, name, artist, len })
    })
    const result = await res.json()
    popupAlert(result.msg)
}
//Liked song ko display karana 
async function DisplayLiked() {
    const res = await fetch("/get-favorite")
    const result = await res.json()
    const list = document.querySelector(".likedSongList").querySelector("ul")
    document.getElementById("warning1").classList.add("hidden")
    list.innerHTML = ""
    if (result.arr.length == 0) {
        document.getElementById("warning1").classList.remove("hidden")
        document.getElementById("warning1").innerHTML = "No Liked Song"
    } else {
        result.arr.forEach(song => {
            const li = document.createElement("li")
            li.innerHTML = `<div class="Liked-Song-Item">
                      <div class="Liked-Left">
                        <img src="${song.image}" alt="Song Image">
                        <div class="song-info">
                          <p class="song-name">${song.songName}</p>
                          <p class="artist-name">${song.artist}</p>
                        </div>
                      </div>
                      <div class="Liked-Right">
                        <span class="duration"><b>${Math.floor(song.len / 60)}:${(Math.floor(song.len % 60)).toString().padStart(2, '0')}</b></span>
                        <i class='bx bxs-heart liked-heart-icon text-danger'></i>
                      </div>
                    </div>`
            li.addEventListener("click", async () => {
                document.getElementById("player").src = song.songUrl
                await updateRecently(song.songUrl, song.image, song.songName, song.artist, song.len)
                currentPlayingMusic(song.image, song.songName, song.artist, song.songUrl)
                highlight(song.songName, "Liked")
                globalLibrary = "Liked"
                globalSongName = song.songName
                await displayRecently()
                playpause()
            })
            li.querySelector(".liked-heart-icon").addEventListener("click", async (e) => {
                e.stopPropagation()
                await favorite(song.songUrl, song.img, song.songName, song.artist, song.len)
                await DisplayLiked()
            })
            list.appendChild(li)
        })
    }
}
//Current playing song ko highlight karna 
function highlight(name, source) {
    if (source === "OnlineSongList") {
        const listItems = document.getElementById("LibrarySongList").querySelectorAll("li");

        listItems.forEach(item => {
            item.classList.remove("playing");

            // Get the song name from inside the <li>
            const songName = item.querySelector("span")?.innerText?.trim();

            if (songName === name.trim()) {
                item.classList.add("playing");
            }
        });
    } else if (source === "Liked") {
        const list = document.querySelectorAll(".likedSongList li")
        list.forEach(item => {
            item.classList.remove("playing");
            const SongName = item.querySelector(".song-name")?.innerHTML?.trim();
            if (SongName === name) {
                item.classList.add("playing");
            }
        });
    } else if (source === "recently") {
        const list = document.querySelectorAll(".recentlyPlayed li")
        list.forEach(item => {
            item.classList.remove("playing");
            const SongName = item.querySelector(".song-name")?.textContent?.trim();
            if (SongName === name) {
                item.classList.add("playing");
            }
        });
    }

}
//playlist ko delete karne ka function
async function playlistDetail(name) {
    const res = await fetch("/deletePlaylist", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ playlistName: name })
    })
    const result = await res.json()
    popupAlert(result.msg)
    HomePage()
    fetchPlaylist()
}

//Gaane Ko PlayList Me Add Kane Ka Function
async function plus(SongName, SongImg, SongUrl, artist, playlistName, SongLength) {
    const name = SongName
    const url = SongImg
    const songUrl = SongUrl
    const art = artist
    const pname = playlistName
    const time = SongLength
    const res = await fetch("/songinfo", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, url, songUrl, artist, pname, time })
    })
    const results = await res.json()
    if (res.status === 200) {
        popupAlert(results.msg)
        const playlistsDisplay = window.getComputedStyle(document.querySelector(".playlists")).display;
        if (pname === globalLibrary) {
            librarySongs(pname);
        }
    } else {
        popupAlert(results.msg)
    }
}
//Popup Alert 
function popupAlert(message) {
    document.getElementById("popupmessage").classList.remove("hidden")
    document.getElementById("popupmessage").innerHTML = message
    setTimeout(() => {
        document.getElementById("popupmessage").classList.add("hidden")
    }, 2500)
}
//Gaane Ko Play Pause Karne Ka Function
function playpause() {
    const player = document.getElementById("player");
    const playSVG = document.getElementById("play-svg");
    const pauseSVG = document.getElementById("pause-svg");
    if (player.paused) {
        player.play();
        playSVG.style.display = "none";
        pauseSVG.style.display = "block";
    } else {
        player.pause();
        playSVG.style.display = "block";
        pauseSVG.style.display = "none";
    }
}
//Shuffle / Repeat one / Repeat List
async function playbackControl(PlaylistName, SongName, direction = "forward") {
    let result, highlightname
    console.log(PlaylistName + " " + SongName)
    if (PlaylistName !== "Liked" && PlaylistName !== "recently") {
        highlightname = "OnlineSongList"
        const res = await fetch("/librarySongs", {
            method: "post",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ pname: PlaylistName })
        })
        result = await res.json()
    } else if (PlaylistName === "recently") {
        highlightname = "recently"
        const res = await fetch("/updateRecently")
        result = await res.json()
    } else {
        highlightname = "Liked"
        const res = await fetch("/get-favorite")
        result = await res.json()
    }

    if (RepeatFlag === 1) {
        let index = result.arr.findIndex(song => song.songName === SongName)
        index = direction === "forward" ? index + 1 : index - 1;
        if (index === -1) index = 0;
        if (index >= result.arr.length) index = 0;
        if (index < 0) index = result.arr.length - 1;
        document.getElementById("player").src = result.arr[index].songUrl
        if (highlightname !== "recently") {
            await updateRecently(result.arr[index].songUrl, result.arr[index].image, result.arr[index].songName, result.arr[index].artist, result.arr[index].len)
            await displayRecently()
        }
        currentPlayingMusic(result.arr[index].image, result.arr[index].songName, result.arr[index].artist, result.arr[index].songUrl)
        playpause()
        globalSongName = result.arr[index].songName
        highlight(result.arr[index].songName, highlightname)
    }
    if (ShuffleFlag === 1) {
        let index
        do {
            index = Math.floor(Math.random() * result.arr.length)
        } while (LastIndex === index)
        LastIndex = index
        document.getElementById("player").src = result.arr[index].songUrl
        if (highlightname !== "recently") {
            await updateRecently(result.arr[index].songUrl, result.arr[index].image, result.arr[index].songName, result.arr[index].artist, result.arr[index].len)
           await displayRecently()
        }
        currentPlayingMusic(result.arr[index].image, result.arr[index].songName, result.arr[index].artist, result.arr[index].songUrl)
        highlight(result.arr[index].songName, highlightname)
        globalSongName = result.arr[index].songName
        playpause()
        // alert(highlightname, result.arr[index].songName)
    }
    if (RepeatOneFlag === 1) {
        let index = result.arr.findIndex(song => song.songName === SongName)
        document.getElementById("player").src = result.arr[index].songUrl
        if (highlightname !== "recently") {
            await updateRecently(result.arr[index].songUrl, result.arr[index].image, result.arr[index].songName, result.arr[index].artist, result.arr[index].len)
           await displayRecently()
        }
        currentPlayingMusic(result.arr[index].image, result.arr[index].songName, result.arr[index].artist, result.arr[index].songUrl)
        playpause()
        highlight(result.arr[index].songName, highlightname)
    }
}

//Current Song Ko Display Kanare Ka Function
async function currentPlayingMusic(img, name, artist, url) {
    document.getElementById("currentPlayingSongImg").src = img
    let trimmedName = name.split(" ").slice(0, 4).join(" ");
    document.getElementById("currentPlayingName").innerHTML = `<span> <strong>${trimmedName}</strong></span> `
    document.getElementById("playingArtist").innerHTML = `<b> ${artist}</b> `
    document.getElementById("Plus").style.display = "block"
    const res = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(name)}`);
    const data = await res.json();
    currentSong = data.data.results.find((songname) => songname.name === name)
}

//Volume Ko Upadte Karne Ka Function
function updateSeekBar(clientX) {
    const rect = seekBar1.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width));
    const percent = (x / rect.width) * 100;
    fillBar.style.width = percent + "%";
    document.getElementById("percent").innerHTML = `${Math.round(percent)}%`
    document.getElementById("player").volume = percent / 100
}

seekBar1.addEventListener("click", (e) => {
    updateSeekBar(e.clientX);
});

seekBar1.addEventListener("mousedown", (e) => {
    isDragging = true;
    updateSeekBar(e.clientX);
});

document.addEventListener("mousemove", (e) => {
    if (isDragging) {
        updateSeekBar(e.clientX);
    }
});

document.addEventListener("mouseup", () => {
    isDragging = false;
});

//Current Playing Song Ko Update Karne Ka Function (seekbar)
function updateplaytime(clientX) {
    const rect = playBar.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width));
    const percent = (x / rect.width) * 100;
    PlayFillBar.style.width = percent + "%";
    document.getElementById("player").currentTime = (percent / 100) * player.duration;

}

playBar.addEventListener("click", (e) => {
    updateplaytime(e.clientX);
});

playBar.addEventListener("mousedown", (e) => {
    Draging = true;
    updateplaytime(e.clientX);
});

document.addEventListener("mousemove", (e) => {
    if (Draging) {
        updateplaytime(e.clientX);
    }
});

document.addEventListener("mouseup", () => {
    Draging = false;
});

//Current Song Ka Time Update Aur Song End Ka Function
function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

// Set total duration once metadata is loaded
player.addEventListener("loadedmetadata", () => {
    durationSpan.textContent = formatTime(player.duration);
});

// Update current time and fill bar
player.addEventListener("timeupdate", () => {
    currentTimeSpan.textContent = formatTime(player.currentTime);
    const percent = (player.currentTime / player.duration) * 100;
    playbarFill.style.width = `${percent}%`;
});

//Song Ended
player.addEventListener("ended", () => {
    playbackControl(globalLibrary, globalSongName)
})

//Naya Playlist Banane Ka Function
document.getElementById("PlaylistName").addEventListener("submit", async (e) => {
    e.preventDefault()
    const name = document.getElementById("new-playlist-name").value
    const accessKey = "gJ3Io7-FiCSudtwMUsgvahmDMaTjhSWZA4gAM6iDrN4";
    const query = "dark abstract";
    const img = await fetch(`https://api.unsplash.com/photos/random?query=${query}&client_id=${accessKey}`);
    const data = await img.json();
    const imageUrl = `${data.urls.raw}&w=60&h=60&fit=crop`;
    const res = await fetch("/playlistname", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, imageUrl })
    })
    const result = await res.json()
    if (res.status === 200) {
        document.getElementById("new-playlist-name").value = ""
        document.getElementById("PlaylistName").classList.add("hidden")
        popupAlert(result.msg)
        //fetchPlaylist()
    } else {
        popupAlert(result.msg)
        document.getElementById("new-playlist-name").value = ""
        document.getElementById("PlaylistName").classList.add("hidden")
    }
})



//PlayList Ko Home Page Pe Dispaly Karane Ka Function
async function fetchPlaylist() {
    document.querySelector(".playlists").querySelector("div").classList.add("hidden")
    document.querySelector(".sidebar1").classList.add("hidden")
    document.querySelector(".playlists").style.display = "block"
    const res = await fetch("/fetchplaylist")
    const result = await res.json();
    if (res.status === 200) {
        document.querySelector(".playlists").querySelector("ul").innerHTML = ""
        if (result.array.length === 0) {
            document.querySelector(".playlists").querySelector("div").classList.remove("hidden")
            document.querySelector(".playlists").querySelector("div").innerHTML = "No Playlist"
            document.getElementById("playname").querySelector("ul").innerHTML = "No Playlist"
        } else {
            result.array.forEach((name) => {
                const li = document.createElement("li")
                li.className = "flex items-center gap-2 justify-between";
                li.innerHTML = `
                  <div class="flex gap-2 items-center">
                  <img src="${name.image}" class="rounded">
                <p class="font-bold text-xl">${name.name}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0   16 16" id="Arrow" class="svg">
                <path fill="none" stroke="#fdfffd" d="m5.357 2.464 5 5.093-5 5.092" class="colorStroke249fe6 svgStroke"></path>
                </svg>`
                li.addEventListener("click", async () => {
                    //document.querySelector(".add").classList.add("hidden")
                    document.getElementById("leftarrow").classList.remove("hidden")
                    document.querySelector(".likedSongList").classList.add("hidden")
                    librarySongs(name.name)
                    homename("music", name.name)
                })
                document.querySelector(".playlists").querySelector("ul").appendChild(li)
            })
        }
    }
}


function home() {
    const arr = {
        home: ["Home", "home"],
        search: ["Search", "search"],
        library: ["My Library", "library"],

    };
    document.querySelector(".sidebar-nav").querySelector("ul").innerHTML = ""
    Object.entries(arr).forEach(([key, value], index) => {
        const li = document.createElement("li");
        li.innerHTML = `<i class='bx bx-${value[1]}'></i> <span>${value[0]}</span>`;
        if (index === 0) {
            li.className = "active"
            homename(value[1], value[0])
        }
        li.addEventListener("click", () => {
            document.querySelectorAll(".sidebar-nav ul li").forEach(item => {
                item.classList.remove("active");
            });
            homename(value[1], value[0])
            li.className = "active"

            if (key === "search") {
                document.querySelector("input").focus()
            }

            if (key === "library") {
                document.getElementById("leftarrow").classList.remove("hidden")
                setTimeout(() => {
                    // fetchPlaylist()
                    libraryshow()

                }, 150)
            }
            if (key === "home") {
                HomePage()
            }
        })
        document.querySelector(".sidebar-nav").querySelector("ul").appendChild(li); // append to ul or any container
    });
}

function homename(icon, name) {
    document.querySelector(".lib").innerHTML = `<i class='bx bx-${icon} text-gray-3 text-2xl'></i> <span class="text-gray-3 text-xl font-bold">${name}</span>`
}

function libraryshow() {
    const arr = {
        yplaylist: ["My Playlist", "headphone"],
        liked: ["Liked Songs", "heart"],
        download: ["My Downloads", "download"],
        playlist: ["Create Playlist", "plus"]
    }
    document.querySelector(".sidebar1").querySelector(".sidebar-nav").querySelector("ul").innerHTML = ""
    document.querySelector(".sidebar").style.display = "none"
    document.querySelector(".sidebar1").classList.remove("hidden")
    Object.entries(arr).forEach(([key, value], index) => {
        const li = document.createElement("li");
        li.innerHTML = `<i class='bx bx-${value[1]}'></i> <span>${value[0]}</span>`;
        if (index === 0) {

            homename(value[1], value[0])
        }
        li.addEventListener("click", () => {
            document.querySelectorAll(".sidebar-nav ul li").forEach(item => {
                item.classList.remove("active");
            });
            homename(value[1], value[0])
            li.className = "active"
            if (key === "playlist") {
                li.className = "add active"
                playList()
            }
            if (key === "liked") {
                document.querySelector(".likedSongList").classList.remove("hidden")
                document.querySelector(".OnlineSongList").classList.add("hidden")
                if (document.querySelector(".install-page").style.display === "block") {
                    document.querySelector(".install-page").style.display = "none"
                }
                DisplayLiked()
            }

            if (key === "yplaylist") {
                document.getElementById("leftarrow").classList.remove("hidden")
                setTimeout(() => {
                    fetchPlaylist()
                }, 300)

            }
        })
        document.querySelector(".sidebar1").querySelector(".sidebar-nav").querySelector("ul").appendChild(li); // append to ul or any container
    });
}

function playList() {
    document.getElementById("PlaylistName").classList.toggle("hidden")
    document.getElementById("PlaylistName").querySelector("input").focus()
}

//Delete song from playlist 
async function removeSong(playlistName, songUrl) {
    const res = await fetch("/deleteSong", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ playlistName, songUrl })
    })
    const result = await res.json()
    if (res.status === 200) {
        popupAlert(result.msg)
        librarySongs(playlistName)
    }
}
//Local Storage me gaana download
async function downloadSong(songUrl, filename) {
    try {
        const response = await fetch(songUrl, {
            mode: "cors", // If you're hitting external URLs
        });
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename || "download.mp3";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Free memory

        console.log("Download started for:", filename);
    } catch (err) {
        console.error("Download failed", err);
    }
}

function HomePage() {
    // alert("hi")
    if (sess == false) {
        document.querySelector(".no-login").style.display = "flex"
    }
    document.querySelector(".likedSongList").classList.add("hidden")
    document.querySelector(".OnlineSongList").classList.add("hidden")
    document.querySelector(".right-box").style.overflow = "hidden"
    // document.querySelector(".right-top").style.display = "flex"
    // document.querySelector(".title").style.display = "flex"
    // document.querySelector(".music-box").style.display = "block"
    // document.querySelector(".music-line").style.display = "flex"
    document.querySelector(".install-page").style.display = "none"
    document.querySelector(".browse-box").style.display = "none"
    document.getElementsByTagName("svg")[4].style.fill = "gray"
}

function playlistThreeDot() {
    document.getElementById("playlist-dropdown").classList.toggle("hidden")
}


function showRenameInput(currentName) {
    document.getElementById("playlist-dropdown").classList.add("hidden")
    const h2 = document.querySelector(".playlist-title");

    // Make an input element
    const input = document.createElement("input");
    input.type = "text";
    input.value = currentName;
    input.className = "rename-input";

    // Set same styles as h2
    input.style.fontSize = "32px";
    input.style.fontWeight = "bold";
    input.style.color = "white";
    input.style.backgroundColor = "transparent";
    input.style.border = "none";
    input.style.borderBottom = "1px solid #888";
    input.style.width = h2.offsetWidth + "px";
    input.style.outline = "none";

    // Replace h2 with input
    h2.replaceWith(input);
    input.focus();

    // When user presses Enter or blurs, rename
    input.addEventListener("blur", () => handleRenameSubmit(input.value, currentName));
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            input.blur();
        }
    });
}

async function handleRenameSubmit(newName, oldName) {
    if (newName.trim() === "" || newName === oldName) {
        revertTitle(oldName);
        return;
    }

    // Send to server (assuming endpoint /renamePlaylist exists)
    const res = await fetch("/renamePlaylist", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ oldName: oldName, newName: newName })
    });

    const result = await res.json();
    if (res.status === 200) {
        revertTitle(newName);
        fetchPlaylist();
        librarySongs(newName)
        popupAlert(result.msg)
    } else {
        popupAlert(result.msg)
        revertTitle(oldName);
    }
}

function revertTitle(name) {
    const input = document.querySelector(".rename-input");
    const h2 = document.createElement("h2");
    h2.className = "playlist-title";
    h2.textContent = name;
    h2.style.fontSize = "32px";
    h2.style.fontWeight = "bold";
    h2.style.color = "white";
    input.replaceWith(h2);
}

document.getElementById("Forward").addEventListener("click", () => {
    playbackControl(globalLibrary, globalSongName, "forward");
});

document.getElementById("Backward").addEventListener("click", () => {
    playbackControl(globalLibrary, globalSongName, "backward");
});

document.getElementById("playlistSearch").addEventListener("input", function () {
    const filter = this.value.toLowerCase().trim();
    const allSongs = document.getElementById("LibrarySongList").querySelectorAll("li"); // assuming each song is in <li>

    allSongs.forEach(song => {
        const songNameTag = song.querySelector(".song-item b"); // b tag inside song-item
        const name = songNameTag?.textContent.toLowerCase() || "";

        if (name.includes(filter)) {
            song.style.display = "flex"; // or "block", depending on your layout
        } else {
            song.style.display = "none";
        }
    });
});

document.getElementById("recentlyPlayedShow").addEventListener("click", () => {
    recentlyDisplay()
    displayRecently()
});
//Recent wale div ko display karane ka function
function recentlyDisplay() {
    const recently = document.querySelector(".recentlyPlayedSong");
    const right = document.querySelector(".righ1");
    const left = document.querySelector(".left1");

    const isOpen = recently.classList.contains("active");

    if (isOpen) {
        recently.classList.remove("active");
        right.style.width = "75%";
        left.style.width = "25%";
    } else {
        recently.classList.add("active");
        right.style.width = "50%";
        left.style.width = "25%";
    }
}
//Update Recently
async function updateRecently(songUrl, image, songName, artist, len) {
    const res = await fetch("/updateRecently", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ songUrl, image, songName, artist, len })
    })
    const result = await res.json()
    //popupAlert(result.msg)
}

async function displayRecently() {
    const res = await fetch("/updateRecently")
    const result = await res.json()

    const ul = document.querySelector(".recentlyPlayed").querySelector("ul")
    ul.innerHTML = ""

    result.arr.forEach(song => {
        const li = document.createElement("li")  // 👈 Now inside loop
        li.className = "recently-song-item"
        li.innerHTML = `
            <img src="${song.image}" alt="song-img">
            <div class="recently-song-info">
                <p class="song-name"><b>${song.songName}</b></p>
                <p class="recently-artist-name"><b>${song.artist}</b></p>
            </div>`

        li.addEventListener("click", () => {
            document.getElementById("player").src = song.songUrl
            highlight(song.songName, "recently")
            currentPlayingMusic(song.image, song.songName, song.artist, song.songUrl)
            globalLibrary = "recently"
            globalSongName = song.songName
            playpause()
        })

        ul.appendChild(li)
    })
}
