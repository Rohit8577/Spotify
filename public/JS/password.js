let globalPassword = ""
let userdata;
console.log("Email from backend:", email);
let check1 = false, check2 = false, check3 = false;
document.getElementById("password").addEventListener("input", () => {
    if (/[a-zA-Z]/.test(document.getElementById("password").value)) {
        check1 = true
        document.getElementsByTagName("ellipse")[0].style.fill =
            "#1ed760";
        document.getElementsByTagName("p")[1].style.color = "#1ed760";
    } else {
        check1 = false
        document.getElementsByTagName("ellipse")[0].style.fill = "none";
        document.getElementById("password").style.border = "1px solid red";
        document.getElementsByTagName("p")[1].style.color = "#f3727f";
    }
    if (/[0-9!@#$%^&*]/.test(document.getElementById("password").value)) {
        check2 = true
        document.getElementsByTagName("ellipse")[1].style.fill =
            "#1ed760";
        document.getElementsByTagName("p")[2].style.color = "#1ed760";
    } else {
        check2 = false
        document.getElementsByTagName("ellipse")[1].style.fill = "none";
        document.getElementById("password").style.border = "1px solid red";
        document.getElementsByTagName("p")[2].style.color = "#f3727f";
    }
    if (document.getElementById("password").value.length >= 10) {
        check3 = true
        document.getElementsByTagName("ellipse")[2].style.fill =
            "#1ed760";
        document.getElementsByTagName("p")[3].style.color = "#1ed760";
    } else {
        check3 = false
        document.getElementsByTagName("ellipse")[2].style.fill = "none";
        document.getElementById("password").style.border = "1px solid red";
        document.getElementsByTagName("p")[3].style.color = "#f3727f";
    }

    document.getElementById("password").style.border =
        check1 && check2 && check3 ? "1px solid white" : "1px solid red";
});

document
    .getElementById("passwordForm")
    .addEventListener("submit", async (event) => {
        event.preventDefault();
        if (check1 && check2 && check3) {
            const password = document.getElementById("password").value;
            globalPassword = password
            document.getElementById("passwordForm").style.display = "none"
            document.getElementById("personalForm").style.display = "flex"
            document.querySelector(".progress-bar").style.width = "66.6%"
            document.querySelector(".step").innerHTML = `
            <p>Step 2 of 3</p>
          <h3>Name and DOB</h3>`
        } else {
            alert("conditions match kar Bhosdike!!!!");
        }
    });

document
    .getElementById("personalForm")
    .addEventListener("submit", async (event) => {
        event.preventDefault();
        let year, month, day;
        const name = document.getElementById("name").value.trim();
        const gender = document.querySelector('input[name="gender"]:checked')?.value;
        if (!gender) {
            alert("Please select a gender.");
            return;
        }
        function getFormattedDate() {
            year = document.getElementById("year").value;
            month = document.getElementById("month").value;
            day = document.getElementById("day").value;
            if (!year || year < 1900 || year > new Date().getFullYear()) {
                alert("Please enter a valid year.");
                return;
            }

            if (!month) {
                alert("Please select a month.");
                return;
            }

            if (!day || day < 1 || day > 31) {
                alert("Please enter a valid day.");
                return;
            }
            return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
        const realdate = getFormattedDate();
        if (!realdate) return;
         userdata = { name, gender, dob: realdate }
         document.getElementById("personalForm").style.display = "none"
         document.querySelector(".termCondition").style.display = "block"
         document.querySelector(".progress-bar").style.width = "100%"
            document.querySelector(".step").innerHTML = `
            <p>Step 3 of 3</p>
          <h3>Term & Conditions</h3>`

    });

document.getElementsByTagName("button")[2].addEventListener("click", async (event) => {
    event.preventDefault()
    if (!document.getElementById("checkbox1").checked || !document.getElementById("checkbox2").checked) {
        alert("Please check both conditions")
    } else {
        const response = await fetch("/signup", {
            method: "post",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, userdata, globalPassword})
        })
        const result = await response.json()
        if(response.status === 201){
            alert(result.message)
            window.location.href = "/"
        }
    }
})