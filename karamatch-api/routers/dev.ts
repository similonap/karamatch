import express from "express";
import { resetDatabase } from "../database";

const router = express.Router();

router.post("/dev/reset", async (req, res) => {
    await resetDatabase();
    res.json({ message: "Database reset to seed data" });
});

export default router;
