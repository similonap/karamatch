import express from "express";
import { verifyAuthToken } from "../middleware/verifyAuthToken";
import {
    ensureNotificationsFor, getNotificationById, setNotificationStatus,
    getBoxById, addBoxMember, shareFor
} from "../database";

const router = express.Router();

router.get("/notifications", verifyAuthToken, async (req, res) => {
    // Guarantees at least one pending invite the first time it's called
    // (API-PROPOSAL.md §2.3), so the notification flow is always demoable.
    const notifications = await ensureNotificationsFor(res.locals.user);
    res.json(notifications);
});

// Accepting reserves the spot; the client then pays via POST /boxes/:id/pay.
router.post("/notifications/:id/accept", verifyAuthToken, async (req, res) => {
    const user = res.locals.user;
    const notification = await getNotificationById(req.params.id);
    if (!notification || notification.toUserId !== user.id) {
        res.status(404).json({ error: "Notification not found" });
        return;
    }
    if (notification.status !== "pending") {
        res.status(400).json({ error: "Invite already handled" });
        return;
    }
    const box = await getBoxById(notification.boxId);
    if (!box || box.status !== "upcoming") {
        res.status(400).json({ error: "Box is no longer available" });
        return;
    }
    if (!box.members.some(member => member.userId === user.id)) {
        if (box.members.length >= box.capacity) {
            res.status(400).json({ error: "Box is full" });
            return;
        }
        await addBoxMember(box, user);
    }
    await setNotificationStatus(notification.id, "accepted");
    res.json({ boxId: box.id, share: shareFor(box) });
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
