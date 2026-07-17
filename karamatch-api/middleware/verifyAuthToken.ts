import { Request, Response, NextFunction } from "express";
import { getUserByToken } from "../database";

export const verifyAuthToken = async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const token = header && header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
        res.status(401).json({ error: "Missing Authorization header" });
        return;
    }
    const user = await getUserByToken(token);
    if (!user) {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
    }
    res.locals.user = user;
    next();
};
