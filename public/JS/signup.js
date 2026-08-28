let OTP = 0
let globalEmail = ""

function google() {
    window.location.href = "/auth/google"
}

document.getElementById("signup").addEventListener("submit", async (event) => {
    event.preventDefault()
    const email = document.getElementById("email").value
    const response = await fetch("/emailCheck", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
    })

    if (response.status === 400) {
        document.getElementById("email").style.border = "1px solid red"
        document.getElementById("alert").style.display = "flex"
        setTimeout(() => {
            document.getElementById("alert").style.display = "none"
        }, 3000)
    } else if (response.status === 200) {
        document.querySelector(".container").style.display = "none"
        document.querySelector(".OTP").style.display = "block"
        
        const res = await fetch("/send-otp", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        })
        const result = await res.json()
        OTP = result.otp
        globalEmail = email
        
        document.getElementById("otpAlert").classList.remove("none")
        document.getElementById("otpAlert").innerHTML = "Otp Send Successfully"
        setTimeout(() => {
            document.getElementById("otpAlert").classList.add("none")
        }, 2500)
    }
})

const inputs = document.querySelectorAll(".otp-input");
const form = document.getElementById("getOTP");

inputs.forEach((input, index) => {
    input.addEventListener("input", () => {
        if (input.value.length === 1 && index < inputs.length - 1) {
            inputs[index + 1].focus();
        }
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && input.value === "" && index > 0) {
            inputs[index - 1].focus();
        }
    });
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let otp = "";
    inputs.forEach(input => {
        otp += input.value;
    });

    if (OTP == otp) {
        const res = await fetch("/pass", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: globalEmail })
        })
        const html = await res.text();
        document.open();
        document.write(html);
        document.close();
    } else {
        document.getElementById("otpAlert").classList.remove("none")
        document.getElementById("otpAlert").innerHTML = "Wrong OTP"
        setTimeout(() => {
            document.getElementById("otpAlert").classList.add("none")
        }, 2500)
    }
});

async function ResendOTP() {
    const res = await fetch("/send-otp", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: globalEmail })
    })
    const result = await res.json()
    OTP = result.otp
    
    document.getElementById("otpAlert").classList.remove("none")
    document.getElementById("otpAlert").innerHTML = "Otp Resend Successfully"
    setTimeout(() => {
        document.getElementById("otpAlert").classList.add("none")
    }, 2500)
}

function back() {
    document.querySelector(".container").style.display = "flex"
    document.querySelector(".OTP").style.display = "none"
}