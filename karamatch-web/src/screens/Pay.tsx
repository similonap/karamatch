import { useState } from "react";
import { api } from "../api";
import { useApp } from "../AppContext";
import { C, FONT, LAYOUT, R, S, S2, T } from "../design/tokens";
import { Icon } from "../design/icons";
import { AppBar, BottomBar, Button, Card, ErrorNote, ScrollBody, Spinner, money } from "../ui";

type Phase = "idle" | "processing" | "done";

export default function Pay() {
    const app = useApp();
    const pay = app.pay;
    const [phase, setPhase] = useState<Phase>("idle");
    const [error, setError] = useState<string | null>(null);

    if (!pay) {
        return (
            <>
                <AppBar title="Payment" onBack={() => app.go("app")} />
                <ScrollBody style={{ paddingTop: S.md }}>
                    <ErrorNote message="Nothing to pay for." />
                </ScrollBody>
            </>
        );
    }

    const isJoin = pay.kind === "join";

    async function confirm() {
        if (!pay) {
            return;
        }
        setPhase("processing");
        setError(null);
        try {
            await api.payParty(pay.partyId);
            await app.refreshMe();
            setPhase("done");
        } catch (err) {
            setError((err as Error).message);
            setPhase("idle");
        }
    }

    if (phase === "processing") {
        return (
            <Centered>
                <Spinner size={40} />
                <div style={{ ...T.body, color: C.textDim }}>Processing payment…</div>
            </Centered>
        );
    }

    if (phase === "done") {
        return (
            <>
                <Centered>
                    <div
                        style={{
                            width: 76,
                            height: 76,
                            borderRadius: "50%",
                            background: "color-mix(in srgb, var(--km-green) 14%, transparent)",
                            border: "2px solid " + C.green,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: C.green,
                            animation: "km-sheet-in 320ms cubic-bezier(.22,.61,.36,1)"
                        }}
                    >
                        <Icon name="check" size={36} strokeWidth={2.4} />
                    </div>
                    <h1 style={{ ...T.title, color: C.text, margin: 0 }}>You're in</h1>
                    <p style={{ ...T.callout, color: C.textMuted, maxWidth: 260, textAlign: "center", margin: 0 }}>
                        {isJoin
                            ? "Your share went to the host. Say hi in the party chat."
                            : "Party booked. Invite friends, or leave it open for others to join."}
                    </p>
                </Centered>
                <BottomBar>
                    <Button label="Open party room" onClick={() => app.openRoom(pay.partyId)} />
                </BottomBar>
            </>
        );
    }

    return (
        <>
            <AppBar title={isJoin ? "Join party" : "Book party"} onBack={() => app.go(isJoin ? "app" : "venue")} />

            <ScrollBody gap={S.md} style={{ paddingTop: S.lg }}>
                {/* The amount is the whole point of this screen, so it gets the
                    display type and nothing competes with it. */}
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ ...T.sectionHeader, color: C.textMuted }}>
                        {isJoin ? "Your share" : "Full party — you host"}
                    </div>
                    <div
                        style={{
                            fontFamily: FONT.display,
                            fontSize: 52,
                            fontWeight: 800,
                            letterSpacing: -2,
                            color: C.text,
                            marginTop: S.sm
                        }}
                    >
                        {money(pay.amount)}
                    </div>
                </div>

                <Card style={{ gap: S2.s12 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: S2.s12 }}>
                        <div
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: R.sm,
                                background: C.tintBg,
                                color: C.tintSoft,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                            }}
                        >
                            <Icon name="info" size={18} />
                        </div>
                        <p style={{ ...T.caption, color: C.textDim, margin: 0 }}>
                            {isJoin
                                ? "Paid straight back to @" + (pay.hostUsername ?? "the host") + ". Your spot is locked once paid."
                                : "You pay the room in full up front. Everyone who joins pays their share back to you — so you are never left covering an empty room alone."}
                        </p>
                    </div>
                </Card>

                {error ? <ErrorNote message={error} /> : null}
            </ScrollBody>

            <BottomBar>
                <Button label={"Pay " + money(pay.amount)} icon="card" onClick={confirm} />
            </BottomBar>
        </>
    );
}

function Centered({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: S.md,
                padding: "0 " + LAYOUT.gutter + "px",
                textAlign: "center"
            }}
        >
            {children}
        </div>
    );
}
