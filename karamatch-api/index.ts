import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connect } from "./database";

app.listen(app.get("port"), async () => {
    await connect();
    console.log("[server] http://localhost:" + app.get("port"));
});
