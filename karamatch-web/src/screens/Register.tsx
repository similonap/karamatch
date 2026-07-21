import { useState } from "react";
import { api, setToken } from "../api";
import { useApp } from "../AppContext";
import { C, LAYOUT, S, T } from "../design/tokens";
import { AppBar, BottomBar, Button, ErrorNote, Pressable, ScrollBody, StepHeader, TextField } from "../ui";

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
        <>
            <AppBar onBack={() => app.go("welcome")} bordered={false} />

            <ScrollBody gap={S.md} bottomPad={S.md}>
                <StepHeader step={1} total={3} title="Who's on the mic?" subtitle="This is how other singers will find you." />

                <TextField value={name} onChange={setName} placeholder="Alex Rivera" label="Full name" />
                <TextField
                    value={username}
                    onChange={value => setUsername(value.replace(/^@/, ""))}
                    placeholder="alexsings"
                    label="Username"
                />
                <TextField value={email} onChange={setEmail} type="email" placeholder="you@example.com" label="Email" />
                <TextField
                    value={password}
                    onChange={setPassword}
                    type="password"
                    onEnter={submit}
                    placeholder="At least 8 characters"
                    label="Password"
                />

                {error ? <ErrorNote message={error} /> : null}
            </ScrollBody>

            <BottomBar>
                <Button label={busy ? "Creating account" : "Continue"} onClick={submit} disabled={!ready} busy={busy} />
                <Pressable
                    onClick={() => app.go("signin")}
                    scaleTo={1}
                    style={{ height: LAYOUT.touch, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                >
                    <span style={{ ...T.caption, color: C.textMuted }}>Already singing?</span>
                    <span style={{ ...T.captionStrong, color: C.tintSoft }}>Sign in</span>
                </Pressable>
            </BottomBar>
        </>
    );
}
