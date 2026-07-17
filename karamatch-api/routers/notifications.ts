import express from "express";
import { verifyAuthToken } from "../middleware/verifyAuthToken";
import { getNotificationsForUser } from "../database";

const router = express.Router();

router.get("/notifications", verifyAuthToken, async (req, res) => {
    const notifications = await getNotificationsForUser(res.locals.user.id);
    res.json(notifications);
});

router.post("/notifications/:id/accept", verifyAuthToken, async (req, res) => {
    // TODO: reserve a spot on the box and return the share to pay
    res.json({ boxId: "b_dummy", share: 5 });
});

router.post("/notifications/:id/decline", verifyAuthToken, async (req, res) => {
    res.sendStatus(204);
});

export default router;
