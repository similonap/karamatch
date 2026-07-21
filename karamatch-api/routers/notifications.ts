import express from "express";
import { verifyAuthToken } from "../middleware/verifyAuthToken";
import {
    ensureNotificationsFor, getNotificationById, setNotificationStatus,
    getPartyById, addPartyMember, shareFor
} from "../database";

const router = express.Router();

router.get("/notifications", verifyAuthToken, async (req, res) => {
    // Guarantees at least one pending invite the first time it's called
    // (API-PROPOSAL.md §2.3), so the notification flow is always demoable.
    const notifications = await ensureNotificationsFor(res.locals.user);
    res.json(notifications);
});

// Accepting reserves the spot; the client then pays via POST /parties/:id/pay.
router.post("/notifications/:id/accept", verifyAuthToken, async (req, res) => {
    const user = res.locals.user;
    const notification = await getNotificationById(req.params.id);
    if (!notification || notification.toUserId !== user.id) {
        res.status(404).json({ error: "Notification not found" });
        return;
    }
    if (notification.kind === "review") {
        res.status(400).json({ error: "Post the review through the party instead" });
        return;
    }
    if (notification.status !== "pending") {
        res.status(400).json({ error: "Invite already handled" });
        return;
    }
    const party = await getPartyById(notification.partyId);
    if (!party || party.status !== "upcoming") {
        res.status(400).json({ error: "Party is no longer available" });
        return;
    }
    if (!party.members.some(member => member.userId === user.id)) {
        if (party.members.length >= party.capacity) {
            res.status(400).json({ error: "Party is full" });
            return;
        }
        await addPartyMember(party, user);
    }
    await setNotificationStatus(notification.id, "accepted");
    res.json({ partyId: party.id, share: shareFor(party) });
});

router.post("/notifications/:id/decline", verifyAuthToken, async (req, res) => {
    const notification = await getNotificationById(req.params.id);
    if (!notification || notification.toUserId !== res.locals.user.id) {
        res.status(404).json({ error: "Notification not found" });
        return;
    }
    await setNotificationStatus(notification.id, "declined");
    res.sendStatus(204);
});

export default router;
