import express, { Express } from "express";
import path from "path";
import { cors } from "./middleware/cors";
import authRouter from "./routers/auth";
import songsRouter from "./routers/songs";
import venuesRouter from "./routers/venues";
import boxesRouter from "./routers/boxes";
import friendsRouter from "./routers/friends";
import notificationsRouter from "./routers/notifications";
import devRouter from "./routers/dev";

const app: Express = express();

app.set("port", process.env.PORT || 3000);

app.use(cors);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.get("/", (req, res) => {
    res.json({
        name: "KaraMatch API",
        version: "0.1.0",
        docs: "See API-PROPOSAL.md for the full endpoint reference"
    });
});

app.use("/api", authRouter);
app.use("/api", songsRouter);
app.use("/api", venuesRouter);
app.use("/api", boxesRouter);
app.use("/api", friendsRouter);
app.use("/api", notificationsRouter);
app.use("/api", devRouter);

// 404 handler — always last, above app.listen
app.use((req, res) => {
    res.type("text/html");
    res.status(404);
    res.send("404 - Not Found");
});

export default app;
