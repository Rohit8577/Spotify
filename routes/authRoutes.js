import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import admin from "firebase-admin"; // Init main.js ya config me rakhna
import dotenv from "dotenv"
dotenv.config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// --- Sign Up ---
router.post("/signup", async (req, res) => {
    const { email, userdata, globalPassword } = req.body;
    console.log(userdata)
    if (!email) {
        return res.status(400).json({ message: "Email required" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
    }

    const user = await new User({ email, password: globalPassword, name: userdata.name, gender: userdata.gender, dob: userdata.dob }).save();

    // Create a JWT
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
        expiresIn: '365d' // Token expires in 1 year
    });

    // Send the token in an httpOnly cookie
    res.cookie('token', token, {
        httpOnly: true, // Prevents client-side JS from accessing the cookie
        secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
        maxAge: 365 * 24 * 60 * 60 * 1000 // 1 day in milliseconds
    });

    res.status(201).json({ message: "Signup successful", token: token, user: { id: user._id, name: user.name, email: user.email } });
});

router.post("/emailCheck", async (req, res) => {
    const { email } = req.body
    console.log(email)
    const alreadyExists = await User.findOne({ email })

    if (alreadyExists) {
        return res.status(400).json({ msg: "Email already exists" })
    } else {
        return res.status(200).json({ msg: "New Email" })
    }
});

// --- Login ---
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        return res.status(400).json({ message: "Email does not exist" });
    }
    // IMPORTANT: In a real app, you must hash passwords and use a comparison function like bcrypt.compare()
    if (user.password !== password) {
        return res.status(401).json({ message: "Wrong Password" });
    }

    // Create and send the token, same as in signup
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '365d' });
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 365 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
        message: "Login successful",
        token: token, // Ye line add kar de Flutter ke liye
        user: { id: user._id, name: user.name, email: user.email }
    });
});

router.get("/logout", (req, res) => {
    res.clearCookie('token');
    res.redirect("/");
});

// --- Google Login (App) ---
router.post("/google-login", async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ message: "Token missing" });
        }

        // ✅ Verify Firebase ID token
        const decoded = await admin.auth().verifyIdToken(token);

        const email = decoded.email;
        const name = decoded.name;

        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                email,
                name,
            });
        }

        // 🔐 Create your OWN JWT
        const jwtToken = jwt.sign(
            { id: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: "365d" }
        );

        res.json({
            token: jwtToken,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(401).json({ message: "Invalid Google token" });
    }
});

// --- Password & OTP ---
router.post("/send-otp", async (req, res) => {
    const { email } = req.body;
    console.log("Sending OTP to:", email);

    const otp = Math.floor(1000 + Math.random() * 9000);

    try {
        // Gmail transporter
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "noreply.musicplayer7@gmail.com", // tera gmail
                pass: "eufz kvna uujn tyxu",         // jo popup me mila tha
            },
        });

        // send mail
        let info = await transporter.sendMail({
            from: `"Music Player 🎵" <noreply.musicplayer7@gmail.com>`,
            to: email,
            subject: `${otp} - Your Music Player code`,
            html: `<p>Your OTP is <b>${otp}</b>. It will expire in 5 minutes.</p>`,
        });

        console.log("Message sent:", info.messageId);

        res.json({ success: true, otp: otp });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to send OTP" });
    }
});

router.post("/forgetpass", async (req, res) => {
    const { forgetemail } = req.body;
    // console.log(forgetemail)
    const user = await User.findOne({ email: forgetemail });
    if (user) {
        res.status(200).json({ ischeck: true, message: "User found, proceed to reset." });
    } else {
        res.status(400).json({ ischeck: false, message: "Email not found" });
    }
});

router.post("/updtpass", async (req, res) => {
    const { newpassword, email } = req.body;
    const check = await User.findOne({ email })
    if (!check) {
        res.status(400).json({ message: "Some error occured" })
    } else {
        const updt = await User.updateOne({ email: email }, { $set: { password: newpassword } })
        if (updt) {
            res.status(200).json({ message: "Password Updated" })
        } else {
            res.status(400).json({ message: "Some error occured" })
        }
    }
    console.log(check.password)
});

export default router;