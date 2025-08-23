let OTP = 0
let email = ""
document.getElementById("loginform").addEventListener("submit", async (event) => {
  event.preventDefault()
  const email = document.getElementById("email").value
  const password = document.getElementById("password").value

  const data = { email, password }
  const response = await fetch("/login", {
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })
  const result = await response.json()
  if (response.ok) {
    window.location.href = "/"
  }
  if (response.status === 401) {
    document.getElementById("password").style.border = "2.5px solid red"
    alert(result.message)

  }
  if (response.status === 400) {
    document.getElementById("email").style.border = "2.5px solid red"
    alert(result.message)

  }
})

document.getElementsByTagName("svg")[2].addEventListener("click", () => {
  const pass = document.getElementById("password")
  const eye = document.getElementsByTagName("svg")[2]
  const col = eye.style.fill === "white" ? "gray" : "white"
  eye.style.fill = col
  const type = pass.type === "password" ? "text" : "password";

  pass.type = type

})

document.getElementById("close").addEventListener("click", () => {
  location.reload(true);
  document.querySelector(".popup").style.display = "none"
})

function openPopup() {
  document.querySelector(".popup").style.display = "flex"
}

document.getElementById("forgetpass").addEventListener("submit", async (event) => {
  event.preventDefault()

  const forgetemail = document.getElementById("email1").value
  email = forgetemail
  const response = await fetch("/forgetpass", {
    method: "post",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ forgetemail })
  })
  const result = await response.json()
  if (response.status === 200) {
    // document.getElementById("email-confirm").value = forgetemail
    document.querySelector(".forget").style.display = "none"
    document.querySelector(".updt").style.display = "block"
    const res = await fetch("/send-otp", {
      method: "post",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: forgetemail })
    })

    const otpResult = await res.json()
    OTP = otpResult.otp
    document.getElementById("otpAlert").classList.remove("none")
    document.getElementById("otpAlert").innerHTML = "Otp Send Successfully"
    setTimeout(() => {
      document.getElementById("otpAlert").classList.add("none")
    }, 2500)
    console.log(otpResult.otp)
  } if (response.status === 400) {
    alert(result.message)
  }
})

// document.getElementById("updtpass").addEventListener("submit", async (event) => {
//   event.preventDefault()
//   const newpassword = document.getElementById("password2").value
//   const email = document.getElementById("email-confirm").value
//   const response = await fetch("/updtpass", {
//     method: "post",
//     headers: {
//       "Content-Type": "application/json"
//     },
//     body: JSON.stringify({ newpassword, email })
//   })
//   const result = await response.json()
//   if (response.status === 200) {
//     alert(result.message)
//     setTimeout(() => {
//       document.querySelector(".popup").style.display = "none"
//     }, 500);

//   } if (response.status === 400) {
//     alert(result.message)
//   }
// })

function google() {
  window.location.href = "/auth/google"
}

const inputs = document.querySelectorAll(".otp-input");
const form = document.getElementById("getOTP");

// cursor auto move
inputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    if (input.value.length === 1 && index < inputs.length - 1) {
      inputs[index + 1].focus();
    }
  });

  // backspace par pichhle input me jao
  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && input.value === "" && index > 0) {
      inputs[index - 1].focus();
    }
  });
});

// OTP submit hone par JS me laao
form.addEventListener("submit", (e) => {
  e.preventDefault();
  let otp = "";
  inputs.forEach(input => {
    otp += input.value;
  });
  if (OTP == otp) {
    console.log("matched")
    document.querySelector(".updt").style.display = "none"
    document.querySelector(".updateNewPassword").classList.remove("none")
  } else {
    document.getElementById("otpAlert").classList.remove("none")
    document.getElementById("otpAlert").innerHTML = "Wrong OTP"
    setTimeout(() => {
      document.getElementById("otpAlert").classList.add("none")
    }, 2500)
  }
  // console.log("Entered OTP:", otp); 
});

async function ResendOTP() {

  const response = await fetch("/forgetpass", {
    method: "post",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ forgetemail: email })
  })
  const result = await response.json()
  if (response.status === 200) {
    // document.getElementById("email-confirm").value = forgetemail
    document.querySelector(".forget").style.display = "none"
    document.querySelector(".updt").style.display = "block"
    const res = await fetch("/send-otp", {
      method: "post",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: email })
    })

    const otpResult = await res.json()
    OTP = otpResult.otp
    document.getElementById("otpAlert").classList.remove("none")
    document.getElementById("otpAlert").innerHTML = "Otp resend successfully"
    setTimeout(() => {
      document.getElementById("otpAlert").classList.add("none")
    }, 2500)
    console.log(otpResult.otp)
  } if (response.status === 400) {
    alert(result.message)
  }
}

const resetBtn = document.getElementById("resetBtn");

resetBtn.addEventListener("click", async() => {
  const newPass = document.getElementById("newPassword").value;
  const confirmPass = document.getElementById("confirmPassword").value;

  if (newPass === "" || confirmPass === "") {
    alert("Both fields are required!");
    return;
  }

  if (newPass !== confirmPass) {
    alert("Passwords do not match ❌");
  } else {
    const res = await fetch("/updtpass", {
      method:"post",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({newpassword:confirmPass, email})
    })
    const result = await res.json()
    if(res.status === 200){
      alert(result.message)
      location.reload(true)
    }else{
      alert(result.message)
    }
    // Yaha tu backend ko password bhej sakta hai
  }
});