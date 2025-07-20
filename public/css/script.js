// console.log("JS Initilizing")

// async function getsong() {
//     let a = await fetch("http://127.0.0.1:3000/css/song/")
//     let response = await a.text()
//     console.log(response)
//     let div = document.createElement("div")
//     div.innerHTML = response
//     let as = div.getElementsByTagName("a")
//     let songs = []
//     for (let index = 0; index < as.length; index++) {
//         const element = as[index];
//         if (element.href.endsWith(".mp3")) {
//             songs.push(element.href)
//         }

//     }
//     return songs
// }

// async function main() {
//     let songs = await getsong() 
//     console.log(songs)
//     var audio = new Audio(songs[0])
//     audio.play();
    
// audio.addEventListener("loadeddata", () => {
//   let duration = audio.duration;
//   console.log(duration)
//   // The duration variable now holds the duration (in seconds) of the audio clip
// });

// }
 
// main()

let btn = document.getElementById("loginBtn")
btn.addEventListener("click", ()=>{
    window.location.href = "/login"
})

let btn1  = document.getElementById("signUp")
btn1.addEventListener("click",()=>{
   window.open("/signup")
})

let btn2 = document.getElementById("install")
btn2.addEventListener("click", ()=>{
    document.querySelector(".right-top").style.display = "none"
    document.querySelector(".title").style.display = "none"
    document.querySelector(".music-box").style.display = "none"
    document.querySelector(".music-line").style.display ="none"
    document.getElementsByTagName("svg")[3].style.fill = "gray"
    document.querySelector(".install-page").style.display = "block"
    document.querySelector(".browse-box").style.display= "none"
    document.querySelector(".right-box").style.cssText = "overflow: scroll; overflow-x: hidden"
})

let btn3 = document.getElementById("home-logo")
btn3.addEventListener("click", ()=>{
    document.querySelector(".right-box").style.overflow = "hidden"
    document.querySelector(".right-top").style.display = "flex"
    document.querySelector(".title").style.display = "flex"
    document.querySelector(".music-box").style.display = "block"
    document.querySelector(".music-line").style.display ="flex"
    document.querySelector(".install-page").style.display = "none"
    document.querySelector(".browse-box").style.display= "none"
    document.getElementsByTagName("svg")[3].style.fill = "gray"
})

function redirect(){
    window.open("https://apps.microsoft.com/store/detail/9NCBCSZSJRSB?launch=true&amp;mode=mini&amp;cid=spotifyweb-store-button", "_blank")
}

let btn4 = document.querySelector(".add");
let playlistBox = document.querySelector(".new-playlist");

btn4.addEventListener("click", () => {
    playlistBox.classList.toggle("active"); // Toggle the "active" class
});

let btn5 = document.getElementById("browse")
btn5.addEventListener("click", ()=>{
    document.querySelector(".browse-box").style.display= "block"
    document.querySelector(".install-page").style.display = "none"
    document.querySelector(".right-top").style.display = "none"
    document.querySelector(".title").style.display = "none"
    document.querySelector(".music-box").style.display = "none"
    document.querySelector(".right-box").style.cssText = "overflow: scroll; overflow-x: hidden"
    document.querySelector(".music-line").style.display ="none"
    document.getElementsByTagName("svg")[3].style.fill = "white"
})

let search = document.getElementsByTagName("svg")[2]
search.addEventListener("click", ()=>{
    document.querySelector("input").focus()
})

let download = document.getElementsByTagName("b")[3]
download.addEventListener("click", ()=>{
    window.open("download")
})

if(sess){
    alert("Session active")
}else{
    alert("No active session")
}