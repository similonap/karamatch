import express from "express";
import { verifyAuthToken } from "../middleware/verifyAuthToken";
import { getGenres, getSongs } from "../database";

const router = express.Router();

router.get("/songs", verifyAuthToken, async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const songs = await getSongs(q);
    res.json(songs);
});

router.get("/genres", verifyAuthToken, async (req, res) => {
    const genres = await getGenres();
    res.json(genres);
});

export default router;
