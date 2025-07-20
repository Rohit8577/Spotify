let btn1 = document.getElementById("signUp")
let btn = document.getElementsByTagName("button")[0]
let search = document.getElementsByTagName("svg")[2]
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
let flag = 0
let LastIndex = -1
btn1.addEventListener("click", () => {
    window.open("/signup")
})
btn.addEventListener("click", () => {
    window.location.href = "/login"
})
document.getElementsByTagName("svg")[5].addEventListener("click", () => {
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
    if (sess == false) {
        document.querySelector(".no-login").style.display = "flex"
    }
    document.querySelector(".right-box").style.overflow = "hidden"
    document.querySelector(".right-top").style.display = "flex"
    document.querySelector(".title").style.display = "flex"
    document.querySelector(".music-box").style.display = "block"
    document.querySelector(".music-line").style.display = "flex"
    document.querySelector(".install-page").style.display = "none"
    document.querySelector(".browse-box").style.display = "none"
    document.getElementsByTagName("svg")[3].style.fill = "gray"
})

btn2.addEventListener("click", () => {
    document.querySelector(".no-login").style.display = "none"
    document.querySelector(".right-top").style.display = "none"
    document.querySelector(".title").style.display = "none"
    document.querySelector(".music-box").style.display = "none"
    document.querySelector(".music-line").style.display = "none"
    document.getElementsByTagName("svg")[3].style.fill = "gray"
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
    document.getElementsByTagName("svg")[3].style.fill = "white"
    document.querySelector(".no-login").style.display = "none"
})

if (sess) {
    fetchSongs();
    document.querySelector(".left1").style.height = "80.5vh";
    document.getElementsByTagName("p")[5].style.display = "none"
    document.getElementsByTagName("button")[0].style.display = "none"
    document.getElementsByTagName("svg")[5].style.cssText = "display: block; position: relative; right: 80%;";
    document.getElementsByClassName("support")[0].style.cssText = "position: relative; right: 30%;";
    document.getElementsByClassName("ins")[0].style.cssText = "position: relative; right: 100%;";
    document.querySelector(".line2").style.display = "none"
    document.querySelector(".playSignup").style.display = "none"
    document.getElementsByTagName("p")[1].style.display = "none"
    document.getElementsByTagName("p")[2].style.display = "none"
    document.getElementById("active1").classList.add("active1");
} else {
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
document.addEventListener("DOMContentLoaded", () => {
    if (sess === true) {
        document.querySelector(".add").classList.remove("hidden")
        document.querySelector(".currentPlayingMusic").style.display = "flex"
        document.getElementById("percent").innerHTML = `${Math.round(document.getElementById("player").volume * 100)}%`
        document.getElementById("fillBar").style.width = `100%`
        fetchPlaylist()
        //librarySongs()
    } else {
        document.querySelector(".currentPlayingMusic").style.display = "none"

    }
})

//Back Wala Button Jisse Playlists wapas Aa jata hai
document.getElementById("Arrow2").addEventListener("click", ()=>{
  document.querySelector(".add").classList.remove("hidden")
  document.getElementById("leftarrow").classList.add("hidden")
  document.querySelector(".playlists").style.display = "block"
  document.querySelector(".OnlineSongList").classList.add("hidden")
  fetchPlaylist()
})

//New Playlist Ka Input Field Laane Ka Function
document.querySelector(".new-playlist").addEventListener("click",()=>{
  document.getElementById("PlaylistName").classList.remove("hidden")
  document.getElementById("PlaylistName").querySelector("input").focus()
  document.querySelector(".new-playlist").classList.add("hidden")

})

//Click Pe Repeat On ho jayega
document.getElementById("ShuffleOff").addEventListener("click", ()=>{
  document.getElementById("ShuffleOff").classList.add("hidden")
  document.getElementById("Repeat").classList.remove("hidden")
})

//Gaane Ka Repeat Off ho jayega
document.getElementById("Repeat").addEventListener("click", ()=>{
  document.getElementById("ShuffleOff").classList.remove("hidden")
  document.getElementById("Repeat").classList.add("hidden")
})

//Document pe click karne pe playlist wala aur online song search wala popup close
document.addEventListener("click", (e) => {
    document.getElementById("playname").classList.add("hidden")
    document.querySelector(".inpSongList").style.display = "none"
})

function redirect() {
    window.open("https://apps.microsoft.com/store/detail/9NCBCSZSJRSB?launch=true&amp;mode=mini&amp;cid=spotifyweb-store-button", "_blank")
}

//New Playlist Ke Naam Ka Input Field
document.querySelector(".add").addEventListener("click", () => {
    if (document.getElementById("PlaylistName").className !== "hidden") {
        document.getElementById("PlaylistName").classList.add("hidden")
    }
    //document.getElementById("PlaylistName").classList.remove("hidden")
    document.querySelector(".new-playlist").classList.toggle("hidden");
    //document.querySelector(".add").querySelector("svg").classList.add("rotate")
});

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
document.getElementById("Plus").addEventListener("click", async () => {
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
                console.log(result1.msg)
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
                        playlist.name
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
                        playpause()
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
    }
})

//PlayList Ke Andar Ke Gaane Ko Fetch Karne Ka Function
async function librarySongs(name) {
    globalLibrary = name
    document.querySelector(".playlists").style.display = "none"
    document.getElementById("warning").classList.add("hidden")
    document.querySelector(".OnlineSongList").classList.add("hidden")
    const playlistname = name
    const res = await fetch("/librarySongs", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ pname: playlistname })
    })
    const result = await res.json()
    document.querySelector(".OnlineSongList").classList.remove("hidden")
    if (result.arr.length !== 0) {
        document.getElementById("LibrarySongList").classList.remove("hidden")
        const list = document.getElementById("LibrarySongList")
        list.innerHTML = ""
        result.arr.forEach(song => {
            const li = document.createElement("li")
            li.className = "justify-between"
            let trimmedName = song.songName.split(" ").slice(0, 4).join(" ");
            li.innerHTML = `
        <div class="flex gap-2 items-center">
          <img src="${song.img}" class="img rounded">
          <span><b>${trimmedName}</b></span>
        </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" id="DotsThree" class="svg">
            <rect width="256" height="256" fill="none"></rect>
            <circle cx="128" cy="128" r="12" fill="#fdfffd" class="color000000 svgShape"></circle>
            <circle cx="192" cy="128" r="12" fill="#fdfffd" class="color000000 svgShape"></circle>
            <circle cx="64" cy="128" r="12" fill="#fdfffd" class="color000000 svgShape"></circle>
          </svg>
      `
            li.addEventListener("click", () => {
                document.getElementById("player").src = song.songUrl
                shufflePname = playlistname
                currentPlayingMusic(song.img, song.songName, song.artist, song.songUrl)
                //document.getElementById("player").play()
                playpause()
            })
            list.appendChild(li)
        })
    } else {
        document.getElementById("LibrarySongList").classList.add("hidden")
        //document.querySelector(".OnlineSongList").classList.add("hidden")
        document.getElementById("warning").classList.remove("hidden")
        document.getElementById("warning").innerHTML = "No Song In Playlist"
    }
}

//Gaane Ko PlayList Me Add Kane Ka Function
async function plus(SongName, SongImg, SongUrl, artist, playlistName) {
    const name = SongName
    const url = SongImg
    const songUrl = SongUrl
    const art = artist
    const pname = playlistName
    const res = await fetch("/songinfo", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, url, songUrl, artist, pname })
    })
    const results = await res.json()
    if (res.status === 200) {
        document.getElementById("popupmessage").classList.remove("hidden")
        document.getElementById("popupmessage").innerHTML = results.msg
        setTimeout(() => {
            document.getElementById("popupmessage").classList.add("hidden")
        }, 2500)
        const playlistsDisplay = window.getComputedStyle(document.querySelector(".playlists")).display;
        if (playlistsDisplay !== "block" && pname === globalLibrary) {
            librarySongs(pname);
        }
    } else {
        document.getElementById("popupmessage").classList.remove("hidden")
        document.getElementById("popupmessage").innerHTML = results.msg
        setTimeout(() => {
            document.getElementById("popupmessage").classList.add("hidden")
        }, 2500)
    }
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

//Shuffle Ka Function
document.getElementById("shuffle").addEventListener("click", () => {
    flag = flag ? 0 : 1
    if (flag === 1) {
        document.querySelector(".suffle").classList.remove("hidden")
        document.getElementById("shuffle").querySelector("img").classList.add("hidden")
    } else {
        document.getElementById("shuffle").querySelector("img").classList.remove("hidden")
        document.querySelector(".suffle").classList.add("hidden")
    }
})
async function suffle(pname) {
    const name = pname
    const res = await fetch("/librarySongs", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ pname: name })
    })
    const songsize = await res.json()
    let index
    do {
        index = Math.floor(Math.random() * (songsize.arr.length))
    } while (LastIndex === index)
    LastIndex = index

    document.getElementById("player").src = songsize.arr[index].songUrl
    currentPlayingMusic(songsize.arr[index].img, songsize.arr[index].songName, songsize.arr[index].artist, songsize.arr[index].songUrl)
    await new Promise(resolve => {
        player.addEventListener("loadedmetadata", resolve, { once: true });
    });
    playpause()
}

//Current Song Ko Display Kanare Ka Function
async function currentPlayingMusic(img, name, artist, url) {
    document.getElementById("currentPlayingSongImg").src = img
    let trimmedName = name.split(" ").slice(0, 4).join(" ");
    document.getElementById("currentPlayingName").innerHTML = `<span><strong>${trimmedName}</strong></span>`
    document.getElementById("playingArtist").innerHTML = `<b>${artist}</b>`
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

//Current Playing Song Ko Update Karne Ka Function
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
    if (flag === 1) {
        suffle(shufflePname)
    }
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
        console.log(result.msg)
        document.getElementById("new-playlist-name").value = ""
        document.getElementById("PlaylistName").classList.add("hidden")
        document.getElementById("popupmessage").classList.remove("hidden")
        document.getElementById("popupmessage").innerHTML = result.msg
        setTimeout(() => {
            document.getElementById("popupmessage").classList.add("hidden")
        }, 2500)
        fetchPlaylist()
    } else {
        document.getElementById("popupmessage").classList.remove("hidden")
        document.getElementById("popupmessage").innerHTML = result.msg
        setTimeout(() => {
            document.getElementById("popupmessage").classList.add("hidden")
        }, 2500)
        document.getElementById("new-playlist-name").value = ""
        document.getElementById("PlaylistName").classList.add("hidden")
    }
})

//PlayList Ko Home Page Pe Dispaly Karane Ka Function
async function fetchPlaylist() {
    const res = await fetch("/fetchplaylist")
    const result = await res.json();
    if (res.status === 200) {
        document.querySelector(".playlists").querySelector("ul").innerHTML = ""
        if (result.array.length === 0) {
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
                    document.querySelector(".add").classList.add("hidden")
                    document.getElementById("leftarrow").classList.remove("hidden")
                    //document.querySelector(".playlists").classList.add("hidden")
                    librarySongs(name.name)
                })
                document.querySelector(".playlists").querySelector("ul").appendChild(li)
            })
        }
    }
}