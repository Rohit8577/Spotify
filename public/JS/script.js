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
const home_page = document.getElementById("MainHomePage")
let backButtonArray = []
let ytPlayer;
let updateInterval;
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
let isAiMode = false;
let aiCurrentSong = ""
let aiCurrentArtist = ""
let SAAVN_BASE_URL = "";
let globalSongArray = []


let audioCtx;
let source;
let filters = [];
const frequencies = [60, 170, 350, 1000, 3000, 10000]; // Tere 6 bands

// --- 1. Audio Engine Initialization ---
function initEqualizer() {
    const audioElement = document.getElementById("player"); // Tera <audio> tag
    if (!audioElement || audioCtx) return; // Agar already bana hai to ruk jao

    // CORS Issue fix karne ke liye (External links ke liye zaroori hai)
    audioElement.crossOrigin = "anonymous";

    // Audio Context start karo
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    // Source banao
    source = audioCtx.createMediaElementSource(audioElement);

    // Filters create karo
    filters = frequencies.map(freq => {
        const filter = audioCtx.createBiquadFilter();

        // 60Hz ke liye LowShelf (Base), baaki Peaking, 10k ke liye HighShelf
        if (freq === 60) filter.type = "lowshelf";
        else if (freq === 10000) filter.type = "highshelf";
        else filter.type = "peaking";

        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = 0; // Default flat
        return filter;
    });

    // Chain Connect karo: Source -> Filter1 -> Filter2 ... -> Speakers
    source.connect(filters[0]);
    for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
    }
    // Last filter ko destination (Speakers) se jodo
    filters[filters.length - 1].connect(audioCtx.destination);

    console.log("🎛️ Equalizer Engine Started!");
}

const sliders = document.querySelectorAll('.vertical-slider');

sliders.forEach((slider, index) => {
    slider.addEventListener('input', (e) => {
        // Audio Engine agar ready nahi hai toh shuru karo
        if (!audioCtx) initEqualizer();

        const value = parseFloat(e.target.value);

        // Filter Gain update karo
        if (filters[index]) {
            filters[index].gain.value = value;
        }
    });
});





// 1️⃣ First load the BASE URL from your backend
async function loadBaseURL() {
    const req = await fetch("/url");
    const res = await req.json();
    SAAVN_BASE_URL = res.url;
    return SAAVN_BASE_URL;
}

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
    universalPageHandler()
    document.getElementById("default-container-parent").classList.remove("hidden")

})

btn2.addEventListener("click", () => {
    universalPageHandler()
    document.querySelector(".install-page").style.display = "block"
})

if (sess) {
    btn.classList.add("hidden")
    document.getElementsByTagName("p")[5].style.display = "none"
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
        if (!('webkitSpeechRecognition' in window)) {
            alert("Bhai, tera browser voice search support nahi karta 😬");
        } else {
            console.log("Voice search supported ✅");
        }
        document.querySelector(".currentPlayingMusic").style.display = "flex"
        document.getElementById("percent").innerHTML = `${Math.round(player.volume * 100)}%`
        document.getElementById("fillBar").style.width = `100%`
        //fetchPlaylist()
        home()
        checkMQ(mq);
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
    const playnameDiv = document.getElementById("playname");
    playnameDiv.querySelector("div").classList.add("hidden");
    if (!currentSong) {
        console.log("error: No song selected");
        return;
    }
    const res = await fetch("/fetchplaylist");
    const result = await res.json();

    const ul = playnameDiv.querySelector("ul");
    ul.innerHTML = "";

    if (result.array.length === 0) {
        const noPlaylistDiv = playnameDiv.querySelector("div");
        noPlaylistDiv.classList.remove("hidden");
        noPlaylistDiv.innerHTML = "No Any Playlist";
    } else {
        for (const playlist of result.array) {
            const response = await fetch("/tickSymbol", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    url: currentSong,
                    pname: playlist.name
                })
            });
            const result1 = await response.json();
            const songExists = result1.msg === "exists";

            const li = document.createElement("li");
            li.className = "flex gap-2 items-center justify-between transition btn-hover btn-act pointer";

            li.innerHTML = `
              <div class="flex gap-4 items-center">
                <img src="${playlist.image}" alt="" class="rounded img">
                <p class="font-bold">${playlist.name}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="svg-2" style="display: ${songExists ? 'block' : 'none'};">
                <path d="M12,22A10,10,0,1,0,2,12,10,10,0,0,0,12,22ZM8.293,11.293a.9994.9994,0,0,1,1.414,0L11,12.5859,14.293,9.293a1,1,0,0,1,1.414,1.414l-4,4a.9995.9995,0,0,1-1.414,0l-2-2A.9994.9994,0,0,1,8.293,11.293Z" fill="#0fff00"></path>
              </svg>
            `;
            ul.appendChild(li);

            li.addEventListener("click", async () => {
                const req = await fetch(`/search?type=songID&query=${currentSong}`)
                const res = await req.json()
                // console.log(res)
                const result = res.data.data.songs[0]
                plus(
                    result.name,
                    result.image[2].link,
                    result.download_url[4].link,
                    result.artist_map.artists[0].name,
                    playlist.name,
                    result.duration,
                    result.id
                );
                playnameDiv.classList.add("hidden");
            });
        }
    }

    if (playnameDiv.classList.contains("hidden")) {
        playnameDiv.classList.remove("hidden");
    } else {
        playnameDiv.classList.add("hidden");
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
            const res = await fetch(`/search?type=song&query=${encodeURIComponent(query)}`);
            const data = await res.json();
            const songs = data.data.data.results
            // console.log(data.data.results)
            if (data.data.data.results) {
                songs.slice(0, 7).forEach(song => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                                        <img src="${song.image[2].link}" alt="${song.name}" style="width: 50px; height: 50px; border-radius: 4px; margin-right: 10px;">
                                        <span><b>${song.name}</b> - <strong>${song.artist_map.artists[0].name}</strong></span>
                                    `;
                    li.style.display = "flex";
                    li.style.alignItems = "center";
                    li.style.gap = "10px";

                    li.addEventListener('click', async () => {
                        initEqualizer()
                        currentPlayingMusic(song.image[2].link, song.name, song.artist_map.artists[0].name, song.id)
                        player.src = song.download_url[4].link
                        player.pause()
                        updateRecently(song.download_url[4].link, song.image[2].link, song.name, song.artist_map.artists[0].name, song.duration, song.id)
                        displayRecently()
                        playpause()
                        globalSongName = song.name
                        updateInitialPlaylist(song.id)
                        songlist.style.display = "none"
                        aiCurrentSong = song.name
                        aiCurrentArtist = song.artist_map.artists[0].name
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
    currentSong = id
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
        document.getElementById("searchPageInput").focus();
    } if (event.code === "Space" && document.activeElement.id !== "search" && document.activeElement.id !== "new-playlist-name" && document.activeElement.id !== "searchInput" && document.activeElement.id !== "searchPageInput") {
        event.preventDefault()
        playpause()
    } if (event.ctrlKey && event.key === "ArrowRight") {
        event.preventDefault()
        playbackControl(globalLibrary, globalSongName, "forward");
    } if (event.ctrlKey && event.key === "ArrowLeft") {
        event.preventDefault()
        playbackControl(globalLibrary, globalSongName, "backward");
    } if (event.key === "l" && document.activeElement.id !== "search" && document.activeElement.id !== "playlistSearch" && event.activeElement?.id !== "new-palylist-name" && document.activeElement.id !== "searchInput" && document.activeElement.id !== "searchPageInput") {
        recentlyDisplay()
        displayRecently()
    }
})
//PlayList Ke Andar Ke Gaane Ko Fetch Karne Ka Function
async function librarySongs(name) {
    addUnique("mainSongContent")
    universalPageHandler()
    document.getElementById("mainSongContent").classList.remove("hidden")
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
                    <li><b>Share</b></li>
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
                    <i class='bx bxs-heart heart-icon ${fav_result?.arr?.some(item => item.songId === song.songId) ? "liked" : ""}'></i>
                    <div class="dot btn-hover1 pos-rel">
                        <p class="dots">⋮</p>
                        <div class="dropdown hidden">
                            <ul>
                                <li onclick="downloadSong('${song.songUrl}','${song.songName}.mp3')">Download</li>
                                <li>Add to another playlist</li>
                                <li onclick="removeSong('${name}','${song.songId}')">Remove from playlist</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `

            li.addEventListener("click", async () => {
                initEqualizer()
                // console.log(song)
                player.src = song.songUrl
                // player.play()
                globalSongName = song.songName
                globalLibrary = name
                await updateRecently(song.songUrl, song.image, song.songName, song.artist, song.len, song.songId)
                currentPlayingMusic(song.image, song.songName, song.artist, song.songId)
                highlight(song.songName, "OnlineSongList")
                li.classList.add("playing")
                await displayRecently()
                playpause()
                aiCurrentSong = song.songName
                aiCurrentArtist = song.artist
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
                favorite(song.songUrl, song.image, song.songName, song.artist, song.len, song.songId)
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
async function favorite(url, image, name, artist, len, songId) {
    const res = await fetch("/favorite", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ url, image, name, artist, len, songId })
    })
    const result = await res.json()
    popupAlert(result.msg)
}

//Liked song ko display karana 
async function DisplayLiked() {
    const res = await fetch("/get-favorite")
    const result = await res.json()
    renderLikedSongs(result.arr)
}

// --- Helper Function to Render Liked Songs ---
function renderLikedSongs(songs) {

    const list = document.querySelector(".likedSongList").querySelector("ul")
    const warning = document.getElementById("warning1")
    warning.classList.add("hidden")
    list.innerHTML = ""

    if (!songs || songs.length === 0) {
        warning.classList.remove("hidden")
        warning.innerHTML = "No Liked Song"
        return
    }

    songs.forEach(song => {
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

        // Click to play song
        li.addEventListener("click", async () => {
            initEqualizer()
            player.src = song.songUrl
            globalLibrary = "Liked"
            globalSongName = song.songName
            await updateRecently(song.songUrl, song.image, song.songName, song.artist, song.len, song.songId)
            currentPlayingMusic(song.image, song.songName, song.artist, song.songId)
            highlight(song.songName, "Liked")
            currentSong = song.songId
            await displayRecently()
            playpause()
            currentPlayingSongDetails(song.songId)
            aiCurrentSong = song.songName
            aiCurrentArtist = song.artist
        })

        // Heart click to unlike
        li.querySelector(".liked-heart-icon").addEventListener("click", async (e) => {
            e.stopPropagation()
            await favorite(song.songUrl, song.image, song.songName, song.artist, song.len, song.songId)
            await DisplayLiked()
        })

        list.appendChild(li)
    })
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
    } else if (source === "recently_1") {
        const list = document.querySelectorAll(".recentlyPlayedForMobile li")
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
    } else if (source === "playlist") {
        const list = document.querySelectorAll(".playlist-song-title"); // sirf title select
        list.forEach(item => {
            item.classList.remove("playing");
            const SongName = item.textContent.trim();
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
async function plus(SongName, SongImg, SongUrl, artist, playlistName, SongLength, songId) {
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
        body: JSON.stringify({ name, url, songUrl, artist, pname, time, songId })
    })
    const results = await res.json()
    if (res.status === 200) {
        popupAlert(results.msg)
        // console.log(pname + " " + globalLibrary)
        const playlistsDisplay = window.getComputedStyle(document.querySelector(".playlists")).display;
        if (!document.querySelector(".OnlineSongList").classList.contains("hidden") && document.getElementById("cover").querySelector(".playlist-title").innerHTML === pname) {
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

    // Agar YouTube player exist karta hai
    if (typeof ytPlayer !== "undefined" && ytPlayer && ytPlayer.getPlayerState) {
        alert("11111")
        const state = ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            ytPlayer.pauseVideo();
            playSVG.style.display = "block";
            pauseSVG.style.display = "none";
        } else {
            ytPlayer.playVideo();
            playSVG.style.display = "none";
            pauseSVG.style.display = "block";
        }
    }
    // Agar normal HTML audio/video element exist karta hai
    else if (player) {
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
}

//Shuffle / Repeat one / Repeat List
async function playbackControl(PlaylistName, SongName, direction = "forward") {
    let result, highlightname
    // console.log(PlaylistName + " " + SongName)
    if (PlaylistName !== "Liked" && PlaylistName !== "recently" && PlaylistName !== "album" && PlaylistName !== "artist" && PlaylistName !== "OnlinePlaylist" && PlaylistName !== "recently_1") {
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
        console.log("r0")
        highlightname = "recently"
        const res = await fetch("/updateRecently")
        result = await res.json()
    } else if (PlaylistName === "recently_1") {
        console.log("r1")
        highlightname = "recently_1"
        const res = await fetch("/updateRecently")
        result = await res.json()
    } else if (PlaylistName === "album") {
        highlightname = "album"
        const fetchResult = await fetch(`/search?type=albumID&query=${globalAlbumId}`);
        result = await fetchResult.json();
        const formattedSongs = result.data.songs.map(song => ({
            songUrl: song.download_url?.[4]?.link || "",
            image: song.image?.[2]?.link || "",
            songName: song.name || "",
            artist: song.artists?.primary?.[0]?.name || "",
            len: Number(song.duration) || 0
        }));
        result = { arr: formattedSongs };
    } else if (PlaylistName === "artist") {
        highlightname = "artist"
        const fetchResult = await fetch(`/search?type=artistID&query=${globalAlbumId}`);
        result = await fetchResult.json()
        const formattedSongs = result.data.topSongs.map(song => ({
            songUrl: song.download_url?.[4]?.link || "",
            image: song.image?.[2]?.link || "",
            songName: song.name || "",
            artist: song.artists?.primary?.[0]?.name || "",
            len: Number(song.duration) || 0
        }));
        result = { arr: formattedSongs };
    } else if (PlaylistName === "OnlinePlaylist") {
        highlightname = "playlist"
        const res = await fetch("/playlistData", {
            method: "post",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ playlistId: globalAlbumId })
        });
        result = await res.json();
        const ids = result.playlistSongs.map(item => item.id);
        const songs = await fetchSongs(ids)
        result = { arr: songs }
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
        if (highlightname !== "recently" && highlightname !== "recently_1") {
            // console.log("hi")
            await updateRecently(result.arr[index].songUrl, result.arr[index].image, result.arr[index].songName, result.arr[index].artist, result.arr[index].len, result.arr[index].songId)
            await displayRecently()
        }
        currentPlayingMusic(result.arr[index].image, result.arr[index].songName, result.arr[index].artist, result.arr[index].songId)
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
        if (highlightname !== "recently" && highlightname !== "recently_1") {
            await updateRecently(result.arr[index].songUrl, result.arr[index].image, result.arr[index].songName, result.arr[index].artist, result.arr[index].len, result.arr[index].songId)
            await displayRecently()
        }
        currentPlayingMusic(result.arr[index].image, result.arr[index].songName, result.arr[index].artist, result.arr[index].songId)
        highlight(result.arr[index].songName, highlightname)
        globalSongName = result.arr[index].songName
        playpause()
        // alert(highlightname, result.arr[index].songName)
    }
    if (RepeatOneFlag === 1) {
        let index = result.arr.findIndex(song => song.songName === SongName)
        player.src = result.arr[index].songUrl
        if (highlightname !== "recently") {
            await updateRecently(result.arr[index].songUrl, result.arr[index].image, result.arr[index].songName, result.arr[index].artist, result.arr[index].len, result.arr[index].songId)
            await displayRecently()
        }
        currentPlayingMusic(result.arr[index].image, result.arr[index].songName, result.arr[index].artist, result.arr[index].songId)
        playpause()
        highlight(result.arr[index].songName, highlightname)
    }
}

async function fetchSongs(ids) {
    try {
        const results = await Promise.all(
            ids.map(async (id) => {
                const res = await fetch(`https://saavn.dev/api/songs/${id}`);
                const json = await res.json();
                const song = json.data[0];  // ek hi song hota hai array me

                return {
                    songUrl: song.downloadUrl?.[4]?.url || "",
                    image: song.image?.[2]?.url || "",
                    songName: song.name || "",
                    artist: song.artists?.primary?.map(a => a.name).join(", ") || "",
                    len: Number(song.duration) || 0,
                    songId: song.id
                };
            })
        );

        return results; // yaha pe sab formatted songs ek array me milenge
    } catch (err) {
        console.error("Error fetching songs:", err);
        return [];
    }
}
//Current Song Ko Display Kanare Ka Function
async function currentPlayingMusic(img, name, artist, id) {
    document.getElementById("currentPlayingSongImg").src = img
    let trimmedName = name.split(" ").slice(0, 4).join(" ");
    document.getElementById("currentPlayingName").innerHTML = `<span> <strong>${trimmedName}</strong></span> `
    // document.getElementById("playingArtist").innerHTML = `<b> ${artist}</b> `
    document.getElementById("Plus").style.display = "block"
    currentPlayingSongDetails(id)
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
    const query = "Dark_abstract";
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
                  <img src="${name.image}" class="rounded h-60px">
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
            // initializeHomePage()
            universalPageHandler()
            addUnique("default-container-parent")
            document.getElementById("default-container-parent").classList.remove("hidden")
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
                // HomePage()
                // initializeHomePage()
                universalPageHandler()
                document.getElementById("default-container-parent").classList.remove("hidden")
                if (mq.matches) {
                    MQchange()
                }
            }
            if (key === "search") {
                renderSearch()
            }
        })
        document.querySelector(".sidebar-nav").querySelector("ul").appendChild(li); // append to ul or any container
    });
}

function renderSearch() {
    universalPageHandler()
    const searchPage = document.getElementById("Search-History")
    if (searchPage.classList.contains("hidden")) {
        searchPage.classList.remove("hidden")
    }
}


function homename(icon, name) {
    document.querySelector(".lib").innerHTML = `<i class='bx bx-${icon} text-gray-3 text-2xl'></i> <span class="text-gray-3 text-xl font-bold">${name}</span>`
    document.querySelector(".lib").addEventListener("click", () => {
        document.querySelector(".left1").style.width = "5%"
        document.querySelector(".righ1").style.width = "95%"
    })
}
//Left box ke option ko show karane ka function
function libraryshow() {
    const arr = {
        yplaylist: ["My Playlist", "headphone"],
        liked: ["Liked Songs", "heart"],
        eq: ["Equilizer", "equalizer"],
        recently: ["Recently played", "music"],
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
                addUnique("likedSongList")
                universalPageHandler()
                addUnique("likedSongList")
                document.getElementById("likedSongList").classList.remove("hidden")
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

            if (key === "recently") {
                // displayRecently()
                // recentlyDisplay()
                universalPageHandler()
                addUnique("recentlyPlayForMobile")
                document.getElementById("recentlyPlayForMobile").classList.remove("hidden")
                displayRecently()
                if (mq.matches) {
                    MQchange()
                }

            }
            if (key === "eq") {
                universalPageHandler()
                document.getElementById("equalizer").classList.remove("hidden")
                if (mq.matches) {
                    MQchange()
                }
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
async function removeSong(playlistName, songId) {
    const res = await fetch("/deleteSong", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ playlistName, songId })
    })
    const result = await res.json()
    if (res.status === 200) {
        popupAlert(result.msg)
        librarySongs(playlistName)
    }
}
async function downloadSong(songUrl, filename) {
    try {
        // 1. Song Fetch karna (Same as before)
        const response = await fetch(songUrl, {
            mode: "cors",
        });
        const blob = await response.blob();

        // 🔥 CHECK: Kya hum Android App ke andar hain?
        if (window.Android && window.Android.processBlobData) {
            
            // Haan! Toh data ko Base64 me badlo aur Android ko bhej do
            const reader = new FileReader();
            reader.readAsDataURL(blob); 
            reader.onloadend = function() {
                const base64data = reader.result;
                
                // Seedha Android Kotlin function call kiya
                window.Android.processBlobData(base64data, filename, blob.type);
            }
            
            // Console log for debugging
            console.log("Sent to Android App for download");

        } else {
            // ❌ Nahi, hum Browser me hain (Laptop/Chrome)
            // Toh purana wala Logic chalao
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
async function updateRecently(songUrl, image, songName, artist, len, songId) {
    // console.log("Running")
    const res = await fetch("/updateRecently", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ songUrl, image, songName, artist, len, songId })
    })
    const result = await res.json()
    //popupAlert(result.msg)
}

async function displayRecently() {
    const res = await fetch("/updateRecently")
    const result = await res.json()

    const ul = document.querySelector(".recentlyPlayed").querySelector("ul")
    const ul2 = document.querySelector(".recentlyPlayedForMobile").querySelector("ul")
    ul2.innerHTML = ""
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
            initEqualizer()
            player.src = song.songUrl
            highlight(song.songName, "recently")
            currentPlayingMusic(song.image, song.songName, song.artist, song.songId)
            globalLibrary = "recently"
            globalSongName = song.songName
            playpause()
            aiCurrentSong = song.songName
            aiCurrentArtist = song.artist
            currentSong = song.songId
        })
        const liClone = li.cloneNode(true)
        liClone.addEventListener("click", () => {
            initEqualizer()
            player.src = song.songUrl
            highlight(song.songName, "recently_1")
            currentPlayingMusic(song.image, song.songName, song.artist, song.songId)
            globalLibrary = "recently_1"
            globalSongName = song.songName
            playpause()
            aiCurrentSong = song.songName
            aiCurrentArtist = song.artist
            currentSong = song.songId
        })

        ul.appendChild(li)
        ul2.appendChild(liClone)
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

    // Load Base URL FIRST
    await loadBaseURL();

    // UI Setup
    addUnique("default-container-parent");
    universalPageHandler();
    document.getElementById("default-container-parent").classList.remove("hidden");

    // Fetch HOME DATA using the BASE URL
    const res = await fetch(`/search?type=home&query=a`);
    const result = await res.json();

    // console.log(result.data);

    // Common sections (always run)
    await Trending(result.data.data.trending.data);
    await artistHome(result.data.data.artist_recos.data);
    await topCharts(result.data.data.charts.data);
    await newPlaylists(result.data.data.playlists.data);
    await newReleases(result.data.data.promo5.data);
    await newAlbum(result.data.data.albums.data);

    // 3️⃣ Only for LOCALHOST:3000 → run extra 2 functions
    // if (SAAVN_BASE_URL === "http://localhost:3000") {
    //     await newReleases(result.data.data.promo6.data);
    //     await newAlbum(result.data.data.albums.data);
    // }

    // console.log("Home page initialized!");
}

async function newReleases(data) {
    const grid = document.getElementById('newReleasesGrid');
    grid.innerHTML = ''
    data.forEach(item => {
        const card = document.createElement('div')
        card.className = 'item-card'
        card.innerHTML = `
                    <img src="${item.image?.[2]?.link || '/placeholder.jpg'}" alt="${item.name}" class="item-card-image">
                    <div class="item-card-title">${item.name}</div>
                    
            `
        card.addEventListener("click", async () => {
            if (item.type === "song") {
                const req = await fetch(`/search?type=song&id=${item.id}`)
                const result = await req.json()
                const song = result.data.songs[0]
                player.src = song.download_url[4].link
                await updateRecently(song.download_url[4].link, song.image[2].link, song.name, song.artist_map.artists[0].name, song.duration, song.id)
                await displayRecently()
                currentPlayingMusic(song.image[2].link, song.name, song.artist_map.artists[0].name, song.id)
                playpause()
                initEqualizer()
                aiCurrentSong = song.name
                aiCurrentArtist = song.artist_map.artists[0].name
                updateInitialPlaylist(song.id)
                currentSong = song.id
            } else if (item.type === "album") {
                getAlbumDetails(item.id)
            } else if (item.type === "playlist") {
                console.log("playlist")
            }
        })
        grid.appendChild(card)
    })
}

async function Trending(data) {
    const grid = document.getElementById('newTrendingGrid');
    grid.innerHTML = ''
    data.forEach(item => {
        const imgSrc = Array.isArray(item.image) ? item.image?.[2]?.link : item.image
        const card = document.createElement('div')
        card.className = 'item-card'
        card.innerHTML = `
                    <img src="${imgSrc}" alt="${item.name}" class="item-card-image">
                    <div class="item-card-title">${item.name}</div>
                    <div class="item-card-subtitle">${!item.year ? 2025 : item.year}</div>
            `
        card.addEventListener("click", async () => {
            if (item.type === "song") {
                const req = await fetch(`${SAAVN_BASE_URL}/song?id=${item.id}`)
                const result = await req.json()
                const song = result.data.songs[0]
                initEqualizer()
                player.src = song.download_url[4].link
                await updateRecently(song.download_url[4].link, song.image[2].link, song.name, song.artist_map.artists[0].name, song.duration, song.id)
                await displayRecently()
                currentPlayingMusic(song.image[2].link, song.name, song.artist_map.artists[0].name, song.id)
                playpause()
                aiCurrentSong = song.name
                aiCurrentArtist = song.artist_map.artists[0].name
                updateInitialPlaylist(song.id)
                currentSong = song.id
            } else if (item.type === "album") {
                getAlbumDetails(item.id)
            } else if (item.type === "playlist") {
                getPlayListDetails(item.id, item.name, imgSrc)
            }
        })
        grid.appendChild(card)
    })
}

async function artistHome(data) {
    const grid = document.getElementById('featuredArtistGrid');
    grid.innerHTML = ''
    data.forEach(item => {
        const imgSrc = Array.isArray(item.image) ? item.image?.[2]?.link : item.image
        const card = document.createElement('div')
        card.className = 'item-card'
        card.innerHTML = `
                    <img src="${imgSrc}" alt="${item.name}" class="item-card-image">
                    <div class="item-card-title">${item.name}</div>
                    <div class="item-card-subtitle">${!item.year ? 2025 : item.year}</div>
            `
        card.addEventListener("click", () => { getArtistDetails(item.id) })
        grid.appendChild(card)
    })
}

async function topCharts(data) {
    const grid = document.getElementById('newChartsGrid');
    grid.innerHTML = ''
    data.forEach(item => {
        const imgSrc = Array.isArray(item.image) ? item.image?.[2]?.link : item.image
        const card = document.createElement('div')
        card.className = 'item-card'
        card.innerHTML = `
                    <img src="${imgSrc}" alt="${item.name}" class="item-card-image">
                    <div class="item-card-title">${item.name}</div>
            `
        card.addEventListener("click", () => { getPlayListDetails(item.id, item.name, item.image) })
        grid.appendChild(card)
    })
}

async function newPlaylists(data) {
    const grid = document.getElementById('newPlaylistsGrid');
    grid.innerHTML = ''
    data.forEach(item => {
        const imgSrc = Array.isArray(item.image) ? item.image?.[2]?.link : item.image
        const card = document.createElement('div')
        card.className = 'item-card'
        card.innerHTML = `
                    <img src="${imgSrc}" alt="${item.name}" class="item-card-image">
                    <div class="item-card-title">${item.name}</div>
            `
        card.addEventListener("click", () => { getPlayListDetails(item.id, item.name, item.image) })
        grid.appendChild(card)
    })
}

async function newAlbum(data) {
    const grid = document.getElementById('featuredAlbumGrid');
    grid.innerHTML = ''
    data.forEach(item => {
        const card = document.createElement('div')
        card.className = 'item-card'
        card.innerHTML = `
                    <img src="${item.image?.[2]?.link || '/placeholder.jpg'}" alt="${item.name}" class="item-card-image">
                    <div class="item-card-title">${item.name}</div>
                    <div class="item-card-subtitle">${item.year === 0 ? '2025' : item.year}</div>
            `
        card.addEventListener("click", async () => {
            if (item.type === "song") {
                // const req = await fetch(`${SAAVN_BASE_URL}/song?id=${item.id}`)
                const req = await fetch(`/search?type=songID&query=${item.id}`)
                const result = await req.json()
                const song = result.data.data.songs[0]
                initEqualizer()
                player.src = song.download_url[4].link
                await updateRecently(song.download_url[4].link, song.image[2].link, song.name, song.artist_map.artists[0].name, song.duration, song.id)
                await displayRecently()
                currentPlayingMusic(song.image[2].link, song.name, song.artist_map.artists[0].name, song.id)
                playpause()
                aiCurrentSong = song.name
                aiCurrentArtist = song.artist_map.artists[0].name
                updateInitialPlaylist(song.id)
                currentSong = song.id
            } else if (item.type === "album") {
                getAlbumDetails(item.id)
            } else if (item.type === "playlist") {
                getPlayListDetails(item.id, item.name, item.image[2].link)
            }
        })
        grid.appendChild(card)
    })
}

/**
 * Fetches and displays the details for a specific album.
 * Hides the main content and shows the album detail view.
 * @param {string} albumId - The ID of the album to fetch.
 */
async function getAlbumDetails(albumId) {
    universalPageHandler()
    addUnique("MainHomePage-2")
    const mainHomePage = document.getElementById('MainHomePage-2');
    if (mainHomePage.classList.contains("hidden")) {
        mainHomePage.classList.remove("hidden")
    }
    mainHomePage.innerHTML = '<div class="placeholder-card">Loading Album Details...</div>';

    try {
        const response = await fetch(`${SAAVN_BASE_URL}/album?id=${albumId}`);
        const data = await response.json();
        const res = await fetch("/get-favorite")
        const result = await res.json()
        if (data) {
            const album = data.data;
            // globalAlbumId = albumId

            const songsHtml = album.songs.map((song, index) => `
    <div class="song-list-item-1">
        <span class="song-number">${index + 1}</span>
        <img src="${song.image[2].link}" alt="${song.name}" class="song-image">
        <div class="song-info" onclick="playSong('${song.download_url[4].link}','${song.id}', '${song.name}', '${song.artist_map.artists[0].name}', '${song.image[2].link}','${song.duration}','album',${albumId})">
            <div class="song-name text-white">${song.name}</div>
            <div class="song-artist">${song.artist_map.artists[0].name}</div>
        </div>
        <div>
         <i class="bx bxs-heart text-${result?.arr?.some(item => item.songId === song.id) ? "danger" : "gray"}" id="heart-${index}" onclick="addFavorite(event,'${song.download_url[4].link}','${song.image[2].link}','${song.name}','${song.artist_map.artists[0].name}','${song.duration}','${index}','${song.id}')" title="Add to Like"></i>
        </div>
        <div class="relative" id="albumPlusIcon-${index}">
            <button class="play-button" onclick="toggleDropdown(event, ${index},'${song.download_url[4].link}','${song.name}','${song.image[2].link}','${song.duration}','${song.artist_map.artists[0].name}','${song.id}')" title="Add to Playlist">+</button>
        </div>
    </div>
`).join('');



            const detailHtml = `
                <div class="detail-view">
                    <button class="back-button" onclick="showMainView()">← Back to Home</button>
                    <div class="detail-header">
                        <img src="${album.image[2].link}" alt="${album.name}" class="detail-image">
                        <div class="detail-info">
                            <h1 class="text-white">${album.name}</h1>
                            <p>${album.artist_map.artists[0].name} • ${album.year}</p>
                            <p>${album.song_count} songs</p>
                            <button class="play-all-button" onclick="playSong('${album.songs[0].download_url[4].link}','${album.songs[0].id}', '${album.songs[0].name}', '${album.songs[0].artist_map.artists[0].name}', '${album.songs[0].image[2].link}','album','${albumId}')">▶ Play All</button>
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
    universalPageHandler()
    addUnique("MainHomePage-2")
    const mainHomePage = document.getElementById('MainHomePage-2');

    // Make sure artist section is visible
    if (mainHomePage.classList.contains("hidden")) {
        mainHomePage.classList.remove("hidden");
    }

    mainHomePage.innerHTML = '<div class="placeholder-card">Loading Artist Details...</div>';
    console.log("Fetching Artist ID:", artistId);

    try {
        const response = await fetch(`${SAAVN_BASE_URL}/artist?id=${artistId}`);
        const data = await response.json();

        if (!data || !data.data) {
            mainHomePage.innerHTML = `
                <div class="placeholder-card">
                    Could not load artist details.
                    <button class="back-button" onclick="showMainView()">Go Back</button>
                </div>`;
            return;
        }

        const artistData = data.data;
        // ✅ Handle both snake_case and camelCase keys safely
        const topSongs = artistData.top_songs || artistData.topSongs || [];
        const topAlbums = artistData.top_albums || artistData.topAlbums || [];
        const NewReleases = artistData.latest_release || []
        const TopPlaylist = artistData.featured_artist_playlist || []

        // ✅ Generate Top Songs HTML
        const topSongsHtml = topSongs.length
            ? topSongs.map((song, index) => {
                const image = song.image?.[2]?.link || "";
                const artistName =
                    song.artist_map?.artists?.[0]?.name ||
                    song.subtitle?.split(" - ")[0] ||
                    "Unknown Artist";
                const downloadLink = song.download_url?.[4]?.link || "#";
                const duration = song.duration || "0";

                return `
                    <div class="song-list-item-1 artistTopSongs">
                        <span class="song-number">${index + 1}</span>
                        <img src="${image}" alt="${song.name}" class="song-image">
                        <div class="song-info" 
                            onclick="playSong('${downloadLink}','${song.id}','${song.name}','${artistName}','${image}','${duration}','artist','${artistId}')">
                            <div class="song-title text-white font-bold">${song.name}</div>
                            <div class="song-artist">${artistName}</div>
                        </div>
                        <i class="bx bxs-heart text-gray" 
                            onclick="addFavorite('${downloadLink}','${image}','${song.name}','${artistName}','${duration}','${song.id}')" title="Add to Like"></i>
                        <div class="relative" id="albumPlusIcon-${index}">
                            <button class="play-button"
                                onclick="toggleDropdown(event, ${index}, '${downloadLink}', '${song.name}', '${image}', '${duration}', '${artistName}', '${song.id}')" title="Add to Playlist">
                                +
                            </button>
                        </div>
                    </div>
                `;
            }).join('')
            : `<p class="no-data">No Top Songs Found.</p>`;

        // ✅ Generate Top Albums HTML
        const topAlbumsHtml = topAlbums.length
            ? topAlbums.map(album => `
                <div class="item-card" onclick="getAlbumDetails('${album.id}')">
                    <img src="${album.image?.[2]?.link || ''}" alt="${album.name}" class="item-card-image">
                    <div class="item-card-title">${album.name}</div>
                    <div class="item-card-subtitle">${album.year || ''}</div>
                </div>
            `).join('')
            : `<p class="no-data">No Albums Found.</p>`;

        //New Releases
        const newReleases = NewReleases.map(album =>
            `
                <div class="item-card" onclick="getAlbumDetails('${album.id}')">
                    <img src="${album.image?.[2]?.link || ''}" alt="${album.name}" class="item-card-image">
                    <div class="item-card-title">${album.name}</div>
                    <div class="item-card-subtitle">${album.year || ''}</div>
                </div>
            `).join('')

        //top Playlist
        // console.log(TopPlaylist)
        //New Releases
        const topPlaylists = TopPlaylist.map(playlist =>
            `
                <div class="item-card" onclick="getPlayListDetails('${playlist.id}', '${playlist.name}','${playlist.image}')">
                    <img src="${playlist.image || ''}" alt="${playlist.name}" class="item-card-image">
                    <div class="item-card-title">${playlist.name}</div>
                </div>
            `).join('')


        // ✅ Build Final Artist Details HTML
        const detailHtml = `
            <div class="detail-view">
                <button class="back-button" onclick="showMainView()">← Back to Home</button>
                <div class="detail-header artist-header">
                    <img src="${artistData.image?.[2]?.link || ''}" 
                         alt="${artistData.name}" class="detail-image artist-image">
                    <div class="detail-info">
                        <h1 class="text-white">${artistData.name}</h1>
                        <p>${parseInt(artistData.follower_count || 0).toLocaleString()} Followers</p>
                    </div>
                    <div class="button">
                        <button class="flex items-center justify-center gap-2" onclick="addArtist('${artistId}')">
                            <i class="bx bx-plus font-bold"></i>Follow
                        </button>
                    </div>
                </div>

                <div class="content-category">
                    <h2>New Releases</h2>
                    <div class="content-grid">${newReleases}</div>
                </div>

                <div class="content-category">
                    <h2>Top Songs</h2>
                    <div class="song-list">${topSongsHtml}</div>
                </div>

                <div class="content-category">
                    <h2>Top Playlists</h2>
                    <div class="content-grid">${topPlaylists}</div>
                </div>

                <div class="content-category">
                    <h2>Top Albums</h2>
                    <div class="content-grid">${topAlbumsHtml}</div>
                </div>

                
            </div>
        `;

        mainHomePage.innerHTML = detailHtml;

    } catch (error) {
        console.error('Error fetching artist details:', error);
        mainHomePage.innerHTML = `
            <div class="placeholder-card">
                Error fetching artist details.
                <button class="back-button" onclick="showMainView()">Go Back</button>
            </div>`;
    }
}

async function addSearchSongFavorite(event, index, songId) {
    event.stopPropagation()
    const res = await fetch(`${SAAVN_BASE_URL}/song?id=${songId}`)
    const result = await res.json()
    const song = result.data[0]
    addFavorite(event, song.downloadUrl[4].url, song.image[2].url, song.name, song.artists.primary[0].name, song.duration, index, song.id)

}

async function songToggleDropdown(event, index, songId) {
    // console.log(songId + index + "hi")
    event.stopPropagation()
    const res = await fetch(`${SAAVN_BASE_URL}/song?id=${songId}`)
    const result = await res.json()
    const song = result.data[0]
    // console.log(result.data)
    toggleDropdown(event, index, song.downloadUrl[4].url, song.name, song.image[2].url, song.duration, song.artists.primary[0].name, song.id)
}

async function toggleDropdown(event, index, songUrl, songName, songImage, songLength, artist, songId) {
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
    await fetchplaylistList(index, songUrl, songName, songImage, songLength, artist, songId)

}

async function fetchplaylistList(index, songUrl, songName, songImg, songLength, artist, songId) {
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
            plus(songName, songImg, songUrl, artist, song.name, songLength, songId)
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

//Album ka gaana play karne ke liye 
async function playSong(url, songId, title, artist, image, duration, source, id) {
    // console.log(title)
    // console.log(`Playing: ${title} by ${artist} and source: ${source}`);
    initEqualizer()
    player.src = url
    globalAlbumId = id
    globalLibrary = source
    currentSong = songId
    globalSongName = title
    playpause()
    currentPlayingMusic(image, title, artist, songId)
    highlight(title, source)
    await updateRecently(url, image, title, artist, duration, songId)
    await displayRecently()
    aiCurrentSong = title
    aiCurrentArtist = artist
    // console.log(globalLibrary + " album ID:" + globalAlbumId)
}



// --- STATE MANAGEMENT ---
// Store the current search state globally
let currentSearchQuery = '';
let currentArtistPage = 1;
let currentAlbumPage = 1;
const RESULTS_PER_PAGE = 10;

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

function displayPlaylistResult(playlist) {
    // console.log(playlist)
    const artistGrid = document.getElementById('playlist-grid');
    const artistsHtml = playlist.map(artist => `
        <div class="item-card" onclick="getPlayListDetails('${artist.id}','${artist.title}','${artist.image}')">
            <img src="${artist.image || '/placeholder.jpg'}" alt="${artist.name}" class="item-card-image artist-image">
            <div class="item-card-title">${artist.title}</div>
            <div class="item-card-subtitle">${artist.type || 'Artist'}</div>
        </div>
    `).join('');
    artistGrid.innerHTML += artistsHtml;
}

async function getPlayListDetails(playlistId, playlistName, playlistImage) {
    universalPageHandler()
    let index = 1
    const mainHomePage = document.getElementById('MainHomePage-2');
    if (mainHomePage.classList.contains("hidden")) {
        mainHomePage.classList.remove("hidden")
    }
    mainHomePage.innerHTML = '<div class="placeholder-card">Loading Playlist Details...</div>';

    const res = await fetch(`${SAAVN_BASE_URL}/playlist?id=${playlistId}`)
    const result = await res.json();
    let html = `
        <div class="playlist-details text-white">
            <button class="back-button" onclick="showMainView()">← Back to Home</button>
            <div class="flex gap-5 items-center ">
                <img src="${playlistImage}" class=" h-150px rounded-lg">
                <h2>${playlistName || "My Playlist"}</h2>
                <button class="play-button" onclick="addToPlaylist(${playlistId})" > + </button>
            </div>
        </div>
        <ul class="playlist-songs">
    `;

    result.data.songs.forEach(song => {
        // console.log(song.name)
        html += `
            <li data-id="${song.id}" class="song-list-item mt-2 pointer font-bold">
                <div class="flex justify-center"><p>${index}</p></div>
                    <img src=${song.image[2].link} class="img-2 rounded">
                <div class="song-info" onclick="playPlaylistSongs('${song.id}','${playlistId}')" id="playlistSongName">
                    <div><p class="playlist-song-title">${song.name}</p></div>
                    <div><p class="text-sm text-gray">${song.artist_map.artists[0].name}</p></div>
                </div>
                <div>
                    <i class="bx bxs-download text-lg text-gray"></i>                
                </div>
                <div>
                    <i class="bx bxs-heart text-gray" id="heart-${index}" onclick="addSearchSongFavorite(event,${index},'${song.id}')"></i>
                </div>
                <div class="relative" id="albumPlusIcon-${index}">
                    <button class="play-button" onclick="songToggleDropdown(event,${index},'${song.id}')" > + </button>
                </div>
            </li>
        `;
        index++
    });
    // console.log(result.data.songs)
    html += `</ul>`;
    mainHomePage.innerHTML = html;
}

async function addToPlaylist(playlistId) {
    let songlistresult = ""
    const res = await fetch(`https://saavn.dev/api/playlists?id=${playlistId}&page=0&limit=10`)
    const result = await res.json()
    // console.log(result)
    const response = await fetch("/playlistname", {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: result.data.name, imageUrl: result.data.image[2].url })
    })
    const result1 = await response.json()
    if (response.status === 200) {
        const songlist = await fetch("/playlistData", {
            method: "post",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ playlistId: playlistId })
        });
        songlistresult = await songlist.json();
        const ids = songlistresult.playlistSongs.map(item => item.id);
        const songs = await fetchSongs(ids)
        // console.log(songs)

        const checkPlaylist = await fetch("/save", {
            method: "post",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ pname: result.data.name, songList: songs })
        })
        const checkPlaylistResult = await checkPlaylist.json()
        fetchPlaylist()
        popupAlert(result1.msg)
    } else {
        popupAlert(result1.msg)
    }

}

async function playPlaylistSongs(songId, playlistId) {
    const response = await fetch(`${SAAVN_BASE_URL}/song?id=${songId}`)
    const result = await response.json()
    const song = result.data.songs[0]
    initEqualizer()
    player.src = song.download_url[4].link
    currentPlayingMusic(song.image[2].link, song.name, song.artist_map.artists[0].name, song.id)
    updateRecently(song.download_url[4].link, song.image[2].link, song.name, song.artist_map.artists[0].name, song.duration, song.id)
    displayRecently()
    playpause()
    highlight(song.name, "playlist")
    globalLibrary = "OnlinePlaylist"
    globalSongName = song.name
    globalAlbumId = playlistId
    aiCurrentSong = song.name
    aiCurrentArtist = song.artist_map.artists[0].name
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

    searchResultsContainer?.classList.add('hidden');
    defaultContent.classList.remove('hidden');
    searchInput.value = '';
}

function showMainView() {

}

async function addFavorite(e, songUrl, image, name, artist, duration, index, songId) {
    e.stopPropagation()
    // alert(name)
    await favorite(songUrl, image, name, artist, duration, songId)
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
        document.querySelector(".currentPlayingMusic").style.display = "flex"
        document.getElementById("queryPlus").style.display = "none"
        document.getElementById("currentPlayingName").style.fontSize = "13px"

        document.getElementById("hamburgermenu").addEventListener("click", () => {
            MQchange();
        })
    } else {
        // console.log("11111111111")
        document.querySelector(".left1").style.width = "24%"
        document.querySelector(".righ1").style.width = "75%"
        document.querySelector(".currentPlayingMusic").style.display = "flex"
        document.getElementById("queryPlus").style.display = "flex"
        document.getElementById("currentPlayingName").style.fontSize = "16px"
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
    universalPageHandler()
    document.getElementById("default-container-parent").classList.remove("hidden")
    if (mq.matches) {
        const left = document.querySelector(".left1")
        const right = document.querySelector(".righ1")
        if (left.style.width == "0%") {
            // console.log("none")
            left.style.display = "block"
            // left.style.width = "100%";
            right.style.width = "100%"
            // initializeHomePage()
        } else {
            left.style.width = "0%"
            right.style.width = "100%"
            // initializeHomePage()
        }
    }
    // alert("clicked")
})

document.getElementById("media-profile-button").addEventListener("click", () => {
    document.getElementById("profile").classList.toggle("visible")
    // alert("clicked")
})



function profileThreeDot() {
    document.getElementById("threedotContent").classList.remove("hidden")
    document.getElementById("threedotModalClose").addEventListener("click", () => {
        document.getElementById("threedotContent").classList.add("hidden")
    })
}
// Artist ko follow karane ka function 
async function addArtist(id) {
    // e.stopPropagation()
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

// ====== PROFILE PAGE WITH FRIENDS & SHARING ======

let _playlistToShare = null;
let _friendsCache = [];

// Escape helper
function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/[&<>"']/g, ch => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;",
        '"': "&quot;", "'": "&#39;"
    }[ch]));
}

// ========== MAIN PROFILE FUNCTION ==========
async function openProfilePage() {
    universalPageHandler()
    document.querySelector(".profile-box").classList.remove("visible");
    document.querySelector(".MainProfileContainer").classList.remove("hidden");
    const res = await fetch("/userprofile");
    const result = await res.json();

    // Profile info
    document.querySelector(".profile-name").innerHTML = result.name;
    document.querySelector(".profile-email").innerHTML = result.email;
    document.querySelector(".profilePlaylistCount").innerHTML = `${result.lib.length} Playlist`;
    document.querySelector(".profileArtistCount").innerHTML = `${result.artist.length} Following`;

    // Render playlists
    document.querySelector(".grid-container").innerHTML = "";
    result.lib.forEach(item => {
        const tile = makePlaylistTile(item);
        document.querySelector(".grid-container").appendChild(tile);
    });

    // Render artists
    document.getElementById("profilePageArtist").innerHTML = "";
    result.artist.forEach(async (item) => {
        const response = await fetch(`${SAAVN_BASE_URL}/artist?id=${item.id}`);
        const result1 = await response.json();
        const div = document.createElement("div");
        div.innerHTML = `<div class="grid-item artist">
                      <img src=${result1.data.image[2]?.link} alt="Artist Picture">
                      <p class="item-title">${result1.data.name}</p>
                    </div>`;
        div.addEventListener("click", () => {
            document.querySelector(".MainProfileContainer").classList.add("hidden");
            document.getElementById("MainHomePage").classList.remove("hidden");
            getArtistDetails(item.id);
        });
        document.getElementById("profilePageArtist").appendChild(div);
    });
}

// ========== PLAYLIST TILE MAKER ==========
function makePlaylistTile(item) {
    const div = document.createElement("div");
    div.className = "playlist-tile";
    div.innerHTML = `
    <div class="grid-item">
      <img src="${item.image}" alt="Playlist Cover">
      <p class="item-title">${escapeHtml(item.name)}</p>
      <div style="margin-top:8px; display:flex; gap:8px;">
        <button class="btn play-1" data-name="${escapeHtml(item.name)}">Play</button>
        <button class="btn share" data-id="${item.id || item.name}" data-name="${escapeHtml(item.name)}">Share</button>
      </div>
    </div>`;

    // Play click
    div.querySelector(".play-1").addEventListener("click", () => {
        document.querySelector(".MainProfileContainer").classList.add("hidden");
        librarySongs(item.name);
    });

    // Share click
    div.querySelector(".share").addEventListener("click", () => {
        _playlistToShare = { id: item.id || item.name, name: item.name };
        openShareModal(_playlistToShare);
    });

    return div;
}

// Get the modal
const modal = document.getElementById('friend-request-modal');

// Get the button that opens the modal
const btn_ = document.getElementById('add-friend-btn'); // Agar aapne ID change ki hai

// Get the <span> element that closes the modal
const span = document.getElementById("friend-modal-close-btn")

// When the user clicks the button, open the modal
btn_.onclick = function () {
    modal.style.display = 'flex';
}

// When the user clicks on <span> (x), close the modal
span.onclick = function () {
    modal.style.display = 'none';
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

async function searchFriend() {
    let query = document.getElementById("searchUser").value.trim();
    if (!query) return;

    let res = await fetch(`/friends/search?username=${query}`);
    let data = await res.json();

    let box = document.getElementById("searchResults");
    box.innerHTML = "";

    if (data.length === 0) {
        box.innerHTML = `<p style='margin-top:10px; color:#bbb;'>No users found 😕</p>`;
        return;
    }

    data.forEach(user => {
        let div = document.createElement("div");
        div.className = "request-card";

        div.innerHTML = `
            <img src="" class="request-avatar">
            <div class="request-info">
                <span class="request-name">${user.username}</span>
                <span class="request-time">${user.status}</span>
            </div>
            <div class="request-actions">
                ${user.status === "Send Request"
                ? `<button class="accept-btn" onclick="sendRequest('${user.username}')">Send</button>`
                : `<button class="reject-btn" disabled>${user.status}</button>`
            }
            </div>
        `;
        box.appendChild(div);
    });
}

async function sendRequest(toUser) {
    let res = await fetch("/friends/send-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: toUser })
    });

    let data = await res.json();
    alert(data.message);

    searchFriend(); // refresh search results
}

function openFriendSection() {
    universalPageHandler()
    document.getElementById("profile").classList.remove("visible")
    document.getElementById("friends-section").classList.remove("hidden")
}

function renderFriendList(friends) {
    const container = document.getElementById("friendList");
    container.innerHTML = "";
    if (!friends.length) {
        container.innerHTML = '<p style="color:#9a9a9a">No friends yet — add one!</p>';
        return;
    }
    friends.forEach(f => {
        const div = document.createElement("div");
        div.className = "friend-card";
        div.innerHTML = `
      <div class="name">${escapeHtml(f.name || f.id)}</div>
      <div class="meta">${escapeHtml(f.email || f.id)}</div>
      <div style="margin-top:8px; display:flex; gap:8px;">
        <button class="btn viewProfile" data-id="${f.id}">View</button>
        <button class="btn shareWith" data-id="${f.id}">Share</button>
      </div>
    `;

        // View profile (you can implement later)
        div.querySelector(".viewProfile").addEventListener("click", () => {
            alert("Open friend profile: " + f.id);
        });

        // Share directly
        div.querySelector(".shareWith").addEventListener("click", () => {
            if (!_playlistToShare) {
                openShareModal(null, f.id);
            } else {
                sharePlaylist(f.id, _playlistToShare.id);
            }
        });
        container.appendChild(div);
    });
}

async function searchFriend(query) {
    const q = (query || "").trim();
    if (!q) {
        renderFriendList(_friendsCache);
        return;
    }
    const local = _friendsCache.filter(f =>
        (f.id || "").includes(q) ||
        (f.email || "").includes(q) ||
        (f.name || "").toLowerCase().includes(q.toLowerCase())
    );
    if (local.length) {
        renderFriendList(local);
        return;
    }
    try {
        const res = await fetch(`/friends/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        renderFriendList(json || []);
    } catch (err) {
        console.error("searchFriend err", err);
        renderFriendList([]);
    }
}

// ========== SHARE MODAL ==========
function openShareModal(playlistObj = null, preselectFriendId = null) {
    _playlistToShare = playlistObj;
    document.getElementById("shareModalPlaylistName").textContent =
        playlistObj ? playlistObj.name : "(pick friend)";
    document.getElementById("shareModal").classList.remove("hidden");

    const listDiv = document.getElementById("shareFriendList");
    listDiv.innerHTML = "";
    if (!_friendsCache.length) {
        listDiv.innerHTML = '<div style="color:#9a9a9a">No friends to share with.</div>';
        return;
    }
    _friendsCache.forEach(f => {
        const item = document.createElement("div");
        item.className = "share-friend-item";
        item.innerHTML = `
      <div>${escapeHtml(f.name || f.id)}
        <div style="font-size:12px;color:#9a9a9a">${escapeHtml(f.email || f.id)}</div>
      </div>
      <div><input type="radio" name="shareFriendRadio" value="${f.id}" ${preselectFriendId === f.id ? "checked" : ""} /></div>
    `;
        listDiv.appendChild(item);
    });

    document.getElementById("shareConfirmBtn").onclick = async () => {
        const checked = document.querySelector('input[name="shareFriendRadio"]:checked');
        const friendId = (checked && checked.value) || preselectFriendId;
        if (!friendId) return alert("Choose a friend");
        if (!_playlistToShare) return alert("Pick a playlist first to share.");
        await sharePlaylist(friendId, _playlistToShare.id);
        document.getElementById("shareModal").classList.add("hidden");
    };
}

document.getElementById("shareModalClose").addEventListener("click", () => {
    document.getElementById("shareModal").classList.add("hidden");
});

async function sharePlaylist(friendId, playlistId) {
    try {
        const res = await fetch("/sharePlaylist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ friendId, playlistId })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Share failed");
        alert("Playlist shared ✅");
    } catch (err) {
        console.error("sharePlaylist err", err);
        alert("Share failed: " + (err.message || "error"));
    }
}


const searchInputquery = document.getElementById("searchPageInput");
// const searchButton = document.getElementById("searchPageButton");
const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// Load history from localStorage
let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || [];

function updateHistory() {
    historyList.innerHTML = "";
    if (searchHistory.length === 0) {
        historyList.innerHTML = "<p>No recent searches yet.</p>";
        return;
    }

    searchHistory.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        li.onclick = () => {
            searchInputquery.value = item;
        };
        historyList.appendChild(li);
    });
}

// Clear all history
clearHistoryBtn.addEventListener("click", () => {
    searchHistory = [];
    localStorage.removeItem("searchHistory");
    updateHistory();
});

// Initial load
updateHistory();

async function Search(query) {
    document.getElementById("SearchContainer").classList.remove("hidden")
    document.getElementById("AiSearch").classList.add("hidden")
    const r = await fetch(`/search?type=song&query=${encodeURIComponent(query)}`);
    // const r = await fetch(`/officialsearch?q=${encodeURIComponent(query)}`);
    const data = await r.json();
    console.log(data)
    const ul = document.getElementById("searchResultSong")
    ul.innerHTML = ""
    data.data.data.results.forEach(song => {
        const li = document.createElement("li")
        li.className = "Search-song-item"
        const minute = Math.floor(song.duration / 60)
        const second = Math.floor(song.duration % 60)
        const time = `${minute}:${second.toString().padStart(2, '0')}`
        li.innerHTML = `
        <img
    src="${song.image[2].link}"
    alt=""
  />
  <span class="song-title"><b>${song.name}</b> - <strong>${song.artist_map.artists[0].name}</strong></span>
  <span class="song-length font-bold">${time}</span>
   <i class="bx bxs-heart text-gray hearts-icon" title="Add to Like"></i>
  <button class="play-button" title="Add to Playlist"> + </button>`

        li.addEventListener("click", async () => {
            initEqualizer()
            currentPlayingMusic(song.image[2].link, song.name, song.artist_map.artists[0].name, song.id)
            player.src = song.download_url[4].link
            await updateRecently(song.download_url[4].link, song.image[2].link, song.name, song.artist_map.artists[0].name, song.duration, song.id)
            await displayRecently()
            playpause()
            updateInitialPlaylist(song.id)
            currentSong = song.id
            aiCurrentSong = song.name
            aiCurrentArtist = song.artist_map.artists[0].name
        })

        li.querySelector(".hearts-icon").addEventListener("click", async (e) => {
            e.stopPropagation()
            favorite(song.download_url[4].link, song.image[2].link, song.name, song.artist_map.artists[0].name, song.duration, song.id)
        })
        ul.appendChild(li)
    })
    // document.getElementById("SearchContainer").innerHTML = `<div class="text-center">Searching...</div>`
}

document.getElementById("searchPageInput").addEventListener("input", () => {
    const searchInput = document.getElementById('searchPageInput');
    const query = searchInput.value.trim();
    if (query === "") {
        // console.log(".")
        return
    }
    const ids = ["SongContainer", "ArtistContainer", "PlaylistContainer", "AlbumContainer"]
    ids.forEach(id => {
        if (!document.getElementById(id).classList.contains("hidden")) {
            if (!isAiMode) {
                OnlineSearch(query, id)
            }
        }
    })
})

searchInputquery.addEventListener("keydown", async (event) => {
    // Check kar rahe hain ki kya 'Enter' dabaya gaya?
    if (event.key === 'Enter') {
        const query = searchInputquery.value.trim();
        if (!query) return;

        if (isAiMode) {
            console.log("🤖 AI Mode Triggered for:", query);

            // AI Search function call (await tabhi chalega jab function async ho)
            await performSmartSearch(query);
        } else {
            console.log("🔍 Normal Search (Enter press) for:", query);
            // Agar chaho toh normal search bhi Enter pe trigger kar sakte ho
            // OnlineSearch(query, "SongContainer"); 
        }
    }
});

async function performSmartSearch(userVibe) {
    const resultList = document.getElementById('AiSearch');

    document.getElementById("SearchContainer").classList.add("hidden")
    resultList.classList.remove("hidden")
    resultList.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8 text-gray-400 gap-4">
            <i class="fa-solid text-white fa-compact-disc fa-spin text-4xl text-purple-500"></i>
            <span class="text-lg text-white animate-pulse">AI is curating a playlist for "${userVibe}"...</span>
        </div>
    `;

    try {
        // Endpoint change kiya: /smart-playlist
        const response = await fetch(`/smart-playlist?vibe=${encodeURIComponent(userVibe)}`);
        const data = await response.json();

        if (data.success && data.songs.length > 0) {
            resultList.innerHTML = ''; // Clear Loading
            // console.log(data)
            // Header add kar sakte ho
            const header = document.createElement('li');
            header.className = "text-purple-400 text-xl font-bold px-2 mb-2 text-sm ul-none uppercase tracking-wider";
            header.innerText = `✨ AI Curated Playlist: ${data.vibe}`;
            resultList.appendChild(header);

            // LOOP chala ke saare gaane add karo
            data.songs.forEach((song, index) => {
                // Thoda delay animation ke liye (Optional)
                setTimeout(() => {
                    renderSongCard(song, resultList);
                }, index * 100);
            });

        } else {
            resultList.innerHTML = `<p class="p-4 text-danger font-bold text-center">😕 Gaane nahi mile. Try "Party songs" or "Sad songs".</p>`;
        }

    } catch (error) {
        console.error("Error:", error);
        resultList.innerHTML = `<p class="p-4 text-danger  font-bold text-center">Server Error.</p>`;
    }
}

// Helper Function: Card banane ke liye
function renderSongCard(song, container) {
    const li = document.createElement('li');
    // Tera wahi HTML structure
    // li.className = "w-full flex items-center justify-between p-2 hover:bg-[#2a2a2a] rounded-md cursor-pointer transition mb-2 border-b border-gray-800";
    li.className = "Search-song-item"
    li.onclick = () => playSmartSong(song.audio_url, song.title, song.artist, song.image_url);

    li.innerHTML = `
                    <img
                      src="${song.image_url}"
                      alt=""
                    />
                    <span>
                      <span class="song-title"><b>${song.title}</b></span>
                     <div class="text-sm text-gray"><strong>${song.artist}</strong></div></span>
                    <span class="song-length font-bold">${formatTime(song.duration)}</span>
                     <i class="bx bxs-heart text-gray hearts-icon" title="Add to Liked"></i>
                    <button class="play-button" title="Add to Playlist"> + </button>   `

    li.addEventListener("click", async () => {
        initEqualizer()
        currentPlayingMusic(song.image_url, song.title, song.artist, song.id)
        player.src = song.audio_url
        await updateRecently(song.audio_url, song.image_url, song.title, song.artist, song.duration, song.id)
        await displayRecently()
        playpause()
        currentSong = song.id
        aiCurrentSong = song.title
        aiCurrentArtist = song.artist
    })

    li.querySelector(".hearts-icon").addEventListener("click", async (e) => {
        e.stopPropagation()
        favorite(song.audio_url, song.image_url, song.title, song.artist, song.duration, song.id)
    })
    container.appendChild(li);
}

//Speak Search
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.continuous = false;
recognition.lang = 'en-IN'; // ya en-IN try kar
recognition.interimResults = false;

const micBtn = document.getElementById("micBtn");

micBtn.addEventListener("click", () => {
    recognition.start();
    console.log("Sun raha hoon... 🎧");
});

recognition.onresult = (event) => {
    const voiceText = event.results[0][0].transcript;
    console.log("User bola:", voiceText);
    document.getElementById("searchPageInput").value = voiceText;
    Search()
};

recognition.onerror = (event) => {
    console.error("Kuch gadbad hai bhai:", event.error);
};

recognition.onend = () => {
    console.log("Listening band ho gaya 😴");
};

async function fetchAndDisplayArtist(query, source) {
    const grid = document.getElementById(source);
    grid.innerHTML = ""
    query.forEach(artist => {
        const artistCard = document.createElement('div');
        artistCard.className = 'item-card';
        const imgSrc = Array.isArray(artist.image)
            ? artist.image[2]?.link  // agar array hai to 500x500 le le
            : artist.image || 'https://www.jiosaavn.com/_i/3.0/artist-default-film.png';
        // console.log(imgSrc)
        artistCard.innerHTML = `
                    <img src="${imgSrc}" alt="${artist.name}" class="item-card-image artist-image">
                    <div class="item-card-title">${artist.name}</div>
                    <div class="item-card-subtitle">${artist.role || 'Artist'}</div>
                `;
        // Add a click listener to show artist details (using your existing modal logic)
        artistCard.addEventListener('click', () => {
            document.getElementById("Search-History").classList.add("hidden")
            if (source === "ArtistContainer") {
                getArtistDetails(artist.id)
            } else if (source === "AlbumContainer") {
                getAlbumDetails(artist.id)
            } else if (source === "PlaylistContainer") {
                getPlayListDetails(artist.id, artist.name, artist.image)
            }
        });
        grid.appendChild(artistCard);
    });
}

async function OnlineSearch(query, source) {
    if (source === "AlbumContainer") {
        const album = await fetch(`/search?type=album&query=${encodeURIComponent(query)}`)
        const albumResponse = await album.json()
        fetchAndDisplayArtist(albumResponse.data.data.results, "AlbumContainer");
    } else if (source === "ArtistContainer") {
        const artist = await fetch(`/search?type=artist&query=${encodeURIComponent(query)}`)
        const artistResponse = await artist.json()
        fetchAndDisplayArtist(artistResponse.data.data.results, "ArtistContainer");
    } else if (source === "PlaylistContainer") {
        const playlist = await fetch(`/search?type=album&query=${encodeURIComponent(query)}`)
        const playlistResponse = await playlist.json()
        fetchAndDisplayArtist(playlistResponse.data.data.results, "PlaylistContainer");
    } else if (source === "SongContainer") {
        Search(query)
    }
}

document.getElementById("SearchContainerOptionArtist").addEventListener("click", async () => {
    const option = document.getElementById("SearchContainerOptionArtist")
    console.log(option.innerHTML)
    const artist = document.getElementById("ArtistContainer")
    const ids = ["SongContainer", "AlbumContainer", "PlaylistContainer"]
    ids.forEach(item => {
        document.getElementById(item).classList.add("hidden")
    })
    artist.classList.remove("hidden")
    const searchInput = document.getElementById('searchPageInput');
    const query = searchInput.value.trim();
    OnlineSearch(query, "ArtistContainer")
    artist.innerHTML = "Searching"
})

document.getElementById("SearchContainerOptionAlbum").addEventListener("click", async () => {
    const option = document.getElementById("SearchContainerOptionAlbum")
    console.log(option.innerHTML)
    const album = document.getElementById("AlbumContainer")
    const ids = ["SongContainer", "ArtistContainer", "PlaylistContainer"]
    ids.forEach(item => {
        document.getElementById(item).classList.add("hidden")
    })
    album.classList.remove("hidden")
    const searchInput = document.getElementById('searchPageInput');
    const query = searchInput.value.trim();
    OnlineSearch(query, "AlbumContainer")
    album.innerHTML = "Searching"
})

document.getElementById("SearchContainerOptionPlaylist").addEventListener("click", async () => {
    const option = document.getElementById("SearchContainerOptionPlaylist")
    console.log(option.innerHTML)
    const artist = document.getElementById("PlaylistContainer")
    const ids = ["SongContainer", "AlbumContainer", "ArtistContainer"]
    ids.forEach(item => {
        document.getElementById(item).classList.add("hidden")
    })
    artist.classList.remove("hidden")
    const searchInput = document.getElementById('searchPageInput');
    const query = searchInput.value.trim();
    OnlineSearch(query, "PlaylistContainer")
    artist.innerHTML = "Searching"
})

document.getElementById("SearchContainerOptionSong").addEventListener("click", async () => {
    const option = document.getElementById("SearchContainerOptionSong")
    console.log(option.innerHTML)
    const song = document.getElementById("SongContainer")
    const ids = ["AlbumContainer", "ArtistContainer", "PlaylistContainer"]
    ids.forEach(item => {
        document.getElementById(item).classList.add("hidden")
    })
    song.classList.remove("hidden")
    const searchInput = document.getElementById('searchPageInput');
    const query = searchInput.value.trim();
    OnlineSearch(query, "SongContainer")
})

function universalPageHandler() {
    // alert("hi")
    const ids = ["mainSongContent", "likedSongList", "MainProfileContainer", "default-container-parent", "Search-History", "MainHomePage-2", "friends-section", "now-playing-details-page", "recentlyPlayForMobile", "equalizer"]
    ids.forEach(id => {
        document.getElementById(id).classList.add("hidden")
    })
}

function addUnique(value) {
    // agar value already hai to hata do
    const index = backButtonArray.indexOf(value);
    if (index !== -1) {
        backButtonArray.splice(index, 1); // purani value hata di
    }
    // nayi value ko end me daal do
    backButtonArray.push(value);
}

document.getElementById("currentPlayingSongDetails").addEventListener("click", async () => {
    await universalPageHandler()
    document.getElementById("now-playing-details-page").classList.remove("hidden")

})



document.addEventListener('click', (e) => {
    // Check agar click kiya gaya element humara button hai
    if (e.target && e.target.id === 'toggleLyricsBtn') {

        const lyricsContent = document.getElementById('lyrics-content');
        const toggleBtn = e.target; // Button wahi hai jispe click hua

        if (lyricsContent) {
            // Class toggle karo
            const isExpanded = lyricsContent.classList.toggle('expanded');

            // Text change karo
            if (isExpanded) {
                toggleBtn.textContent = 'Show Less';
            } else {
                toggleBtn.textContent = 'Read More...';
            }
        }
    }
});

async function currentPlayingSongDetails(id) {
    console.log(id)
    const [songRes, recoRes] = await Promise.all([
        fetch(`/search?type=songID&query=${id}`),
        fetch(`/search?type=recomended&query=${id}`)
    ]);

    const result = await songRes.json();
    const reco_result = await recoRes.json();

    // Song Data Extract
    const song = result.data.data.songs[0];

    // Artist Data Fetch (Isko independent rakha taaki basic UI jaldi dikh jaye)
    const artist_req = await fetch(`/search?type=artistID&query=${song.artist_map.artists[0].id}`);
    const artist_res = await artist_req.json();
    // --- 2. Render UI IMMEDIATELY (Bina Lyrics ka wait kiye) ---
    const minute = Math.floor(song.duration / 60);
    const second = Math.floor(song.duration % 60);

    // Cover & Main Info
    document.querySelector(".cover-art-section").querySelector("img").src = song.image[2].link;
    document.querySelector(".song-main-info").innerHTML = `
        <h1>${song.name}</h1>
        <p class="artist-names">${song.artist_map.artists[0].name}</p>
        <p class="album-name">${song.album}</p>`;

    // Action Buttons
    document.querySelector(".action-buttons").innerHTML = `
        <button class="add-to-playlist-btn">Add to Playlist</button>
        <button class="share-song-btn">Share Song</button>
        <button class="more-options-btn">...</button>`; // SVG short kiya space ke liye

    document.querySelector(".text-details-section").innerHTML = `
        <div class="about-section">
            <h3>About the Song</h3>
            <p><strong>Release Date:</strong> ${song.release_date}</p>
            <p><strong>Duration: </strong> ${minute}:${second.toString().padStart(2, '0')}</p>
        </div>
        <div class="lyrics-section">
            <h3>Lyrics</h3>
            <div class="lyrics-content-wrapper active" id="lyrics-content">
                <p class="lyrics-text" id="lyrics-text-container">
                    <span class="text-gray-400 flex items-center gap-2">
                        <i class="fa-solid fa-compact-disc fa-spin"></i> Fetching lyrics...
                    </span>
                </p>
            </div>
            <button class="toggle-lyrics-btn" id="toggleLyricsBtn" style="display: none;">Read More...</button>
        </div>`;

    // --- 4. Render Recommendations & Artists (Turant) ---
    renderRecommendations(reco_result);
    renderRelatedArtists(song.artist_map.artists);
    renderSameArtistSongs(artist_res.data);
    loadLyricsInBackground(song.id);
}

// --- Helper Functions ---

// 🔥 Alag Function Lyrics ke liye
async function loadLyricsInBackground(id) {
    try {
        const ly = await fetch(`/search?type=lyrics&query=${id}`)

        const ly_result = await ly.json();
        // console.log(ly_result)
        const lyricsContainer = document.getElementById("lyrics-text-container");
        const toggleBtn = document.getElementById("toggleLyricsBtn");

        if (ly_result.data.status === "Success") {
            const formattedLyrics = ly_result.data.data.lyrics.replace(/\n/g, '<br>');

            // UI Update
            lyricsContainer.innerHTML = formattedLyrics;

            // Button dikhao
            if (toggleBtn) toggleBtn.style.display = "block";

        } else {
            lyricsContainer.innerHTML = "Lyrics not available.";
        }
    } catch (error) {
        console.error("Lyrics load failed", error);
        document.getElementById("lyrics-text-container").innerHTML = "Failed to load lyrics.";
    }
}

// Code clean rakhne ke liye Rendering logic alag kar diya
function renderRecommendations(reco_result) {
    const container = document.querySelector(".song-list-horizontal");
    container.innerHTML = "";
    // console.log(reco_result)
    reco_result.data.data.forEach(song => {
        const div = document.createElement("div");
        div.className = "song-card-horizontal";
        div.innerHTML = `
            <img src="${song.image[2].link}" alt="Cover" class="h-200px">
            <div class="song-infos">
                <span class="song-titles">${song.name}</span>
                <span class="song-artist">${song.artist_map.artists[0].name}</span>
            </div>
            <button class="play-small-btn" onclick="playSong('${song.download_url[4].link}','${song.id}','${song.name}','${song.artist_map.artists[0].name}','${song.image[2].link}','${song.duration}','','')">
                <i class="fa-solid fa-play"></i>
            </button>`;
        container.appendChild(div);
    });
}

function renderRelatedArtists(artists) {
    const container = document.querySelector(".artist-list-horizontal");
    container.innerHTML = "";
    artists.forEach(artist => {
        const imgSrc = Array.isArray(artist.image) ? artist.image[2].link : "https://cdn-icons-png.flaticon.com/512/847/847969.png";
        const div = document.createElement("div");
        div.className = "artist-card-horizontal";
        div.innerHTML = `
            <img src="${imgSrc}" class="artist-photo">
            <span class="artist-name">${artist.name}</span>`;
        div.addEventListener("click", () => getArtistDetails(artist.id));
        container.appendChild(div);
    });
}

function renderSameArtistSongs(artist_res) {
    const container = document.getElementById("song-list-horizontal");
    container.innerHTML = "";
    artist_res.data.top_songs.forEach(songs => {
        const div = document.createElement("div");
        div.className = "song-card-horizontal";
        div.innerHTML = `
            <img src="${songs.image[2].link}">
            <div class="song-info">
                <span class="song-title">${songs.name}</span>
                <span class="song-artist">${songs.artist_map.artists[0].name}</span>
            </div>
            <button class="play-small-btn" onclick="playSong('${songs.download_url[4].link}','${songs.id}','${songs.name}','${songs.artist_map.artists[0].name}','${songs.image[2].link}','${songs.duration}','','')">
                <i class="fa-solid fa-play"></i>
            </button>`;
        container.appendChild(div);
    });
}

// let audioCtx;
// let source;
// let filters = [];
// const frequencies = [60, 170, 350, 1000, 3000, 10000]; // Tere 6 bands

// // --- 1. Audio Engine Initialization ---
// function initEqualizer() {
//     const audioElement = document.getElementById("player"); // Tera <audio> tag
//     if (!audioElement || audioCtx) return; // Agar already bana hai to ruk jao

//     // CORS Issue fix karne ke liye (External links ke liye zaroori hai)
//     audioElement.crossOrigin = "anonymous";

//     // Audio Context start karo
//     const AudioContext = window.AudioContext || window.webkitAudioContext;
//     audioCtx = new AudioContext();

//     // Source banao
//     source = audioCtx.createMediaElementSource(audioElement);

//     // Filters create karo
//     filters = frequencies.map(freq => {
//         const filter = audioCtx.createBiquadFilter();

//         // 60Hz ke liye LowShelf (Base), baaki Peaking, 10k ke liye HighShelf
//         if (freq === 60) filter.type = "lowshelf";
//         else if (freq === 10000) filter.type = "highshelf";
//         else filter.type = "peaking";

//         filter.frequency.value = freq;
//         filter.Q.value = 1;
//         filter.gain.value = 0; // Default flat
//         return filter;
//     });

//     // Chain Connect karo: Source -> Filter1 -> Filter2 ... -> Speakers
//     source.connect(filters[0]);
//     for (let i = 0; i < filters.length - 1; i++) {
//         filters[i].connect(filters[i + 1]);
//     }
//     // Last filter ko destination (Speakers) se jodo
//     filters[filters.length - 1].connect(audioCtx.destination);

//     console.log("🎛️ Equalizer Engine Started!");
// }

// const sliders = document.querySelectorAll('.vertical-slider');

// sliders.forEach((slider, index) => {
//     slider.addEventListener('input', (e) => {
//         // Audio Engine agar ready nahi hai toh shuru karo
//         if (!audioCtx) initEqualizer();

//         const value = parseFloat(e.target.value);

//         // Filter Gain update karo
//         if (filters[index]) {
//             filters[index].gain.value = value;
//         }
//     });
// });

// --- 3. Presets Logic (Bass Boost, Vocal, etc.) ---
const presets = {
    "Custom": [0, 0, 0, 0, 0, 0],
    "Bass Boost": [10, 8, 3, 0, 0, 2],
    "Vocal": [-2, -1, 3, 6, 4, 2],
    "Rock": [5, 3, -2, 4, 6, 8]
};

document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // UI Active Class Logic
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const presetName = e.target.innerText;
        const values = presets[presetName];

        if (values) {
            applySettings(values);
        }
    });
});

// Helper Function: Settings apply karne ke liye (UI + Audio dono)
function applySettings(values) {
    if (!audioCtx) initEqualizer();

    sliders.forEach((slider, index) => {
        // 1. UI Slider move karo
        slider.value = values[index];

        // 2. Audio Filter update karo
        if (filters[index]) {
            // Smooth transition (Pop sound se bachne ke liye)
            filters[index].gain.setTargetAtTime(values[index], audioCtx.currentTime, 0.1);
        }
    });
}

// --- 4. AI Button Logic Integration ---
document.getElementById('ai-eq-btn').addEventListener('click', async () => {
    const btn = document.getElementById('ai-eq-btn');
    const originalContent = btn.innerHTML;

    // Loading State
    btn.innerHTML = `<i class="fa-solid fa-compact-disc fa-spin"></i> Analyzing...`;


    try {
        const res = await fetch(`/get-ai-eq?song=${encodeURIComponent(aiCurrentSong)}&artist=${encodeURIComponent(aiCurrentArtist)}`);
        const data = await res.json();

        if (data.success) {
            console.log(`🤖 AI Detected: ${data.genre}`, data.values);
            btn.innerHTML = `<i class="fa-solid fa-check"></i> Tuned: ${data.genre}`;
        } else {
            btn.innerHTML = "Failed";
        }
    } catch (err) {
        console.error(err);
        btn.innerHTML = "Error";
    }

    // 2 second baad button wapas normal
    setTimeout(() => {
        btn.innerHTML = originalContent;
    }, 2000);
});

// Smart AI Search Feature 
document.getElementById("aiToggleBtn").addEventListener("click", () => {
    document.getElementById("searchPageInput").classList.toggle("purple-border")
})

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById('searchPageInput');
    const searchWrapper = document.getElementById('searchWrapper');
    const aiBtn = document.getElementById('aiToggleBtn');

    // --- 1. Toggle Button Logic ---
    aiBtn.addEventListener('click', () => {
        isAiMode = !isAiMode;

        if (isAiMode) {
            // AI Mode ON: Purple Glow lagao, Green hatao
            searchWrapper.classList.add('ai-glow-mode');
            searchWrapper.classList.remove('normal-focus-mode'); // Green hata diya

            aiBtn.classList.add('ai-icon-active');
            searchInput.placeholder = "✨ Describe a vibe (e.g. Gym motivation)...";
            searchInput.focus();
        } else {
            // AI Mode OFF: Purple hatao
            searchWrapper.classList.remove('ai-glow-mode');
            aiBtn.classList.remove('ai-icon-active');

            searchInput.placeholder = "Search for Artists or Albums...";

            // Wapas Green border lao kyunki input abhi bhi focused hai
            if (document.activeElement === searchInput) {
                searchWrapper.classList.add('normal-focus-mode');
            }
        }
    });

    searchInput.addEventListener('focus', () => {
        if (!isAiMode) {
            searchWrapper.classList.add('normal-focus-mode');
        }
    });

    searchInput.addEventListener('blur', () => {
        searchWrapper.classList.remove('normal-focus-mode');
    });
});

