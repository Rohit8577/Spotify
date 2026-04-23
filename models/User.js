// models/User.js
import mongoose from "mongoose";

const songSchema = {
    songUrl:  { type: String },
    image:    { type: String },
    songName: { type: String },
    artist:   { type: String },
    len:      { type: Number },
    songId:   { type: String }
};

const usersc = new mongoose.Schema({
    email:    { type: String, required: true, unique: true },
    password: { type: String },
    name:     { type: String },
    dob:      { type: Date },
    gender:   { type: String },
    library: [{
        image: { type: String },
        name:  { type: String },
        songs: [songSchema]
    }],
    favorite:  [songSchema],
    recently:  [songSchema],
    artist:    [{ id: { type: Number } }],

    // Friend system
    friendRequestsend:    [{ email: { type: String }, currStatus: { type: Number, default: 0 } }],
    friendRequestreceive: [{ email: { type: String }, currStatus: { type: Number, default: 0 } }],
    friends: [{
        id:    { type: String },
        name:  { type: String },
        email: { type: String }   // added for easy lookup
    }],

    // AI history
    history: [{
        song:  { type: mongoose.Schema.Types.Mixed },
        query: { type: String }
    }]
});

const User = mongoose.model("user", usersc);
export default User;