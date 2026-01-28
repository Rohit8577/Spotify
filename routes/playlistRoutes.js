import express from "express";
import authMiddleware from "../middlewares/auth.js";
// Note: req.user middleware se mil jayega, alag se User import ki zaroorat nahi agar save() req.user pe call ho raha hai.

const router = express.Router();

router.post("/playlistname", authMiddleware, async (req, res) => {
    const { name, imageUrl } = req.body;
    const user = req.user;

    const alreadyExists = user.library.some((item) => item.name === name);
    if (!alreadyExists) {
        user.library.push({ name, image: imageUrl });
        await user.save();
        res.status(200).json({ msg: "Playlist Created" });
    } else {
        res.status(201).json({ msg: "Playlist Already Exists" });
    }
});

router.get("/fetchplaylist", authMiddleware, async (req, res) => {
    res.status(200).json({ array: req.user.library });
});

router.post("/librarySongs", authMiddleware, async (req, res) => {
    const { pname } = req.body;
    const playlist = req.user.library.find((pl) => pl.name === pname);
    if (playlist) {
        res.json({ arr: playlist.songs });
    } else {
        res.status(404).json({ msg: "Playlist not found" });
    }
});

router.post("/songinfo", authMiddleware, async (req, res) => {
    try {
        const { name, url, songUrl, artist, pname, time, songId } = req.body;
        const user = req.user;

        const playlist = user.library.find(pl => pl.name === pname);
        if (!playlist) {
            console.log(pname)
            return res.status(404).send("Playlist not found");
        }

        const alreadyExists = playlist.songs.some(n => n.songId === songId);
        if (alreadyExists) {
            return res.status(201).json({ msg: `Song already exists in ${pname}` });
        }

        playlist.songs.push({ songUrl, image: url, songName: name, artist, len: time, songId });
        await user.save();
        res.status(200).json({ msg: `Song added to ${pname}` });

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

router.post("/tickSymbol", authMiddleware, async (req, res) => {
    const { url, pname } = req.body;
    const playlist = req.user.library.find((item) => item.name === pname);
    if (!playlist) return res.status(404).json({ msg: "Playlist not found" });

    const exists = playlist.songs.some((song) => song.songId === url);
    return res.status(200).json({ msg: exists ? "exists" : "not exists" });
});

router.post("/deleteSong", authMiddleware, async (req, res) => {
    const { playlistName, songId } = req.body;
    const user = req.user;

    const playlist = user.library.find(p => p.name === playlistName);
    if (playlist) {
        playlist.songs = playlist.songs.filter(song => song.songId != songId);
        await user.save();
        res.status(200).json({ msg: "Deleted Successfully" });
    } else {
        res.status(404).json({ msg: "playlist not found" });
    }
});

router.post("/deletePlaylist", authMiddleware, async (req, res) => {
    const { playlistName } = req.body
    const user = req.user

    user.library = user.library.filter(item => item.name !== playlistName)
    user.save()
    res.json({ msg: "Playlist Deleted" })
});

router.post("/renamePlaylist", authMiddleware, async (req, res) => {
    const { oldName, newName } = req.body
    const user = req.user
    const alreadyExists = user.library.find(item => item.name === newName)
    if (alreadyExists) {
        return res.status(400).json({ msg: "Playlist Already Exist" })
    }
    const playlistToRename = user.library.find(item => item.name === oldName);
    if (!playlistToRename) {
        return res.status(404).json({ msg: "Original playlist not found" });
    }
    playlistToRename.name = newName;
    await user.save();
    res.status(200).json({ msg: "Renamed successfully", updatedLibrary: user.library });
});

router.post("/save", authMiddleware, async (req, res) => {
   const { pname, songList } = req.body;
    const user = req.user
    const playlist = req.user.library.find((pl) => pl.name === pname);
    playlist.songs = songList
    await user.save()
    res.status(200).json({ msg: "Added" })
});


// Flutter Specific
router.post('/api/get-library', authMiddleware, async (req, res) => {
    try {
       const user = req.user; 
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Direct user object se library bhej do
        res.json({ success: true, data: user.library });

    } catch (e) {
        console.error("Library fetch error:", e);
        res.status(500).json({ error: "Server Error" });
    }
});
export default router;