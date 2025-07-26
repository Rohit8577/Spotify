document.getElementById("loginform").addEventListener("submit", async(event)=>{
  event.preventDefault()
  const email = document.getElementById("email").value
  const password = document.getElementById("password").value

  const data = {email,password}
  const response = await fetch("/login", {
    "method":"POST",
    "headers":{
        "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })
  const result = await response.json()
  if(response.ok){
    window.location.href = "/"
  }
  if(response.status === 401){
    document.getElementById("password").style.border = "2.5px solid red"
    alert(result.message)

  }
  if(response.status === 400){
    document.getElementById("email").style.border = "2.5px solid red"
    alert(result.message)

  }
})

document.getElementsByTagName("svg")[2].addEventListener("click", ()=>{
    const pass = document.getElementById("password")
    const eye = document.getElementsByTagName("svg")[2]
    const col = eye.style.fill === "white" ? "gray" : "white"
    eye.style.fill = col
    const type = pass.type === "password" ? "text" : "password";
    
    pass.type = type
    
})

document.getElementById("close").addEventListener("click", ()=>{
  location.reload(true);
  document.querySelector(".popup").style.display = "none"
})

function openPopup(){
  document.querySelector(".popup").style.display = "flex"
}

document.getElementById("forgetpass").addEventListener("submit", async(event)=>{
  event.preventDefault()

  const forgetemail = document.getElementById("email1").value 
  const response = await fetch("/forgetpass", {
    method:"post",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({forgetemail})
  })
  const result = await response.json()
  if(response.status===200){
    document.getElementById("email-confirm").value = forgetemail
    document.querySelector(".forget").style.display = "none"
    document.querySelector(".updt").style.display = "block"
  }if(response.status === 400){
    alert(result.message)
  }
})

document.getElementById("updtpass").addEventListener("submit", async(event)=>{
  event.preventDefault()
  const newpassword = document.getElementById("password2").value
  const email = document.getElementById("email-confirm").value
  const response = await fetch("/updtpass", {
    method:"post",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({newpassword, email})
  })
  const result = await response.json()
  if(response.status === 200){
    alert(result.message)
    setTimeout(() => {
      document.querySelector(".popup").style.display = "none"
    }, 500);
    
  }if(response.status===400){
    alert(result.message)
  }
})

function google(){
  window.location.href = "/auth/google"
}