import express from "express";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import passport from "passport";
import session from "express-session";
import cors from "cors";
import admin from "firebase-admin";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";

// Imports from new structure
import User from "./models/User.js"; // Needed for passport serialization
import authRoutes from "./routes/authRoutes.js";
import playlistRoutes from "./routes/playlistRoutes.js";
import songRoutes from "./routes/songRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

dotenv.config();

// --- Init Firebase (Yahi rehne de ya config/firebase.js me daal de) ---
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}
console.log("🔥 Firebase Admin initialized");

// --- DB Connection ---
mongoose.connect(process.env.DATABASE_URL)
    .then(() => console.log("Connected to MongoDB Atlas!"))
    .catch(err => console.error("Could not connect to MongoDB Atlas...", err));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = 5000;
const JWT_SECRET = process.env.JWT_SECRET;

// --- Middlewares ---
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'assets')));
app.use(express.json());
app.use(cors());
app.use(cookieParser());
app.use(session({
    secret: 'someSecret',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// --- Passport Strategy (Yahi rakh sakte hain ya config me move kar sakte hain) ---
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL
},
    async function (accessToken, refreshToken, profile, done) {
        try {
            let user = await User.findOne({ email: profile.emails[0].value });
            if (!user) {
                user = await new User({
                    email: profile.emails[0].value,
                    name: profile.displayName
                }).save();
            }
            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }
));

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});

// --- Basic Routes (Views & Auth Callback) ---
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        const token = jwt.sign({ id: req.user._id, email: req.user.email }, JWT_SECRET, { expiresIn: '365d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 365 * 24 * 60 * 60 * 1000
        });
        res.redirect("/");
    }
);

app.get('/', (req, res) => {
    const token = req.cookies.token;
    let isAuthenticated = false;
    if (token) {
        try {
            jwt.verify(token, JWT_SECRET);
            isAuthenticated = true;
        } catch (error) { isAuthenticated = false; }
    }
    res.render("spotify", { sess: isAuthenticated, message: isAuthenticated ? "Session Active" : "No active session" });
});

app.get("/url", (req, res) => { res.json({ url: process.env.SAVAN_URL }) });
app.get("/login", (req, res) => res.render("spotify_login"));
app.get("/download", (req, res) => res.render("download"));
app.get('/signup', (req, res) => res.render("spotify_signup"));
app.post("/pass", (req, res) => {
    const { email } = req.body;
    res.render("signup_pass", { email });
});

// --- Use Routes ---
// Ye saare logic ab alag files me hain
app.use("/", authRoutes);
app.use("/", playlistRoutes);
app.use("/", songRoutes);
app.use("/", userRoutes);
app.use("/", aiRoutes);

app.listen(port, '0.0.0.0', () => {
    console.log(`App is running on port http://localhost:${port}`);
});