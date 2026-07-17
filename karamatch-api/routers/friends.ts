import express from "express";
import { verifyAuthToken } from "../middleware/verifyAuthToken";

const router = express.Router();

// NOTE: friends/people data depends on the NPC generation layer
// (API-PROPOSAL.md §2.3), which is not implemented yet. Dummy responses for now.

router.get("/friends", verifyAuthToken, async (req, res) => {
    res.json([]);
});

router.get("/users", verifyAuthToken, async (req, res) => {
    res.json([]);
});

router.post("/friends", verifyAuthToken, async (req, res) => {
    const username: string = req.body.username;
    if (!username) {
        res.status(400).json({ error: "username is required" });
        return;
    }
    res.status(201).json({ message: "Friend added", username });
});

export default router;
