import { useState } from "react";
import { api, setToken } from "../api";
import { useApp } from "../AppContext";
import { C, inputStyle, primaryButton } from "../theme";
import { ErrorNote } from "../ui";

export default function Register() {
    const app = useApp();
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const ready = Boolean(name && username && email && password) && !busy;

    async function submit() {
        if (!ready) {
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const result = await api.register({ name, username, email, password });
            setToken(result.token);
            await app.refreshMe();
            app.go("location");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div
            style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                padding: "24px 24px 40px",
                gap: 18,
                overflow: "auto"
            }}
        >
            <div style={{ color: C.pink, fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>STEP 1 OF 3</div>
            <div style={{ fontFamily: "Unbounded, sans-serif", fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>
                Who's on the mic?
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={inputStyle} />
                <input
                    value={username}
                    onChange={e => setUsername(e.target.value.replace(/^@/, ""))}
                    placeholder="Username"
                    style={inputStyle}
                />
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={inputStyle} />
                <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === "Enter") {
                            void submit();
                        }
                    }}
                    placeholder="Password"
                    style={inputStyle}
                />
            </div>

            {error ? <ErrorNote message={error} /> : null}

            <div style={{ flex: 1, minHeight: 20 }} />

            <button onClick={submit} style={primaryButton(ready)}>
                {busy ? "Creating account…" : "Continue"}
            </button>
            <div style={{ textAlign: "center", color: C.textMuted, fontSize: 14 }}>
                Already singing?{" "}
                <span onClick={() => app.go("signin")} style={{ color: C.pinkSoft, fontWeight: 700, cursor: "pointer" }}>
                    Sign in
                </span>
            </div>
        </div>
    );
}
