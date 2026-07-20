import { useState } from "react";
import { api, setToken } from "../api";
import { useApp } from "../AppContext";
import { C, GRAD_TILE, inputStyle, primaryButton, roundBack } from "../theme";
import { ErrorNote } from "../ui";

export default function SignIn() {
    const app = useApp();
    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const ready = login !== "" && password !== "" && !busy;

    async function submit() {
        if (!ready) {
            setError("Enter your email and password.");
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const result = await api.login(login, password);
            setToken(result.token);
            const me = await app.refreshMe();
            app.toast("Welcome back, " + result.user.name.split(" ")[0] + "!");
            if (!me || !me.location) {
                app.go("location");
            } else if (me.favoriteSongIds.length < 3) {
                app.go("songs");
            } else {
                app.goTab("venues");
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    async function forgot() {
        if (!login.includes("@")) {
            app.toast("Enter your email first");
            return;
        }
        await api.forgot(login).catch(() => undefined);
        app.toast("Password reset link sent");
    }

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 24px 40px", gap: 18 }}>
            <button onClick={() => app.go("welcome")} style={{ ...roundBack, borderRadius: "50%" }}>
                ‹
            </button>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 8 }}>
                <div
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: 22,
                        background: GRAD_TILE,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 30,
                        boxShadow: "0 0 40px rgba(255,61,143,.4)",
                        color: "#fff"
                    }}
                >
                    ♪
                </div>
                <div style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 700, fontSize: 24 }}>Welcome back</div>
                <div style={{ color: C.textDim, fontSize: 14, textAlign: "center" }}>Sign in to find your next party.</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                <input
                    value={login}
                    onChange={event => {
                        setLogin(event.target.value);
                        setError(null);
                    }}
                    placeholder="Email or username"
                    style={inputStyle}
                />
                <input
                    type="password"
                    value={password}
                    onChange={event => {
                        setPassword(event.target.value);
                        setError(null);
                    }}
                    onKeyDown={event => {
                        if (event.key === "Enter") {
                            void submit();
                        }
                    }}
                    placeholder="Password"
                    style={inputStyle}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <span
                        onClick={forgot}
                        style={{ color: C.cyan, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                        Forgot password?
                    </span>
                </div>
            </div>

            {error ? <ErrorNote message={error} /> : null}

            <div style={{ flex: 1 }} />

            <button onClick={submit} style={primaryButton(ready)}>
                {busy ? "Signing in…" : "Sign in"}
            </button>
            <div style={{ textAlign: "center", color: C.textMuted, fontSize: 14 }}>
                No account?{" "}
                <span
                    onClick={() => app.go("register")}
                    style={{ color: C.pinkSoft, fontWeight: 700, cursor: "pointer" }}
                >
                    Create one
                </span>
            </div>
        </div>
    );
}
