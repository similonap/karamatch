import express from "express";
import { verifyAuthToken } from "../middleware/verifyAuthToken";
import { getVenueById, getVenuesNear } from "../database";

const router = express.Router();

// NOTE: sparse venue/slot generation (API-PROPOSAL.md §2.1, §2.2) is not implemented
// yet — these routes return dummy/placeholder data shaped like the final response
// so the client can be built against a stable contract.

router.get("/venues", verifyAuthToken, async (req, res) => {
    const user = res.locals.user;
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : user.location?.lat ?? 0;
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : user.location?.lng ?? 0;
    const distance = req.query.distance ? parseFloat(req.query.distance as string) : 3;

    const venues = await getVenuesNear(lat, lng, distance);
    res.json(venues);
});

router.get("/venues/:id", verifyAuthToken, async (req, res) => {
    const venue = await getVenueById(req.params.id);
    if (!venue) {
        res.status(404).json({ error: "Venue not found" });
        return;
    }
    res.json(venue);
});

router.get("/venues/:id/slots", verifyAuthToken, async (req, res) => {
    // TODO: generate/return slots for this venue in the requested [from, to] range
    res.json([]);
});

export default router;
