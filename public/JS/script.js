let btn1 = document.getElementById("signUp")
let btn = document.getElementById("loginBtn").querySelector("button")
let search = document.getElementById("onlineSongSearchSVG")
let download = document.getElementById("OpenDownloadPage")
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
const searchInput = document.getElementById("search");
const resultsList = document.getElementById('results');
const mq = window.matchMedia("(max-width: 768px)");
let currentSong = null
let Draging = false;
let isDragging = false;
let shufflePname = ""
let globalLibrary = ""
let ShuffleFlag = 0
let RepeatFlag = 1
let globalSongName = ""
let globalAlbumId = ""
let RepeatOneFlag = -1
let LastIndex = -1
const SAAVN_BASE_URL = 'https://saavn.dev/api';
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
document.querySelector(".MediaLogin")?.addEventListener("click", () => {
    window.location.href = "/login"
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
    initializeHomePage();
    HomePage()
})

btn2.addEventListener("click", () => {
    document.querySelector(".MainProfileContainer").classList.add("hidden")

    document.getElementById("MainHomePage").classList.add("hidden")
    document.querySelector(".likedSongList").classList.add("hidden")
    document.querySelector(".OnlineSongList").classList.add("hidden")
    document.querySelector(".no-login").style.display = "none"
    document.querySelector(".right-top").style.display = "none"
    document.querySelector(".title").style.display = "none"
    document.querySelector(".music-box").style.display = "none"
    document.querySelector(".music-line").style.display = "none"
    document.getElementById("browseCatagory").style.fill = "gray"
    document.querySelector(".install-page").style.display = "block"
    document.querySelector(".browse-box").style.display = "none"
    document.querySelector(".right-box").style.cssText = "overflow: scroll; overflow-x: hidden"
})


btn5.addEventListener("click", () => {
    if (!document.getElementById("MainHomePage").classList.contains("hidden")) {
        document.getElementById("MainHomePage").classList.add("hidden")
    }
    document.querySelector(".browse-box").style.display = "block"
    document.querySelector(".install-page").style.display = "none"
    document.querySelector(".right-top").style.display = "none"
    document.querySelector(".title").style.display = "none"
    document.querySelector(".music-box").style.display = "none"
    document.querySelector(".right-box").style.cssText = "overflow: scroll; overflow-x: hidden"
    document.querySelector(".music-line").style.display = "none"
    document.getElementById("browseCatagory").style.fill = "white"
    document.querySelector(".no-login").style.display = "none"
})

if (sess) {
    //fetchSongs();
    btn.classList.add("hidden")
    // document.getElementById("newPlaylistButton").style.display = "block"
    // document.querySelector(".left1").style.height = "99%";
    document.getElementsByTagName("p")[5].style.display = "none"
    // document.getElementsByTagName("button")[0].style.display = "none"
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
    document.getElementById("search").focus()
})

download.addEventListener("click", () => {
    window.open("download", "_blank");
});

function opendownload() {
    window.open("download", "_blank");
}

//Dom Load Ka Function
document.addEventListener("DOMContentLoaded", async () => {

    if (sess === true) {
        initializeHomePage();
        const dropdown = document.getElementById("playlist-dropdown");
        document.querySelector(".no-login").style.display = "none"
        //document.querySelector(".add").classList.remove("hidden")
        document.querySelector(".currentPlayingMusic").style.display = "flex"
        document.getElementById("percent").innerHTML = `${Math.round(player.volume * 100)}%`
        document.getElementById("fillBar").style.width = `100%`
        //fetchPlaylist()
        home()
        checkMQ(mq);
        // playpause()
        //librarySongs()
    } else {
        document.querySelector(".no-login").style.display = "flex"
        document.querySelector(".currentPlayingMusic").style.display = "none"

    }
})

document.getElementById("play-svg").addEventListener("click", () => {
    playpause()
})

document.getElementById("pause-svg").addEventListener("click", () => {
    playpause()
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
        initializeHomePage()
        home()
        if (mq.matches) {
            MQchange()
        }
    } else if (!document.querySelector(".sidebar1").classList.contains("hidden")) {
        document.querySelector(".sidebar1").classList.add("hidden")
        document.querySelector(".sidebar").style.display = "flex"
        initializeHomePage()
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
    // document.querySelector(".profile-box").classList.toggle("visible")
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
        const audioPlayer = player;
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
        // console.log(currentSong.downloadUrl[4].url + " " + currentSong.name)
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
                        url: currentSong.downloadUrl[4].url,
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
    } else {
        console.log("error")
    }
});
//Online Ganna Search Ke liye Function
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
                        player.src = song.downloadUrl[4].url
                        player.pause()
                        updateRecently(song.downloadUrl[4].url, song.image[2].url, song.name, song.artists.all[0].name, song.duration)
                        displayRecently()
                        playpause()
                        globalSongName = song.name
                        // currentSong = song.name
                        updateInitialPlaylist(song.id)
                        songlist.style.display = "none"
                        // console.log(song.id)
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
async function updateInitialPlaylist(id) {
    //console.log(id)
    const response = await fetch(`https://saavn.dev/api/songs?ids=${id}`)
    const result1 = await response.json()
    // console.log(result1.data[0])
    currentSong = result1.data[0]
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
            player.volume = currentWidth / 100
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
            player.volume = currentWidth / 100
        }
    }
    if (event.key === "ArrowRight") {
        event.preventDefault()
        player.currentTime += 5
    } if (event.key === "ArrowLeft") {
        event.preventDefault()
        player.currentTime -= 5
    } if (event.ctrlKey && event.key === "k") {
        event.preventDefault();
        document.querySelector("input").focus();
    } if (event.code === "Space" && document.activeElement.id !== "search" && document.activeElement.id !== "new-playlist-name" && document.activeElement.id !== "searchInput") {
        event.preventDefault()
        playpause()
    } if (event.ctrlKey && event.key === "ArrowRight") {
        event.preventDefault()
        playbackControl(globalLibrary, globalSongName, "forward");
    } if (event.ctrlKey && event.key === "ArrowLeft") {
        event.preventDefault()
        playbackControl(globalLibrary, globalSongName, "backward");
    } if (event.key === "l" && document.activeElement.id !== "search" && document.activeElement.id !== "playlistSearch" && event.activeElement?.id !== "new-palylist-name" && document.activeElement.id !== "searchInput") {
        recentlyDisplay()
        displayRecently()
    }
})

//PlayList Ke Andar Ke Gaane Ko Fetch Karne Ka Function
async function librarySongs(name) {

    document.getElementById("MainHomePage").classList.add("hidden")
    document.getElementById("warning").classList.add("hidden")
    document.querySelector(".OnlineSongList").classList.add("hidden")
    if (document.querySelector(".install-page").style.display === "block") {
        document.querySelector(".install-page").style.display = "none"
    }

    const res1 = await fetch("/fetchplaylist")
    const result1 = await res1.json()
    const res = await fetch("/librarySongs", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ pname: name })
    })
    const result = await res.json()

    document.querySelector(".OnlineSongList").classList.remove("hidden")
    const playlistData = result1.array.find(p => p.name === name)
    const fav_res = await fetch("/get-favorite")
    const fav_result = await fav_res.json()

    if (playlistData) {
        let sum = 0
        result.arr.forEach(song => {
            sum += song.len
        })

        const hours = Math.floor(sum / 3600)
        const minutes = Math.floor((sum % 3600) / 60)

        const cover = document.getElementById("cover").querySelector("div")
        cover.querySelector("img").src = playlistData.image
        cover.querySelector("h2").textContent = playlistData.name

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
        `

        document.getElementById("playlist-details").innerHTML = `
            <p class="dot text-white mr-8 btn-hover1 pointer" onclick="playlistThreeDot()">⋮</p>
            <div id="playlist-dropdown" class="playlist-dropdown hidden">
                <ul>
                    <li onclick="playlistDetail('${playlistData.name}')"><b>Delete</b></li>
                    <li onclick="showRenameInput('${playlistData.name}')"><b>Rename</b></li>
                </ul>
            </div>
        `
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
            let trimmedName = song.songName.split(" ").slice(0, 4).join(" ")
            li.innerHTML = `
                <div class="song-item">
                    <div class="flex gap-2 items-center w-400px">
                        <img src="${song.image}" class="img rounded">
                        <span><b>${trimmedName}</b></span>
                    </div>
                    <strong class="time">${time}</strong>
                    <i class='bx bxs-heart heart-icon ${fav_result?.arr?.some(item => item.songUrl === song.songUrl) ? "liked" : ""}'></i>
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
            `

            li.addEventListener("click", async () => {
                player.src = song.songUrl
                // player.play()
                globalSongName = song.songName
                globalLibrary = name
                await updateRecently(song.songUrl, song.image, song.songName, song.artist, song.len)
                currentPlayingMusic(song.image, song.songName, song.artist, song.songUrl)
                highlight(song.songName, "OnlineSongList")
                li.classList.add("playing")
                await displayRecently()
                playpause()
            })

            li.querySelector(".dot").addEventListener("click", (e) => {
                e.stopPropagation()
                const dropdown = li.querySelector(".dropdown")
                document.querySelectorAll(".dropdown").forEach(menu => {
                    if (menu !== dropdown) menu.classList.add("hidden")
                })
                dropdown.classList.toggle("hidden")
            })

            li.querySelector(".heart-icon").addEventListener("click", (e) => {
                e.stopPropagation()
                favorite(song.songUrl, song.image, song.songName, song.artist, song.len)
                e.target.classList.toggle("liked")
            })

            list.appendChild(li)
        })
    } else {
        document.getElementById("LibrarySongList").classList.add("hidden")
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
                player.src = song.songUrl
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
    // alert(source)
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
    else if (source === "album") {
        // alert(source)
        const list = document.querySelectorAll(".song-list-item .song-info .song-name")
        list.forEach(item => {
            item.classList.remove("playing")
            const SongName = item?.textContent.trim()
            if (SongName === name) {
                item.classList.add("playing")
            }
        })
    } else if (source === "artist") {
        // alert(name)
        const list = document.querySelectorAll(".song-list-item.artistTopSongs .song-info .song-title")
        list.forEach(item => {
            item.classList.remove("playing")
            const SongName = item?.textContent.trim()
            // console.log(SongName)
            if (SongName === name) {
                item.classList.add("playing")
            }
        })
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
        // console.log(pname + " " + globalLibrary)
        const playlistsDisplay = window.getComputedStyle(document.querySelector(".playlists")).display;
        if (document.getElementById("MainHomePage").classList.contains("hidden")) {
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
    const playSVG = document.getElementById("play-svg");
    const pauseSVG = document.getElementById("pause-svg");
    if (player.paused) {
        // alert("hi")
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
    // console.log(PlaylistName + " " + SongName)
    if (PlaylistName !== "Liked" && PlaylistName !== "recently" && PlaylistName !== "album" && PlaylistName !== "artist") {
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
    } else if (PlaylistName === "album") {
        highlightname = "album"
        const fetchResult = await fetch(`${SAAVN_BASE_URL}/albums?id=${globalAlbumId}`);
        result = await fetchResult.json();
        const formattedSongs = result.data.songs.map(song => ({
            songUrl: song.downloadUrl?.[4]?.url || "",
            image: song.image?.[2]?.url || "",
            songName: song.name || "",
            artist: song.artists?.primary?.[0]?.name || "",
            len: Number(song.duration) || 0
        }));
        result = { arr: formattedSongs };
    } else if (PlaylistName === "artist") {
        highlightname = "artist"
        const fetchResult = await fetch(`${SAAVN_BASE_URL}/artists?id=${globalAlbumId}`);
        result = await fetchResult.json()
        const formattedSongs = result.data.topSongs.map(song => ({
            songUrl: song.downloadUrl?.[4]?.url || "",
            image: song.image?.[2]?.url || "",
            songName: song.name || "",
            artist: song.artists?.primary?.[0]?.name || "",
            len: Number(song.duration) || 0
        }));
        result = { arr: formattedSongs };
    }
    else {
        highlightname = "Liked"
        const res = await fetch("/get-favorite")
        result = await res.json()
    }

    if (RepeatFlag === 1) {
        // alert(PlaylistName)
        let index = result.arr.findIndex(song => song.songName === SongName)
        index = direction === "forward" ? index + 1 : index - 1;
        if (index === -1) index = 0;
        if (index >= result.arr.length) index = 0;
        if (index < 0) index = result.arr.length - 1;
        player.src = result.arr[index].songUrl
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
        player.src = result.arr[index].songUrl
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
        player.src = result.arr[index].songUrl
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
    // console.log(data.data.results[0].downloadUrl[4].url)
    currentSong = await data.data.results.find((songname) => songname.downloadUrl[4].url === url)
}

//Volume Ko Upadte Karne Ka Function
function updateSeekBar(clientX) {
    const rect = seekBar1.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width));
    const percent = (x / rect.width) * 100;
    fillBar.style.width = percent + "%";
    document.getElementById("percent").innerHTML = `${Math.round(percent)}%`
    player.volume = percent / 100
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
    player.currentTime = (percent / 100) * player.duration;

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
document.getElementById("playlistForm").addEventListener("submit", async (e) => {
    e.preventDefault()
    const name = document.getElementById("playlistName").value
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
        closePopup()
        popupAlert(result.msg)
        //fetchPlaylist()
    } else {
        popupAlert(result.msg)
        document.getElementById("new-playlist-name").value = ""
        document.getElementById("PlaylistName").classList.add("hidden")
        closePopup()
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
                    document.querySelector(".MainProfileContainer").classList.add("hidden")

                    librarySongs(name.name)
                    homename("music", name.name)
                    if (mq.matches) {
                        MQchange()
                    }
                    // alert(globalLibrary)
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
    if (document.getElementById("OnlineSongList")?.classList.contains("hidden") || document.querySelector(".likedSongList")?.classList.contains("hidden")) {
        document.getElementById("OnlineSongList")?.classList.add("hidden")
        document.querySelector(".likedSongList").classList.add("hidden")
    }
    document.querySelector(".sidebar-nav").querySelector("ul").innerHTML = ""
    Object.entries(arr).forEach(([key, value], index) => {
        const li = document.createElement("li");
        li.innerHTML = `<i class='bx bx-${value[1]}'></i> <span>${value[0]}</span>`;
        if (index === 0) {
            li.className = "active"
            homename(value[1], value[0])
            initializeHomePage()
        }
        li.addEventListener("click", () => {
            document.querySelectorAll(".sidebar-nav ul li").forEach(item => {
                item.classList.remove("active");
            });
            homename(value[1], value[0])
            li.className = "active"

            if (key === "search") {
                if (mq.matches) {
                    MQchange()
                }
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
                initializeHomePage()
                if (mq.matches) {
                    MQchange()
                }
            }
        })
        document.querySelector(".sidebar-nav").querySelector("ul").appendChild(li); // append to ul or any container
    });
}

function homename(icon, name) {
    document.querySelector(".lib").innerHTML = `<i class='bx bx-${icon} text-gray-3 text-2xl'></i> <span class="text-gray-3 text-xl font-bold">${name}</span>`
}
//Left box ke option ko show karane ka function
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
                document.querySelector(".inputPopup").classList.toggle("flex")
                document.querySelector(".inputPopup").classList.toggle("hidden")
                document.getElementById("playlistName").value = ""
                if (mq.matches) {
                    MQchange()
                }
                document.getElementById("playlistName").focus()
            }
            if (key === "liked") {
                document.querySelector(".likedSongList").classList.remove("hidden")
                document.querySelector(".OnlineSongList").classList.add("hidden")
                document.getElementById("MainHomePage").classList.add("hidden")
                document.querySelector(".MainProfileContainer").classList.add("hidden")

                if (document.querySelector(".install-page").style.display === "block") {
                    document.querySelector(".install-page").style.display = "none"
                }
                DisplayLiked()
                if (mq.matches) {
                    MQchange()

                }
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

        // console.log("Download started for:", filename);
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
    document.getElementById("browseCatagory").style.fill = "gray"
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
            player.src = song.songUrl
            highlight(song.songName, "recently")
            currentPlayingMusic(song.image, song.songName, song.artist, song.songUrl)
            globalLibrary = "recently"
            globalSongName = song.songName
            playpause()
        })

        ul.appendChild(li)
    })
}
function closePopup() {
    document.querySelector(".inputPopup").classList.toggle("flex")
    document.querySelector(".inputPopup").classList.toggle("hidden")
}

const closeBtn = document.querySelector('.close-btn');
closeBtn.addEventListener("click", () => {
    closePopup()
})

/**
 * Initializes the home page by fetching and displaying
 * featured albums and artists.
 */
async function initializeHomePage() {
    const homepage = document.getElementById("MainHomePage")
    if (homepage.classList.contains("hidden")) {
        homepage.classList.remove("hidden")
    }
    // You can change these queries to feature different content
    const albumQuery = "top Bollywood";
    const artistQuery = "top artists";

    // Fetch and display content concurrently
    await Promise.all([
        fetchAndDisplayAlbums(albumQuery),
        fetchAndDisplayArtists(artistQuery),
        fetchAndDisplayNewReleases()
    ]);
}

/**
 * Fetches albums based on a query and displays them in the grid.
 * @param {string} query - The search term for albums.
 */
async function fetchAndDisplayAlbums(query) {
    const grid = document.getElementById('featuredAlbumGrid');
    try {
        const response = await fetch(`${SAAVN_BASE_URL}/search/albums?query=${encodeURIComponent(query)}&limit=10`);
        const data = await response.json();

        if (data.success && data.data.results) {
            grid.innerHTML = '';
            // console.log(data.data.results)
            data.data.results.forEach(album => {
                const albumCard = document.createElement('div');
                albumCard.className = 'item-card';
                albumCard.innerHTML = `
                    <img src="${album.image?.[2]?.url || '/placeholder.jpg'}" alt="${album.name}" class="item-card-image">
                    <div class="item-card-title">${album.name}</div>
                    <div class="item-card-subtitle">${album.year}</div>
                `;
                // Add a click listener to show album details (using your existing modal logic)
                albumCard.addEventListener('click', () => getAlbumDetails(album.id));
                grid.appendChild(albumCard);
            });
        } else {
            grid.innerHTML = '<div class="placeholder-card">Could not load albums.</div>';
        }
    } catch (error) {
        console.error('Error fetching albums:', error);
        grid.innerHTML = '<div class="placeholder-card">Error fetching albums.</div>';
    }
}

/**
 * Fetches artists based on a query and displays them in the grid.
 * @param {string} query - The search term for artists.
 */
async function fetchAndDisplayArtists(query) {
    const grid = document.getElementById('featuredArtistGrid');
    try {
        const response = await fetch(`${SAAVN_BASE_URL}/search/artists?query=${encodeURIComponent(query)}&limit=10`);
        const data = await response.json();
        // console.log(data)
        if (data.success && data.data.results) {
            grid.innerHTML = ''; // Clear the placeholder
            data.data.results.forEach(artist => {
                const artistCard = document.createElement('div');
                artistCard.className = 'item-card';
                artistCard.innerHTML = `
                    <img src="${artist.image?.[2]?.url || '/placeholder.jpg'}" alt="${artist.name}" class="item-card-image artist-image">
                    <div class="item-card-title">${artist.name}</div>
                    <div class="item-card-subtitle">${artist.role || 'Artist'}</div>
                `;
                // Add a click listener to show artist details (using your existing modal logic)
                artistCard.addEventListener('click', () => getArtistDetails(artist.id));
                grid.appendChild(artistCard);
            });
        } else {
            grid.innerHTML = '<div class="placeholder-card">Could not load artists.</div>';
        }
    } catch (error) {
        console.error('Error fetching artists:', error);
        grid.innerHTML = '<div class="placeholder-card">Error fetching artists.</div>';
    }
}



/**
 * Fetches and displays the details for a specific album.
 * Hides the main content and shows the album detail view.
 * @param {string} albumId - The ID of the album to fetch.
 */
async function getAlbumDetails(albumId) {
    const mainHomePage = document.getElementById('MainHomePage');
    mainHomePage.innerHTML = '<div class="placeholder-card">Loading Album Details...</div>';

    try {
        const response = await fetch(`${SAAVN_BASE_URL}/albums?id=${albumId}`);
        const data = await response.json();
        const res = await fetch("/get-favorite")
        const result = await res.json()
        if (data.success && data.data) {
            const album = data.data;
            // globalAlbumId = albumId
            // console.log(album.songs)
            const songsHtml = album.songs.map((song, index) => `
    <div class="song-list-item">
        <span class="song-number">${index + 1}</span>
        <img src="${song.image[2].url}" alt="${song.name}" class="song-image">
        <div class="song-info" onclick="playSong('${song.downloadUrl[4].url}', '${song.name}', '${song.artists.primary[0].name}', '${song.image[2].url}','${song.duration}','album',${albumId})">
            <div class="song-name text-white">${song.name}</div>
            <div class="song-artist">${song.artists.primary[0].name}</div>
        </div>
        <div>
         <i class="bx bxs-heart text-${result?.arr?.some(item => item.songUrl === song.downloadUrl[4].url) ? "danger" : "gray"}" id="heart-${index}" onclick="addFavorite(event,'${song.downloadUrl[4].url}','${song.image[2].url}','${song.name}','${song.artists.primary[0].name}','${song.duration}','${index}')"></i>
        </div>
        <div class="relative" id="albumPlusIcon-${index}">
            <button class="play-button" onclick="toggleDropdown(event, ${index},'${song.downloadUrl[4].url}','${song.name}','${song.image[2].url}','${song.duration}','${song.artists.primary[0].name}')">+</button>
        </div>
    </div>
`).join('');



            const detailHtml = `
                <div class="detail-view">
                    <button class="back-button" onclick="showMainView()">← Back to Home</button>
                    <div class="detail-header">
                        <img src="${album.image[2].url}" alt="${album.name}" class="detail-image">
                        <div class="detail-info">
                            <h1 class="text-white">${album.name}</h1>
                            <p>${album.artists.primary[0].name} • ${album.year}</p>
                            <p>${album.songCount} songs</p>
                            <button class="play-all-button" onclick="playSong('${album.songs[0].downloadUrl[4].url}', '${album.songs[0].name}', '${album.songs[0].artists.primary[0].name}', '${album.songs[0].image[1].url}','album','${albumId}')">▶ Play All</button>
                        </div>
                    </div>
                    <div class="song-list">
                        ${songsHtml}
                    </div>
                </div>
            `;
            mainHomePage.innerHTML = detailHtml;
        } else {
            mainHomePage.innerHTML = '<div class="placeholder-card">Could not load album details. <button class="back-button" onclick="showMainView()">Go Back</button></div>';
        }
    } catch (error) {
        console.error('Error fetching album details:', error);
        mainHomePage.innerHTML = '<div class="placeholder-card">Error fetching album details. <button class="back-button" onclick="showMainView()">Go Back</button></div>';
    }
}


async function getArtistDetails(artistId) {
    const mainHomePage = document.getElementById('MainHomePage');
    mainHomePage.innerHTML = '<div class="placeholder-card">Loading Artist Details...</div>';

    try {
        // console.log(artistId)
        const response = await fetch(`${SAAVN_BASE_URL}/artists?id=${artistId}`);
        const data = await response.json();
        // console.log(data)
        if (data.success && data.data) {
            const artist = data.data;
            // Fetch top songs and top albums
            const topSongsHtml = artist.topSongs.slice(0, 10).map((song, index) => `
                <div class="song-list-item artistTopSongs">
                    <span class="song-number">${index + 1}</span>
                    <img src="${song.image[2].url}" alt="${song.name}" class="song-image">
                    <div class="song-info" onclick="playSong('${song.downloadUrl[4].url}', '${song.name}', '${song.artists.primary[0].name}', '${song.image[2].url}','${song.duration}','artist','${artistId}')">
                        <div class="song-title text-white">${song.name}</div>
                        <div class="song-artist">${song.artists.primary[0].name}</div>
                    </div>
                    <i class="bx bxs-heart text-gray" onclick="addFavorite('${song.downloadUrl[4].url}','${song.image[2].url}','${song.name}','${song.artists.primary[0].name}','${song.duration}')"></i>
                    <div class="relative" id="albumPlusIcon-${index}">
            <button class="play-button" onclick="toggleDropdown(event, ${index},'${song.downloadUrl[4].url}','${song.name}','${song.image[2].url}','${song.duration}','${song.artists.primary[0].name}')">+</button>
        </div>
                </div>
            `).join('');

            const topAlbumsHtml = artist.topAlbums.slice(0, 10).map(album => `
                <div class="item-card" onclick="getAlbumDetails('${album.id}')">
                     <img src="${album.image[2].url}" alt="${album.name}" class="item-card-image">
                     <div class="item-card-title">${album.name}</div>
                     <div class="item-card-subtitle">${album.year}</div>
                </div>
            `).join('');

            const detailHtml = `
                <div class="detail-view">
                    <button class="back-button" onclick="showMainView()">← Back to Home</button>
                    <div class="detail-header artist-header">
                        <img src="${artist.image[2].url}" alt="${artist.name}" class="detail-image artist-image">
                        <div class="detail-info">
                            <h1 class="text-white">${artist.name}</h1>
                            <p>${parseInt(artist.followerCount).toLocaleString()} Followers</p>
                        </div>
                        <div class="button">
                            <button class="flex items-center justify-center gap-2" onclick="addArtist(${artistId})"><i class="bx bx-plus font-bold"></i>Follow</button>
                        </div>
                    </div>
                    <div class="content-category">
                        <h2>Top Songs</h2>
                        <div class="song-list">${topSongsHtml}</div>
                    </div>
                    <div class="content-category">
                        <h2>Top Albums</h2>
                        <div class="content-grid">${topAlbumsHtml}</div>
                    </div>
                </div>
            `;
            mainHomePage.innerHTML = detailHtml;
        } else {
            mainHomePage.innerHTML = '<div class="placeholder-card">Could not load artist details. <button class="back-button" onclick="showMainView()">Go Back</button></div>';
        }
    } catch (error) {
        console.error('Error fetching artist details:', error);
        mainHomePage.innerHTML = '<div class="placeholder-card">Error fetching artist details. <button class="back-button" onclick="showMainView()">Go Back</button></div>';
    }
}

async function toggleDropdown(event, index, songUrl, songName, songImage, songLength, artist) {
    event.stopPropagation();
    const div = document.createElement("div")
    div.className = "shadow-lg hidden playlist-dropdown-1"
    div.id = `dropdown-${index}`
    div.innerHTML = `<div class="h-full w-full flex items-center justify-center text-lg font-bold font-fam-2 text-white hidden"></div>
              <ul class="flex flex-col gap-1 justify-center">
        </ul>`
    document.getElementById(`albumPlusIcon-${index}`).appendChild(div)
    document.querySelectorAll('.playlist-dropdown-1').forEach(d => d.classList.add('hidden'));
    const dropdown = document.getElementById(`dropdown-${index}`);
    dropdown.classList.toggle('hidden');
    await fetchplaylistList(index, songUrl, songName, songImage, songLength, artist)

}

async function fetchplaylistList(index, songUrl, songName, songImg, songLength, artist) {
    const res = await fetch("/fetchplaylist")
    const result = await res.json()
    document.getElementById(`dropdown-${index}`).querySelector("ul").innerHTML = ""
    result.array.forEach(async song => {
        const response = await fetch("/tickSymbol", {
            method: "post",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url: songUrl, pname: song.name })
        })
        const results = await response.json()
        // console.log(results.msg+" "+ song.name )
        const check = results.msg === "exists"
        const li = document.createElement("li")
        li.className = "flex gap-2 items-center justify-between transition btn-hover btn-act pointer"
        li.innerHTML = `<div class="flex gap-4 items-center">
            <img src="${song.image}" alt="" class="rounded img">
            <p class="font-bold">${song.name}</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" id="TickCircle" class="svg-2" style="display: ${check ? 'block' : 'none'} ;">
            <path d="M12,22A10,10,0,1,0,2,12,10,10,0,0,0,12,22ZM8.293,11.293a.9994.9994,0,0,1,1.414,0L11,12.5859,14.293,9.293a1,1,0,0,1,1.414,1.414l-4,4a.9995.9995,0,0,1-1.414,0l-2-2A.9994.9994,0,0,1,8.293,11.293Z" fill="#0fff00" class="color000000 svgShape"></path>
          </svg>`
        li.addEventListener("click", () => {
            plus(songName, songImg, songUrl, artist, song.name, songLength)
            document.querySelectorAll('.playlist-dropdown-1').forEach(d => d.classList.add('hidden'));

        })
        document.getElementById(`dropdown-${index}`).querySelector("ul").appendChild(li)

    })

}
// Optional: Close dropdown if clicked outside
document.addEventListener('click', () => {
    document.querySelectorAll('.playlist-dropdown-1').forEach(d => d.classList.add('hidden'));
});

/**
 * Fetches and displays the details for a specific artist.
 * Hides the main content and shows the artist detail view.
 * @param {string} artistId - The ID of the artist to fetch.
 */


/**
 * Restores the main home page view with album and artist grids.
 */
function showMainView() {
    const mainHomePage = document.getElementById('MainHomePage');
    // Re-create the original structure
    mainHomePage.innerHTML = `
    <div class="content-category">
            <h2>New Releases</h2>
            <div class="content-grid" id="newReleasesGrid">
                <div class="placeholder-card">Loading New Releases...</div>
            </div>
        </div>
        <div class="content-category">
            <h2>Top Albums</h2>
            <div class="content-grid" id="featuredAlbumGrid">
                <div class="placeholder-card">Loading Albums...</div>
            </div>
        </div>
        <div class="content-category">
            <h2>Popular Artists</h2>
            <div class="content-grid" id="featuredArtistGrid">
                <div class="placeholder-card">Loading Artists...</div>
            </div>
        </div>
    `;
    // Re-populate the content
    initializeHomePage();
}
//Album ka gaana play karne ke liye 
async function playSong(url, title, artist, image, duration, source, id) {
    // console.log(`Playing: ${title} by ${artist} and source: ${source}`);
    player.src = url
    globalAlbumId = id
    globalLibrary = source
    currentSong = title
    globalSongName = title
    playpause()
    currentPlayingMusic(image, title, artist, url)
    highlight(title, source)
    await updateRecently(url, image, title, artist, duration)
    await displayRecently()
    // console.log(globalLibrary + " album ID:" + globalAlbumId)
}

async function fetchAndDisplayNewReleases() {
    const grid = document.getElementById('newReleasesGrid');
    const queries = [
        "new bollywood songs 2025",
        "Top Hits 50",
        "latest hindi releases",
        "trending now"
    ];

    let resultsFound = false;

    for (const query of queries) {
        try {
            const response = await fetch(`${SAAVN_BASE_URL}/search/albums?query=${encodeURIComponent(query)}&limit=30`);
            const data = await response.json();

            // Check if we got a valid response with actual results
            if (data.success && data.data.results && data.data.results.length > 0) {
                grid.innerHTML = ''; // Clear the placeholder message

                data.data.results.forEach(album => {
                    const releaseCard = document.createElement('div');
                    releaseCard.className = 'item-card';
                    releaseCard.innerHTML = `
                        <img src="${album.image?.[2]?.url || '/placeholder.jpg'}" alt="${album.name}" class="item-card-image">
                        <div class="item-card-title">${album.name}</div>
                        <div class="item-card-subtitle">${album.year || ''}</div>
                    `;
                    releaseCard.addEventListener('click', () => getAlbumDetails(album.id));
                    grid.appendChild(releaseCard);
                });

                resultsFound = true;
                break; // We found results, so we can stop looping
            } else {
                console.log(`⚠️ Query "${query}" returned no results.`);
            }
        } catch (error) {
            console.error(`❌ Error with query "${query}":`, error);
            // Continue to the next query
        }
    }

    // If the loop finishes and we still haven't found anything
    if (!resultsFound) {
        grid.innerHTML = '<div class="placeholder-card">Could not find any new releases after trying multiple queries.</div>';
    }
}

/////////sddgd////////

document.addEventListener('DOMContentLoaded', () => {
    initializeHomePage();

    const searchButton = document.getElementById('searchButton');
    const searchInput = document.getElementById('searchInput');

    searchButton.addEventListener('click', performSearch);

    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });
});
// --- STATE MANAGEMENT ---
// Store the current search state globally
let currentSearchQuery = '';
let currentArtistPage = 1;
let currentAlbumPage = 1;
const RESULTS_PER_PAGE = 10;

// --- Main Search Function (Handles New Searches) ---
async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();

    if (!query) return;

    // Reset state for a new search
    currentSearchQuery = query;
    currentArtistPage = 1;
    currentAlbumPage = 1;

    const defaultContent = document.getElementById('default-content');
    const searchResultsContainer = document.getElementById('search-results-container');

    defaultContent.classList.add('hidden');
    searchResultsContainer.classList.remove('hidden');
    searchResultsContainer.innerHTML = '<div class="placeholder-card">Searching...</div>';

    try {
        const [artistResponse, albumResponse] = await Promise.all([
            // Fetch page 1 for the new search
            fetch(`${SAAVN_BASE_URL}/search/artists?query=${encodeURIComponent(query)}&limit=${RESULTS_PER_PAGE}&page=${currentArtistPage}`),
            fetch(`${SAAVN_BASE_URL}/search/albums?query=${encodeURIComponent(query)}&limit=${RESULTS_PER_PAGE}&page=${currentAlbumPage}`)
        ]);

        const artistData = await artistResponse.json();
        const albumData = await albumResponse.json();

        // This function now sets up the initial structure
        displaySearchResults(artistData.data.results, albumData.data.results, query);
    } catch (error) {
        console.error('Search failed:', error);
        searchResultsContainer.innerHTML = '<div class="placeholder-card">Search failed. Please try again.</div>';
    }
}

// --- Initial Display Setup ---
function displaySearchResults(artists, albums, query) {
    const searchResultsContainer = document.getElementById('search-results-container');

    // Basic structure for the results page
    let resultsHtml = `
        <div class="search-results-header">
            <h2 style="color:white;">Search Results for "${query}"</h2>
            <button class="back-button" onclick="clearSearch()">← Back to Home</button>
        </div>
    `;

    if (!artists.length && !albums.length) {
        searchResultsContainer.innerHTML = `${resultsHtml}<div class="placeholder-card">No results found.</div>`;
        return;
    }

    // Add containers for artists and albums that we can append to later
    resultsHtml += `
        <div id="artist-results-section" class="${artists.length === 0 ? 'hidden' : ''}">
            <div class="content-category">
                <h3>Artists</h3>
                <div id="artist-grid" class="content-grid"></div>
                <div id="load-more-artists-container" class="load-more-container"></div>
            </div>
        </div>
        <div id="album-results-section" class="${albums.length === 0 ? 'hidden' : ''}">
            <div class="content-category">
                <h3>Albums</h3>
                <div id="album-grid" class="content-grid"></div>
                <div id="load-more-albums-container" class="load-more-container"></div>
            </div>
        </div>
    `;

    searchResultsContainer.innerHTML = resultsHtml;

    // Populate the initial data
    if (artists.length > 0) {
        displayArtistResults(artists);
    }
    if (albums.length > 0) {
        displayAlbumResults(albums);
    }
}

// --- Helper function to display/append artists ---
function displayArtistResults(artists) {
    const artistGrid = document.getElementById('artist-grid');
    const loadMoreContainer = document.getElementById('load-more-artists-container');

    const artistsHtml = artists.map(artist => `
        <div class="item-card" onclick="getArtistDetails('${artist.id}')">
            <img src="${artist.image?.[2]?.url || '/placeholder.jpg'}" alt="${artist.name}" class="item-card-image artist-image">
            <div class="item-card-title">${artist.name}</div>
            <div class="item-card-subtitle">${artist.role || 'Artist'}</div>
        </div>
    `).join('');

    artistGrid.innerHTML += artistsHtml; // Append new results

    // Show "Load More" button only if we received a full page of results
    if (artists.length === RESULTS_PER_PAGE) {
        loadMoreContainer.innerHTML = `<button class="load-more-button" onclick="loadMore('artists')">Load More Artists</button>`;
    } else {
        loadMoreContainer.innerHTML = ''; // No more results
    }
}

// --- Helper function to display/append albums ---
function displayAlbumResults(albums) {
    const albumGrid = document.getElementById('album-grid');
    const loadMoreContainer = document.getElementById('load-more-albums-container');

    const albumsHtml = albums.map(album => `
        <div class="item-card" onclick="getAlbumDetails('${album.id}')">
            <img src="${album.image?.[2]?.url || '/placeholder.jpg'}" alt="${album.name}" class="item-card-image">
            <div class="item-card-title">${album.name}</div>
            <div class="item-card-subtitle">${album.year}</div>
        </div>
    `).join('');

    albumGrid.innerHTML += albumsHtml; // Append new results

    // Show "Load More" button
    if (albums.length === RESULTS_PER_PAGE) {
        loadMoreContainer.innerHTML = `<button class="load-more-button" onclick="loadMore('albums')">Load More Albums</button>`;
    } else {
        loadMoreContainer.innerHTML = ''; // No more results
    }
}

// --- "Load More" Functionality ---
async function loadMore(type) {
    let page;
    let url;
    let loadMoreContainer;

    if (type === 'artists') {
        currentArtistPage++;
        page = currentArtistPage;
        loadMoreContainer = document.getElementById('load-more-artists-container');
        url = `${SAAVN_BASE_URL}/search/artists?query=${encodeURIComponent(currentSearchQuery)}&limit=${RESULTS_PER_PAGE}&page=${page}`;
    } else if (type === 'albums') {
        currentAlbumPage++;
        page = currentAlbumPage;
        loadMoreContainer = document.getElementById('load-more-albums-container');
        url = `${SAAVN_BASE_URL}/search/albums?query=${encodeURIComponent(currentSearchQuery)}&limit=${RESULTS_PER_PAGE}&page=${page}`;
    } else {
        return; // Invalid type
    }

    // Show a loading state on the button
    if (loadMoreContainer) {
        loadMoreContainer.innerHTML = '<div class="placeholder-card">Loading...</div>';
    }

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (type === 'artists') {
            displayArtistResults(data.data.results);
        } else if (type === 'albums') {
            displayAlbumResults(data.data.results);
        }

    } catch (error) {
        console.error('Failed to load more:', error);
        if (loadMoreContainer) {
            loadMoreContainer.innerHTML = '<div class="placeholder-card" style="color:red;">Failed to load.</div>';
        }
    }
}

function clearSearch() {
    const defaultContent = document.getElementById('default-content');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchInput = document.getElementById('searchInput');

    searchResultsContainer.classList.add('hidden');
    defaultContent.classList.remove('hidden');
    searchInput.value = '';
}

function showMainView() {
    const mainHomePage = document.getElementById('MainHomePage');
    mainHomePage.innerHTML = `
        <div class="search-container-internal">
            <input type="text" id="searchInput" placeholder="Search for Artists or Albums...">
            <button id="searchButton">Search</button>
        </div>
        <div id="default-content">
            <div class="content-category">
                <h2>New Releases</h2>
                <div class="content-grid" id="newReleasesGrid">
                    <div class="placeholder-card">Loading New Releases...</div>
                </div>
            </div>
            <div class="content-category">
                <h2>Top Albums</h2>
                <div class="content-grid" id="featuredAlbumGrid">
                    <div class="placeholder-card">Loading Albums...</div>
                </div>
            </div>
            <div class="content-category">
                <h2>Popular Artists</h2>
                <div class="content-grid" id="featuredArtistGrid">
                    <div class="placeholder-card">Loading Artists...</div>
                </div>
            </div>
        </div>
        <div id="search-results-container" class="hidden"></div>
    `;

    document.getElementById('searchButton').addEventListener('click', performSearch);
    document.getElementById('searchInput').addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            performSearch();
        }
    });

    initializeHomePage();
}

async function addFavorite(e, songUrl, image, name, artist, duration, index) {
    e.stopPropagation()
    // alert(name)
    await favorite(songUrl, image, name, artist, duration)
    const heart = document.getElementById(`heart-${index}`)
    if (heart.style.color === "red") {
        heart.style.color = "gray"
    } else {
        heart.style.color = "red"
    }
}


function checkMQ(e) {
    if (e.matches) {
        const left = document.querySelector(".left1")
        const right = document.querySelector(".righ1")
        left.style.width = "0%"
        right.style.width = "100%"
        document.querySelector(".currentPlayingMusic").style.display = "none"

        document.getElementById("hamburgermenu").addEventListener("click", () => {
            MQchange();
        })
    } else {
        // console.log("11111111111")
        document.querySelector(".left1").style.width = "24%"
        document.querySelector(".righ1").style.width = "75%"
        document.querySelector(".currentPlayingMusic").style.display = "flex"
    }
}
mq.addEventListener("change", checkMQ);

function MQchange() {
    // console.log("hi")
    const left = document.querySelector(".left1")
    const right = document.querySelector(".righ1")
    if (left.style.width == "0%") {
        // console.log("none")
        left.style.display = "block"
        left.style.width = "100%";
        right.style.width = "0%"
    } else {
        // left.style.display = "none";
        // console.log("0%")
        left.style.width = "0%"
        right.style.width = "100%"
    }
}

document.querySelector(".logo1").addEventListener("click", () => {
    initializeHomePage()
    if (mq.matches) {
        const left = document.querySelector(".left1")
        const right = document.querySelector(".righ1")
        if (left.style.width == "0%") {
            // console.log("none")
            left.style.display = "block"
            // left.style.width = "100%";
            right.style.width = "100%"
            initializeHomePage()
        } else {
            left.style.width = "0%"
            right.style.width = "100%"
            initializeHomePage()
        }
    }
    // alert("clicked")
})

document.getElementById("media-profile-button").addEventListener("click", () => {
    document.getElementById("profile").classList.toggle("visible")
    // alert("clicked")
})

async function openProfilePage() {
    document.querySelector(".MainProfileContainer").classList.remove("hidden")

    document.querySelector(".profile-box").classList.remove("visible")
    if (!document.getElementById("MainHomePage").classList.contains("hidden")) {
        document.getElementById("MainHomePage").classList.add("hidden")
    }
    const res = await fetch("/userprofile")
    const result = await res.json()
    // console.log(result)
    document.querySelector(".profile-name").innerHTML = result.name
    document.querySelector(".profile-email").innerHTML = result.email
    document.querySelector(".profilePlaylistCount").innerHTML = `${result.lib.length} Playlist`
    document.querySelector(".profileArtistCount").innerHTML = `${result.artist.length} Following`
    document.querySelector(".grid-container").innerHTML = ""
    result.lib.forEach(item => {
        const div = document.createElement("div")
        div.innerHTML = `<div class="grid-item">
                    <img src=${item.image} alt="Playlist Cover">
                    <p class="item-title">${item.name}</p>
                </div>`
        div.addEventListener("click", () => {
            document.querySelector(".MainProfileContainer").classList.add("hidden")
            librarySongs(item.name)
        })
        document.querySelector(".grid-container").appendChild(div)
    })

    document.getElementById("profilePageArtist").innerHTML = ""
    result.artist.forEach(async (item) => {
        // console.log(item.id)
        const response = await fetch(`${SAAVN_BASE_URL}/artists?id=${item.id}`)
        const result1 = await response.json()
        // console.log(result1.data)
        const div = document.createElement("div")
        div.innerHTML = `<div class="grid-item artist">
                    <img src=${result1.data.image[2]?.url} alt="Artist Picture">
                    <p class="item-title">${result1.data.name}</p>
                </div>`
        div.addEventListener("click", () => {
            document.querySelector(".MainProfileContainer").classList.add("hidden")
            document.getElementById("MainHomePage").classList.remove("hidden")
            getArtistDetails(item.id)
        })
        document.getElementById("profilePageArtist").appendChild(div)
    })

    // console.log(result.lib.length+"  "+ result.artist.length)
}

function profileThreeDot() {
    alert("clicked")
}

async function addArtist(id) {
    const res = await fetch("/addArtist", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ id })
    })
    const result = await res.json()
    if (res.status === 201) {
        popupAlert(result.msg)
    } else {
        popupAlert(result.msg)
    }
}
