import request from "supertest";
import app from "./app";
import { client } from "./database";

afterAll(async () => {
    await client.close();
});

describe("GET /", () => {
    it("returns API info", async () => {
        const response = await request(app).get("/");
        expect(response.status).toBe(200);
        expect(response.body.name).toBe("KaraMatch API");
    });
});

describe("auth", () => {
    const credentials = {
        name: "Test User",
        username: "testuser_" + Date.now(),
        email: "test" + Date.now() + "@karamatch.test",
        password: "secret123"
    };

    it("registers a new user", async () => {
        const response = await request(app).post("/api/auth/register").send(credentials);
        expect(response.status).toBe(201);
        expect(response.body.user.username).toBe(credentials.username);
        expect(response.body.token).toBeTruthy();
    });

    it("rejects registering the same username twice", async () => {
        const response = await request(app).post("/api/auth/register").send(credentials);
        expect(response.status).toBe(400);
    });

    it("logs in with correct credentials", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({ login: credentials.username, password: credentials.password });
        expect(response.status).toBe(200);
        expect(response.body.token).toBeTruthy();
    });

    it("rejects login with wrong password", async () => {
        const response = await request(app)
            .post("/api/auth/login")
            .send({ login: credentials.username, password: "wrong" });
        expect(response.status).toBe(401);
    });

    it("rejects protected routes without a token", async () => {
        const response = await request(app).get("/api/me");
        expect(response.status).toBe(401);
    });

    it("returns the current user with a valid token", async () => {
        const login = await request(app)
            .post("/api/auth/login")
            .send({ login: credentials.username, password: credentials.password });
        const response = await request(app)
            .get("/api/me")
            .set("Authorization", "Bearer " + login.body.token);
        expect(response.status).toBe(200);
        expect(response.body.username).toBe(credentials.username);
    });
});
