import { useState } from "react";
import { api } from "../api";
import { useApp } from "../AppContext";
import { C, GRAD, roundBack } from "../theme";
import { ErrorNote, money } from "../ui";

type Phase = "idle" | "processing" | "done";

export default function Pay() {
    const app = useApp();
    const pay = app.pay;
    const [phase, setPhase] = useState<Phase>("idle");
    const [error, setError] = useState<string | null>(null);

    if (!pay) {
        return (
            <div style={{ padding: 24 }}>
                <ErrorNote message="Nothing to pay for." />
            </div>
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
            await api.payBox(pay.boxId);
            await app.refreshMe();
            setPhase("done");
        } catch (err) {
            setError((err as Error).message);
            setPhase("idle");
        }
    }

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24 }}>
            <button
                onClick={() => app.go(isJoin ? "app" : "venue")}
                style={{ ...roundBack, visibility: phase === "done" ? "hidden" : "visible" }}
            >
                ‹
            </button>

            <div
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 20,
                    alignItems: "center",
                    textAlign: "center"
                }}
            >
                {phase === "idle" ? (
                    <>
                        <div style={{ color: C.textDim, fontSize: 14, fontWeight: 600, letterSpacing: 1 }}>
                            {isJoin ? "YOUR SHARE" : "FULL BOX — YOU HOST"}
                        </div>
                        <div style={{ fontFamily: "Unbounded, sans-serif", fontSize: 52, fontWeight: 900 }}>
                            {money(pay.amount)}
                        </div>
                        <div style={{ color: C.textMuted, fontSize: 14, maxWidth: 260, lineHeight: 1.6 }}>
                            {isJoin
                                ? "Paid straight back to the host @" +
                                  (pay.hostUsername ?? "") +
                                  ". Your spot is locked once paid."
                                : "You pay the box in full up front. Each person who joins pays their share back to you — so you're never left covering an empty room alone."}
                        </div>
                        {error ? <ErrorNote message={error} /> : null}
                        <button
                            onClick={confirm}
                            style={{
                                width: "100%",
                                maxWidth: 300,
                                height: 58,
                                border: "none",
                                borderRadius: 18,
                                background: GRAD,
                                color: "#fff",
                                fontSize: 17,
                                fontWeight: 700,
                                fontFamily: "Outfit, sans-serif",
                                cursor: "pointer",
                                boxShadow: "0 8px 32px rgba(255,61,143,.4)",
                                marginTop: 12
                            }}
                        >
                            Pay {money(pay.amount)}
                        </button>
                    </>
                ) : null}

                {phase === "processing" ? (
                    <>
                        <div
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: "50%",
                                border: "3px solid rgba(255,61,143,.25)",
                                borderTopColor: C.pink,
                                animation: "km-pulse 1s infinite"
                            }}
                        />
                        <div style={{ color: C.textDim, fontSize: 15 }}>Processing payment…</div>
                    </>
                ) : null}

                {phase === "done" ? (
                    <>
                        <div
                            style={{
                                width: 84,
                                height: 84,
                                borderRadius: "50%",
                                background: "rgba(61,255,154,.12)",
                                border: "2px solid " + C.green,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 36,
                                color: C.green,
                                animation: "km-pop .3s ease"
                            }}
                        >
                            ✓
                        </div>
                        <div style={{ fontFamily: "Unbounded, sans-serif", fontSize: 24, fontWeight: 700 }}>
                            You're in!
                        </div>
                        <div style={{ color: C.textMuted, fontSize: 14, maxWidth: 260, lineHeight: 1.6 }}>
                            {isJoin
                                ? "Your share went to the host. Say hi in the box chat!"
                                : "Box booked. Invite friends or open it up for others to join."}
                        </div>
                        <button
                            onClick={() => app.openRoom(pay.boxId)}
                            style={{
                                width: "100%",
                                maxWidth: 300,
                                height: 58,
                                borderRadius: 18,
                                background: "rgba(41,224,255,.12)",
                                border: "1px solid rgba(41,224,255,.4)",
                                color: C.cyan,
                                fontSize: 16,
                                fontWeight: 700,
                                fontFamily: "Outfit, sans-serif",
                                cursor: "pointer",
                                marginTop: 12
                            }}
                        >
                            Open box room →
                        </button>
                    </>
                ) : null}
            </div>
        </div>
    );
}
