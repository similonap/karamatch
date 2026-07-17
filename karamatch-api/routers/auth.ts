import express from "express";
import multer from "multer";
import { verifyAuthToken } from "../middleware/verifyAuthToken";
import {
    createUser,
    generateToken,
    getUserByEmail,
    getUserByLogin,
    getUserByUsername,
    setUserToken,
    updateUser
} from "../database";
import { toPublicUser } from "../types";

const router = express.Router();
const upload = multer({ dest: "public/uploads" });

router.post("/auth/register", async (req, res) => {
    const name: string = req.body.name;
    const username: string = req.body.username;
    const email: string = req.body.email;
    const password: string = req.body.password;

    if (!name || !username || !email || !password) {
        res.status(400).json({ error: "name, username, email and password are all required" });
        return;
    }
    if (!email.includes("@")) {
        res.status(400).json({ error: "Invalid email" });
        return;
    }
    if (await getUserByUsername(username)) {
        res.status(400).json({ error: "Username already taken" });
        return;
    }
    if (await getUserByEmail(email)) {
        res.status(400).json({ error: "Email already registered" });
        return;
    }

    const token = generateToken();
    const user = await createUser({
        name,
        username,
        email,
        password,
        token,
        bio: "",
        photoUrl: null,
        location: null,
        favoriteSongIds: [],
        singerRating: 5,
        eventsCount: 0,
        friendIds: [],
        isNpc: false
    });

    res.status(201).json({ user: toPublicUser(user), token });
});

router.post("/auth/login", async (req, res) => {
    const login: string = req.body.login;
    const password: string = req.body.password;

    if (!login || !password) {
        res.status(400).json({ error: "login and password are required" });
        return;
    }

    const user = await getUserByLogin(login);
    if (!user || user.password !== password) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
    }

    const token = generateToken();
    await setUserToken(user.id, token);

    res.json({ user: toPublicUser(user), token });
});

router.post("/auth/forgot", async (req, res) => {
    // Mock endpoint — always succeeds, no email is actually sent.
    res.json({ message: "Password reset link sent" });
});

router.get("/me", verifyAuthToken, async (req, res) => {
    res.json(toPublicUser(res.locals.user));
});

router.put("/me", verifyAuthToken, async (req, res) => {
    const changes: { name?: string; bio?: string; favoriteSongIds?: string[] } = {};

    if (req.body.name !== undefined) {
        changes.name = req.body.name;
    }
    if (req.body.bio !== undefined) {
        changes.bio = req.body.bio;
    }
    if (req.body.favoriteSongIds !== undefined) {
        const ids: string[] = req.body.favoriteSongIds;
        if (!Array.isArray(ids) || ids.length < 3 || ids.length > 10) {
            res.status(400).json({ error: "favoriteSongIds must contain between 3 and 10 song ids" });
            return;
        }
        changes.favoriteSongIds = ids;
    }

    const updated = await updateUser(res.locals.user.id, changes);
    res.json(toPublicUser(updated!));
});

router.put("/me/location", verifyAuthToken, async (req, res) => {
    const lat: number = req.body.lat;
    const lng: number = req.body.lng;
    const label: string = req.body.label || "";

    if (typeof lat !== "number" || typeof lng !== "number") {
        res.status(400).json({ error: "lat and lng are required numbers" });
        return;
    }

    const updated = await updateUser(res.locals.user.id, { location: { lat, lng, label } });
    res.json(toPublicUser(updated!));
});

router.post("/me/photo", verifyAuthToken, upload.single("photo"), async (req, res) => {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
        res.status(400).json({ error: "No photo uploaded — send it as multipart/form-data field 'photo'" });
        return;
    }
    const photoUrl = "/uploads/" + file.filename;
    await updateUser(res.locals.user.id, { photoUrl });
    res.json({ photoUrl });
});

export default router;
