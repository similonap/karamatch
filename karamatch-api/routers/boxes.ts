import express from "express";
import { verifyAuthToken } from "../middleware/verifyAuthToken";
import { getOpenBoxesNear } from "../database";

const router = express.Router();

// NOTE: booking, payment, matchmaking, chat, invites and ratings all depend on the
// sparse venue/box generation layer (API-PROPOSAL.md §2–§5), which is not implemented
// yet. These routes return dummy/placeholder data shaped like the final response so
// the client can be built against a stable contract.

router.post("/boxes", verifyAuthToken, async (req, res) => {
    res.status(201).json({
        id: "b_dummy",
        title: req.body.title || "Karaoke Night",
        genre: "pop",
        venueId: req.body.venueId,
        roomId: req.body.roomId,
        slotId: req.body.slotId,
        capacity: 6,
        totalPrice: 30,
        openToPublic: true,
        status: "pending_payment",
        members: [{ userId: res.locals.user.id, role: "host", paid: false }],
        invitedUsernames: []
    });
});

router.post("/boxes/:id/join", verifyAuthToken, async (req, res) => {
    res.json({ boxId: req.params.id, share: 5 });
});

router.post("/boxes/:id/pay", verifyAuthToken, async (req, res) => {
    res.json({ boxId: req.params.id, status: "upcoming" });
});

router.get("/boxes/open", verifyAuthToken, async (req, res) => {
    const user = res.locals.user;
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : user.location?.lat ?? 0;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : user.location?.lng ?? 0;
    const distance = req.query.distance ? parseFloat(req.query.distance as string) : 3;

    const boxes = await getOpenBoxesNear(lat, lng, distance);
    res.json(boxes);
});

router.get("/boxes/matches", verifyAuthToken, async (req, res) => {
    // TODO: score nearby open boxes by song overlap + genre affinity (API-PROPOSAL.md §5)
    res.json([]);
});

router.get("/boxes/mine", verifyAuthToken, async (req, res) => {
    res.json({ upcoming: [], past: [] });
});

router.get("/boxes/:id", verifyAuthToken, async (req, res) => {
    res.status(404).json({ error: "Box not found" });
});

router.patch("/boxes/:id", verifyAuthToken, async (req, res) => {
    res.json({ id: req.params.id, openToPublic: req.body.openToPublic ?? true });
});

router.get("/boxes/:id/messages", verifyAuthToken, async (req, res) => {
    res.json([]);
});

router.post("/boxes/:id/messages", verifyAuthToken, async (req, res) => {
    const text: string = req.body.text;
    if (!text) {
        res.status(400).json({ error: "text is required" });
        return;
    }
    res.status(201).json({
        id: "m_dummy",
        boxId: req.params.id,
        userId: res.locals.user.id,
        text,
        sentAt: new Date().toISOString()
    });
});

router.post("/boxes/:id/invites", verifyAuthToken, async (req, res) => {
    res.status(201).json({ invited: req.body.usernames || [] });
});

router.get("/boxes/:id/crew", verifyAuthToken, async (req, res) => {
    res.json([]);
});

router.post("/boxes/:id/ratings", verifyAuthToken, async (req, res) => {
    res.json({ message: "Reviews posted — thanks!" });
});

export default router;
