# CLAUDE.md — Express.js + MongoDB (Webontwikkeling course conventions)

This file describes **exactly** how Express.js and MongoDB code must be written in this
project. Everything here comes from the `webontwikkeling-docusaurus` course material and
**nothing else**. If a feature, library, or pattern is not documented below, **do not use
it** — even if a "better" or more modern alternative exists. Follow the course author's
structure and idioms to the letter.

---

## 0. Golden rules

- **Only use what the course teaches.** No Mongoose / ODM, no controllers folder, no
  `async`/handler libraries, no alternative template engines, no alternative body parsers,
  no `PUT`/`DELETE` HTTP verbs from forms, no ORM query builders. Raw `mongodb` driver only.
- **TypeScript everywhere**, full stack. Server code and client code are both TypeScript.
- **Double quotes** for all strings. This is the author's consistent style.
- **All database code lives in `database.ts`.** No exceptions. Routes never talk to the
  driver directly — they call functions exported from `database.ts`.
- Prefer `res.render` with EJS for pages, `res.json` for API endpoints.
- Keep routes thin and readable; put logic (especially DB logic) behind exported functions.

---

## 1. Project structure

```
.
├── index.ts                # server entry: app config + routes + app.listen
├── app.ts                  # (only when testing) exports the configured app
├── database.ts             # ALL database code
├── types.ts                # interfaces / types (with _id?: ObjectId)
├── .env                    # environment variables (never committed)
├── routers/                # express.Router modules (one file per resource)
│   ├── users.ts
│   └── posts.ts
├── middleware/             # custom middleware, one file per middleware
│   ├── verifyAuthToken.ts
│   └── ejsUtility.ts
├── views/                  # EJS templates (.ejs only)
│   ├── index.ejs
│   ├── partials/           # header.ejs, footer.ejs
│   └── users/              # index.ejs, create.ejs, update.ejs
├── scripts/                # client-side TypeScript (bundled by esbuild)
│   └── index.ts
└── public/                 # static files served by express.static
    ├── css/
    ├── js/                 # esbuild output (compiled client TS)
    └── assets/
```

Notes:
- EJS files **must** have the `.ejs` extension and **must** live in `views/`.
- Shared layout goes in `views/partials/` (`header.ejs`, `footer.ejs`), included with
  `<%- include("partials/header") %>`.
- Client-side TypeScript goes in `scripts/`, **never** in `public/` (a browser can't run
  TypeScript). esbuild compiles it into `public/js/`.

---

## 2. The server (`index.ts`)

Standard shape of an application. Use `app.set("port", ...)` and read it back with
`app.get("port")`.

```typescript
import express, { Express } from "express";
import path from "path";
import { connect, getUsers } from "./database";

const app: Express = express();

app.set("view engine", "ejs");                 // EJS as view engine
app.set("views", path.join(__dirname, "views"));
app.set("port", 3000);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/users", async (req, res) => {
    let users = await getUsers();
    res.json(users);
});

// 404 handler — always LAST, above app.listen
app.use((req, res) => {
    res.type("text/html");
    res.status(404);
    res.send("404 - Not Found");
});

app.listen(app.get("port"), async () => {
    await connect();
    console.log("[server] http://localhost:" + app.get("port"));
});
```

Rules:
- Body parsing middleware (`express.json` + `express.urlencoded`) goes at the top, near the
  other `app.use` calls.
- The catch-all 404 `app.use` goes **at the bottom, above `app.listen`**. Placed on top it
  breaks every route.
- `connect()` is awaited inside the `app.listen` callback (which is `async`).

---

## 3. Routes & requests

### Methods & responses
- Define routes with `app.get`, `app.post` (and `router.get` / `router.post`). Forms only
  use `GET` or `POST` — **never** `PUT`/`DELETE` (browsers can't send those from a form).
- Response object methods available: `res.send`, `res.json`, `res.render`, `res.redirect`,
  `res.type`, `res.status`, `res.sendStatus`, `res.set`.
- Set headers/type/status **before** sending; you can't change them after `send`.
- `res.type("text/html")` / `res.type("application/json")`. `res.json` sets the content
  type itself.
- Status codes used in the course: 200, 201, 204, 400, 401, 403, 404, 429, 500.

### Reading input from the request
- `req.query` — query string values. Always narrow the type first, e.g.
  `typeof req.query.q === "string" ? req.query.q : ""`.
- `req.params` — route parameters (`/person/:index` → `req.params.index`). `parseInt` when
  you need a number.
- `req.body` — POST body (requires the two body parsers above).
- `req.headers`, `req.path`, `req.method`, `req.ip` are also available.
- Encode query values that may contain special characters with `encodeURIComponent`.

### Form handling pattern
A `GET` route renders the (empty or pre-filled) form; a `POST` route to the **same URL**
validates and processes, then `res.redirect` on success.

```typescript
app.get("/register", (req, res) => {
    res.render("register", { error: "" });   // always pass error, even empty
});

app.post("/register", (req, res) => {
    let email: string = req.body.email;
    if (email === "") {
        res.render("register", { error: "All fields are required" });
    } else if (!email.includes("@")) {
        res.render("register", { error: "Invalid email" });
    } else {
        res.redirect("/success");
    }
});
```

Always validate server-side — client-side validation is UX only, never security.

### Routers
When the app grows, split routes into `routers/`. A router module is a **default-exported
function** that receives its data and returns the router:

```typescript
// routers/posts.ts
import express from "express";
import { Post } from "../types";

export default function postRouter(posts: Post[]) {
    const router = express.Router();

    router.get("/", (req, res) => {
        res.json(posts);
    });

    router.get("/:id", (req, res) => {
        const id = parseInt(req.params.id);
        const post = posts.find(post => post.id === id);
        if (post) {
            res.json(post);
        } else {
            res.status(404).send("Post not found");
        }
    });

    return router;
}
```

```typescript
// index.ts
import postRouter from "./routers/posts";
app.use("/posts", postRouter(posts));
```

### File uploads (multipart/form-data)
Use `multer`. Form needs `enctype="multipart/form-data"`. `upload.single("field")`,
`upload.array("field", n)`, or `upload.fields([...])`. Files via `req.file` / `req.files`.

```typescript
import multer from "multer";
const upload = multer({ dest: "public/uploads" });

app.post("/upload", upload.single("avatar"), (req, res) => {
    let file = req.file as Express.Multer.File;
    // ...
});
```

---

## 4. Middleware

- Custom middleware is `(req, res, next)`; always call `next()` to continue.
- Error-handling middleware has **four** params: `(err, req, res, next)`.
- Order matters: first registered runs first.
- Put reusable middleware in `middleware/`, one file each, typed with Express types:

```typescript
import { Request, Response, NextFunction } from "express";

export const verifyAuthToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization;
    if (token !== "my-secret-token") {
        res.status(401).send("Unauthorized");
    } else {
        next();
    }
};
```

```typescript
import { verifyAuthToken } from "./middleware/verifyAuthToken";
app.use(verifyAuthToken);
```

- Configurable middleware = a function returning the middleware (e.g. `maxRequest({ maxRequests: 10 })`).
- Use `res.locals` (set in middleware) to expose variables/helpers to every view.
- Middleware can be attached to a single route: `app.get("/", loggingMiddleware, handler)`.

---

## 5. EJS views

- `res.render("index", { ... })`; the object's properties become variables in the template.
- Output a value: `<%= value %>`. Run JS / control flow: `<% ... %>`.
- Loops and ifs must keep **all** JS (including `{` and `}`) inside `<% %>`.
- Includes: `<%- include("partials/header") %>`. Variables passed to `render` are available
  in included files too.
- **No TypeScript types inside EJS** — only plain JS expressions. Types stay in the route.

```html
<%- include("partials/header") %>
<ul>
    <% for (let person of persons) { %>
        <li><%= person.name %> (<%= person.age %>)</li>
    <% } %>
</ul>
<%- include("partials/footer") %>
```

---

## 6. MongoDB — everything in `database.ts`

Use the official `mongodb` driver only (`npm install mongodb`; it ships its own types).
**Never** query the driver from a route — always go through functions exported from
`database.ts`.

### The `database.ts` module — required shape

```typescript
import { Collection, MongoClient } from "mongodb";
import dotenv from "dotenv";
import { User } from "./types";
dotenv.config();

export const client = new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017");

export const collection: Collection<User> = client.db("exercises").collection<User>("users");

export async function getUsers() {
    return await collection.find({}).toArray();
}

export async function getUserById(id: number) {
    return await collection.findOne({ id: id });
}

export async function getNextId() {
    let users: User[] = await collection.find({}).sort({ id: -1 }).limit(1).toArray();
    if (users.length == 0) {
        return 1;
    } else {
        return users[0].id + 1;
    }
}

export async function createUser(user: User) {
    user.id = await getNextId();
    return await collection.insertOne(user);
}

export async function updateUser(id: number, user: User) {
    return await collection.updateOne({ id: id }, { $set: user });
}

export async function deleteUser(id: number) {
    return await collection.deleteOne({ id: id });
}

async function seed() {
    if (await collection.countDocuments() === 0) {
        // insert initial data, or load from API (see below)
    }
}

async function exit() {
    try {
        await client.close();
        console.log("Disconnected from database");
    } catch (error) {
        console.error(error);
    }
    process.exit(0);
}

export async function connect() {
    try {
        await client.connect();
        await seed();
        console.log("Connected to database");
        process.on("SIGINT", exit);
    } catch (error) {
        console.error(error);
    }
}
```

Required conventions:
- **Export `client`** and **export each `Collection<T>`** so they can be reused (and mocked).
- Use `client.db("...").collection<T>("...")` and store it in an exported `collection`
  constant so you don't repeat that line.
- Provide a `connect()` that: connects, seeds, logs, and registers the `SIGINT` handler.
- Provide an `exit()` that closes the client and `process.exit(0)`. When using nodemon, also
  handle `SIGUSR2`.
- Provide a `seed()` that only inserts when `countDocuments() === 0`.
- Export CRUD/query **functions** (`getUsers`, `getUserById`, `createUser`, `updateUser`,
  `deleteUser`, `getNextId`, …) and import only those into routes:

```typescript
import { connect, getUsers, createUser, deleteUser, getUserById, updateUser } from "./database";
```

- Seeding from an external API follows this shape:

```typescript
export async function loadUsersFromApi() {
    const users: User[] = await getUsers();
    if (users.length == 0) {
        const response = await fetch("https://jsonplaceholder.typicode.com/users");
        const users: User[] = await response.json();
        await collection.insertMany(users);
    }
}
```

### Connection string & env vars
- Never hard-code the connection string. Read it via `process.env` with a local fallback:
  `new MongoClient(process.env.MONGODB_URI || "mongodb://localhost:27017")`.
- Use `dotenv` (`dotenv.config()`) and a `.env` file:
  ```
  PORT=3000
  MONGODB_URI=mongodb://localhost:27017
  ```
- **Add `.env` to `.gitignore`.** Never commit secrets.

### Types (`types.ts`)
- `_id` is always **optional** and typed `ObjectId`, because Mongo assigns it:

```typescript
import { ObjectId } from "mongodb";

export interface User {
    _id?: ObjectId;
    id: number;
    name: string;
    // ...
}
```

### Driver operations allowed by the course
- **Insert:** `insertOne(obj)`, `insertMany([...])`.
- **Read:** `findOne<T>(filter)` (returns `T | null`), `find<T>(filter)` returns a **cursor**
  — call `.toArray()` (awaited) to get results.
- **Update:** `updateOne(filter, { $set: {...} })`, `updateMany(...)`, `{ upsert: true }`.
- **Delete:** `deleteOne(filter)`, `deleteMany(filter)`; `deleteMany({})` clears the collection.
- **Find by id:** `findOne({ _id: new ObjectId("...") })` (import `ObjectId` from `mongodb`).
- **Query operators:** `$eq $ne $gt $gte $lt $lte $in $nin`, logical `$and $or $not`.
- **Sort / limit / skip:** `.sort({ field: 1 | -1 })`, `.limit(n)`, `.skip(n)`,
  `.collation({ locale: "en" })` for language-aware sorting.
- **Text search:** regex `find({ title: /term/i })` or `new RegExp(search, "i")`; or a text
  index `createIndex({ title: "text" })` + `find({ $text: { $search: "term" } })`
  (`$language`, `default_language: "none"`, `dropIndex("*")`).
- Almost all driver calls are async → always `await` them.

### Per-request connection (only when NOT using the module approach)
If you ever connect per request, wrap it in `try / catch / finally` and `client.close()` in
`finally`. The module approach above (one long-lived connection) is preferred.

---

## 7. Cookies & sessions

- **Cookies:** `cookie-parser` middleware. `res.cookie(name, value, { maxAge, httpOnly, sameSite })`,
  `req.cookies.name`, `res.clearCookie(name)`. Prefer `httpOnly: true` and `sameSite: "strict"`.
- **Sessions:** `express-session`. Configure with `session({ secret, resave, saveUninitialized, cookie })`.
  Read/write via `req.session`. Extend `SessionData` via `declare module "express-session"`.
  For redirects, save manually: `req.session.save(() => res.redirect("/"))`.
  In-memory store is fine for development; use a real session store in production.

---

## 8. Client-side TypeScript

- Client TS lives in `scripts/`, compiled with **esbuild** into `public/js/`:
  ```bash
  npx esbuild scripts/* --bundle --outdir=public/js --platform=browser
  ```
- Reference the compiled output from EJS: `<script src="/js/index.js"></script>`.
- Wrap DOM code in `window.addEventListener("load", () => { ... })`.
- Type your selectors: `document.querySelector<HTMLButtonElement>("#id")` and guard for
  `null` before using elements.
- Use `querySelector` / `querySelectorAll`, `innerText`, `innerHTML`, `style`, `classList`,
  `createElement` / `appendChild` / `removeChild`, `addEventListener`.
- `esbuild` bundles imports, so client dependencies (e.g. `debounce`) need no extra script tags.

---

## 9. Tooling & scripts

- **nodemon** for development, wired through `package.json` scripts (preferred over a global
  install), so teammates get it with `npm install`:

```json
{
  "scripts": {
    "test": "jest",
    "build:client": "esbuild scripts/* --minify --bundle --outdir=public/js --platform=browser",
    "start": "npm run build:client && nodemon index.ts",
    "dev": "concurrently \"npm run start\" \"npm run build:client -- --watch\""
  }
}
```

- Install packages exactly as the course does:
  - `npm install express` + `npm install --save-dev @types/express`
  - `npm install ejs` + `npm install --save-dev @types/ejs`
  - `npm install mongodb`
  - `npm install dotenv`
  - `npm install multer` + `npm install --save-dev @types/multer`
  - `npm install --save cookie-parser --save-dev @types/cookie-parser`
  - `npm i --save express-session --save-dev @types/express-session`
  - `npm install --save-dev nodemon esbuild`

- **Deployment:** Render (PaaS), build command `npm install`, start command `npm start`.
  Set env vars (incl. the Mongo URI) in the Render dashboard, not in code.

---

## 10. Testing

- **Jest** + **supertest** (`npm i --save-dev supertest @types/supertest`).
- To make the app testable, split it: `app.ts` **exports** the configured `app`; `index.ts`
  imports it and calls `app.listen`. This avoids Jest "open handles" warnings.

```typescript
// app.ts
import express from "express";
const app = express();
app.get("/hello", (req, res) => { res.send("Hello, world!"); });
export default app;

// index.ts
import app from "./app";
app.listen(3000, () => console.log("Server is running on http://localhost:3000"));
```

```typescript
// app.test.ts
import request from "supertest";
import app from "./app";

describe("GET /hello", () => {
    it("should return Hello, world!", async () => {
        const response = await request(app).get("/hello");
        expect(response.status).toBe(200);
        expect(response.text).toBe("Hello, world!");
    });
});
```

- Query/body in tests: `.query({ name: "world" })`, `.send({ name: "world" })`.
- Parse HTML responses with `node-html-parser` when asserting on elements.
- **Mock the database** with `jest.spyOn(collection, "find")` (that's why `collection` is
  exported from `database.ts`). Mock `fetch` with `fetch-mock-jest`. Reset between tests:
  `afterEach(() => jest.clearAllMocks());`.
