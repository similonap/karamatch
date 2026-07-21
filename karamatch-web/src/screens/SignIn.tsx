import { useState } from "react";
import { api, setToken } from "../api";
import { useApp } from "../AppContext";
import { C, LAYOUT, S, S2, T } from "../design/tokens";
import { AppBar, BottomBar, BrandMark, Button, ErrorNote, Pressable, ScrollBody, TextField } from "../ui";

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
        <>
            <AppBar onBack={() => app.go("welcome")} bordered={false} />

            <ScrollBody gap={S.md} bottomPad={S.md}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: S2.s10, padding: S.sm + "px 0 " + S.md + "px" }}>
                    <BrandMark size={60} />
                    <h1 style={{ ...T.title, color: C.text, margin: 0 }}>Welcome back</h1>
                    <div style={{ ...T.callout, color: C.textMuted, textAlign: "center" }}>
                        Sign in to find your next party.
                    </div>
                </div>

                <TextField
                    value={login}
                    onChange={value => {
                        setLogin(value);
                        setError(null);
                    }}
                    placeholder="Email or username"
                    label="Account"
                />
                <TextField
                    value={password}
                    type="password"
                    onChange={value => {
                        setPassword(value);
                        setError(null);
                    }}
                    onEnter={submit}
                    placeholder="Password"
                    label="Password"
                />

                <Pressable onClick={forgot} style={{ alignSelf: "flex-end", padding: S.xs, minHeight: 0 }}>
                    <span style={{ ...T.captionStrong, color: C.tintSoft }}>Forgot password?</span>
                </Pressable>

                {error ? <ErrorNote message={error} /> : null}
            </ScrollBody>

            <BottomBar>
                <Button label={busy ? "Signing in" : "Sign in"} onClick={submit} disabled={!ready} busy={busy} />
                <Pressable
                    onClick={() => app.go("register")}
                    scaleTo={1}
                    style={{
                        height: LAYOUT.touch,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5
                    }}
                >
                    <span style={{ ...T.caption, color: C.textMuted }}>No account?</span>
                    <span style={{ ...T.captionStrong, color: C.tintSoft }}>Create one</span>
                </Pressable>
            </BottomBar>
        </>
    );
}
