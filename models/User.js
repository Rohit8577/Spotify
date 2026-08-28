// models/User.js
import mongoose from "mongoose";

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
            image: { type: String },
            songName: { type: String },
            artist: { type: String },
            len: { type: Number },
            songId: { type: String }
        }]
    }],
    favorite: [{
        songUrl: { type: String },
        image: { type: String },
        songName: { type: String },
        artist: { type: String },
        len: { type: Number },
        songId: { type: String }
    }],
    recently: [{
        songUrl: { type: String },
        image: { type: String },
        songName: { type: String },
        artist: { type: String },
        len: { type: Number },
        songId: { type: String }
    }],
    artist: [{ id: { type: Number } }],
    friendRequestsend: [{ email: { type: String }, currStatus: { type: Number } }],
    friendRequestreceive: [{ email: { type: String }, currStatus: { type: Number } }],
    friends: [{ id: { type: String }, name: { type: String } }],
    history: [{
        song: { /* ... fields ... */ }, // Jo tumne define kiya hai
        query: { type: String }
    }]
});

const User = mongoose.model("user", usersc);
export default User;