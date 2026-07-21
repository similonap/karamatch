import { useApp } from "../AppContext";
import { C, GRAD, GRAD_TILE } from "../theme";

export default function Welcome() {
    const app = useApp();
    return (
        <div
            style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: "0 28px 48px",
                position: "relative",
                background:
                    "radial-gradient(500px 400px at 50% 20%, rgba(255,61,143,.22), transparent 70%), radial-gradient(400px 300px at 80% 55%, rgba(41,224,255,.14), transparent 70%)"
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: 120,
                    left: 0,
                    right: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 14
                }}
            >
                <div
                    style={{
                        width: 88,
                        height: 88,
                        borderRadius: 28,
                        background: GRAD_TILE,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 42,
                        boxShadow: "0 0 60px rgba(255,61,143,.55)",
                        color: "#fff"
                    }}
                >
                    ♪
                </div>
                <div style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 900, fontSize: 34, letterSpacing: -1 }}>
                    Kara<span style={{ color: C.pink }}>Match</span>
                </div>
                <div style={{ color: C.textDim, fontSize: 16, textAlign: "center", maxWidth: 260, lineHeight: 1.5 }}>
                    Find people who sing what you sing. Book a party. Split the bill.
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <button
                    onClick={() => app.go("register")}
                    style={{
                        height: 56,
                        border: "none",
                        borderRadius: 18,
                        background: GRAD,
                        color: "#fff",
                        fontFamily: "Outfit, sans-serif",
                        fontSize: 17,
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 8px 32px rgba(255,61,143,.4)"
                    }}
                >
                    Create account
                </button>
                <button
                    onClick={() => app.go("signin")}
                    style={{
                        height: 56,
                        border: "1px solid var(--km-veil-16)",
                        borderRadius: 18,
                        background: "var(--km-veil-05)",
                        color: C.text,
                        fontFamily: "Outfit, sans-serif",
                        fontSize: 17,
                        fontWeight: 600,
                        cursor: "pointer"
                    }}
                >
                    Sign in
                </button>
            </div>
        </div>
    );
}
