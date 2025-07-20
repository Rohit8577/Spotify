let btn = document.getElementById("logo")
btn.addEventListener("click", ()=>{
    window.location.href = "/"
})

let login = document.getElementsByTagName("p")[4]
login.addEventListener("click", ()=>{
    window.location.href = "/login"
})

let signup = document.getElementsByTagName("p")[3]
signup.addEventListener("click", ()=>{
    window.location.href = "/signup"
})

let download = document.getElementsByTagName("p")[2]
download.addEventListener("click", ()=>{
    window.location.href = "/download"
})

let apple = document.getElementsByTagName("img")[1]
apple.addEventListener("click",()=>{
    window.open("https://spotify.link/h5TbcGLLkhb?label=sp_cid%3A1e010143db71c4e9a6dab6b9e7e69d6f", "_blank")
})

let playstore = document.getElementsByTagName("img")[2]
playstore.addEventListener("click",()=>{
    window.open("https://spotify.link/T1vKH6Kr9ib?label=sp_cid%3A1e010143db71c4e9a6dab6b9e7e69d6f", "_blank")
})

let ms = document.getElementsByTagName("img")[3]
ms.addEventListener("click",()=>{
    window.open("https://apps.microsoft.com/store/detail/9NCBCSZSJRSB?launch=true&amp;mode=mini&amp;cid=spotifyweb-store-button", "_blank")
})