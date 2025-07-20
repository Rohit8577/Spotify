import express from "express"
import path from "path"
import fs from "fs"
import mongoose from "mongoose"
import { fileURLToPath } from "url"
import session from "express-session"
import jwt from "jsonwebtoken"
import cookieParser from "cookie-parser"
import { type } from "os";
import { error } from "console"
import { readdir } from "fs/promises"
mongoose.connect("mongodb://localhost:27017/spotify")

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express()
app.use(express.static("public"));
app.set('view engine', 'ejs')
app.use(express.static(__dirname + '/public'))

//Database
const usersc = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  name: { type: String },
  dob: { type: Date },
  gender: { type: String },
  library: [{
    image: { type: String },
    name: { type: String },
    songs: [{
      songUrl: { type: String },
      img: { type: String },
      songName: { type: String },
      artist: { type: String }
    }]
  }]
})
const User = new mongoose.model("user", usersc)
const port = 5000

//middleware
app.set('view engine', 'ejs')
app.use(express.static(__dirname + '/public'));
app.use(express.json())
app.use(session({
  secret: "yourSecretKey", // Isko strong rakho
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Secure true tab karo jab HTTPS use kar rahe ho
}));



app.get('/', async (req, res) => {
  if (!req.session.User) {
    res.render("spotify", { sess: false, message: "No active session", library: [] })
  } else {
    res.render("spotify", { sess: true, message: "Session Activated" })
  }
})

app.get("/login", (req, res) => {
  res.render("spotify_login")
})
app.get("/download", (req, res) => {
  res.render("download")
})

app.get('/signup', (req, res) => {
  res.render("spotify_signup")
})

app.post("/signup", async (req, res) => {
  const email = req.body.email
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    res.status(400).json({ message: "Email already exist" })
  } else {
    const data = await new User({ email })
    await data.save()
    req.session.User = { email }
    res.status(201).json({ message: "Signup successfull" })
  }
})

app.post("/pass", async (req, res) => {
  console.log("Session Data:", req.session);

  if (!req.session.User) {
    return res.status(401).json({ message: "No active session" });
  }

  const password = req.body.password;
  const email = req.session.User.email;

  const userCheck = await User.findOne({ email });

  if (!userCheck) {
    return res.status(404).json({ message: "User not found" });
  }

  userCheck.password = password;
  await userCheck.save();

  res.status(200).json({ message: "Password updated successfully" });
});


app.get("/pass", async (req, res) => {
  res.render("signup_pass")
})

app.post("/personal", async (req, res) => {
  const { name, gender, dob } = req.body
  if (!req.session.User) {
    return res.status(404).json({ message: "No active session" })
  }
  const email = req.session.User.email
  const userCheck = await User.findOne({ email })
  if (!userCheck) {
    return res.status(404).json({ message: "User not found" })
  }

  userCheck.name = name
  userCheck.gender = gender
  userCheck.dob = dob
  await userCheck.save()
  res.status(200).json({ message: "Personal data updated" })

})

app.post("/login", async (req, res) => {
  const { email, password } = req.body
  const userCheck = await User.findOne({ email })
  if (!userCheck) {
    res.status(400).json({ message: "Email not exist" })
    return
  } else {
    if (userCheck.password !== password) {
      res.status(401).json({ message: "Wrong Password" })
      return
    } else {
      req.session.User = { email }
      res.status(200).json({ message: "session set" })
      console.log(req.session)
    }
  }
})

app.get("/logout", (req, res) => {
  req.session.destroy()
  res.redirect("/")
})

//songs fetch
app.get("/get-songs", async (req, res) => {
  try {
    const songsPath = path.join(process.cwd(), "public/songs");
    const files = await readdir(songsPath);
    res.json(files);
  } catch (error) {
    console.error("Error reading songs folder:", error);
    res.status(500).json({ error: "Failed to load songs" });
  }
});

app.post("/forgetpass", async (req, res) => {
  const { forgetemail } = req.body
  const check = await User.findOne({ email: forgetemail })
  if (check) {
    req.session.emailcheck = forgetemail
    res.status(200).json({ ischeck: true, message: "User mil gaya" })
  } else {
    res.status(400).json({ ischeck: false, message: "Email not exist" })
  }
})


app.post("/updtpass", async (req, res) => {
  const { newpassword } = req.body
  const em = req.session.emailcheck
  const check = await User.findOne({ email: em })
  if (check) {
    await User.updateOne({ email: em }, { $set: { password: newpassword } })
    res.status(200).json({ message: "Password Updated" })
  } else {
    res.status(400).json({ message: "Some error occured" })
  }
})


app.post("/songinfo", async (req, res) => {
  try {
    const { name, url, songUrl, artist, pname } = req.body;
    const email = req.session.User.email;
    const user = await User.findOne({ email: email });

    if (!user) return res.status(404).send("User not found");

    const playlist = user.library.find(pl => pl.name === pname);
    if (!playlist) {
      return res.status(404).send("Playlist not found");
    } else {
      const alreadyExists = playlist.songs.some(n => n.songName === name);
      if (alreadyExists) {
        return res.status(201).json({ msg: `Song exists in ${pname}` });
      } else {
        playlist.songs.push({
          songUrl: songUrl, // ✅ Save clean URL
          img: url,
          songName: name,
          artist: artist
        });
        await user.save();
        res.status(200).json({ msg: `Song added to ${pname}` });
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/playlistname", async (req, res) => {
  const { name, imageUrl } = req.body
  if (req.session.User) {
    const email = req.session.User.email
    const check = await User.findOne({ email: email })
    if (check) {
      const alreadyExists = check.library.some((item) => item.name === name);
      if (!alreadyExists) {
        check.library.push({ name: name, image: imageUrl })
        await check.save()
        res.status(200).json({ msg: "Playlist Created" })
      } else {
        res.status(201).json({ msg: "Playlist Already Exist" })
      }
    } else {
      res.status(400).json({ msg: "User Not Found" })
    }
  } else {
    res.status(404).json({ msg: "No Active User" })
  }
})

app.get("/fetchplaylist", async (req, res) => {
  if (req.session.User) {
    const email = req.session.User.email
    const check = await User.findOne({ email: email })
    if (check) {
      res.status(200).json({ array: check.library })
    }
  }
})

app.post("/tickSymbol", async (req, res) => {
  const { url, pname } = req.body;
  const email = req.session.User.email;

  const check = await User.findOne({ email: email });
  if (!check) return res.status(404).json({ msg: "No user" });

  const alreadyExists = check.library.find((item) => item.name === pname);
  if (!alreadyExists) return res.status(404).json({ msg: "Playlist not found" });

  const exist = alreadyExists.songs.some((n) => n.songName === url);
  return res.status(200).json({ msg: exist ? "exists" : "not exists" });
});

app.post("/librarySongs", async (req, res) => {
  const { pname } = req.body
  if (req.session.User) {
    const email = req.session.User.email
    const check = await User.findOne({ email: email })
    if (check) {
      const playlist = check.library.find((playlistname) => playlistname.name === pname)
      res.json({ arr: playlist.songs })
    }
  }
})

app.get("/test", (req, res) => {
  res.render("test")
})
app.get('/abcd', (req, res) => {
  const songDir = path.join(__dirname, 'public/songs');
  const files = fs.readdirSync(songDir).filter(file => file.endsWith('.mp3'));
  res.json(files);
});


app.listen(port, '0.0.0.0', () => {
  console.log(`App ${port} port pe chal raha hai `)
})


