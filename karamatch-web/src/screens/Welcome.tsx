import { useApp } from "../AppContext";
import { C, FONT, LAYOUT, S, S2, T } from "../design/tokens";
import { BrandMark, Button } from "../ui";

export default function Welcome() {
    const app = useApp();

    return (
        <div
            style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                padding: "0 " + LAYOUT.gutter + "px",
                paddingBottom: LAYOUT.safeBottom + S.md,
                position: "relative",
                // One soft brand wash behind the mark. The old screen stacked two
                // radial gradients and a glow; at phone size that just read as fog.
                background:
                    "radial-gradient(420px 340px at 50% 22%, var(--km-tint-glow), transparent 70%)"
            }}
        >
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: S.md,
                    paddingBottom: S.xxl
                }}
            >
                <BrandMark size={80} />
                <h1
                    style={{
                        fontFamily: FONT.display,
                        fontWeight: 800,
                        fontSize: 34,
                        letterSpacing: -1,
                        margin: 0,
                        color: C.text
                    }}
                >
                    Kara<span style={{ color: C.tint }}>Match</span>
                </h1>
                <p
                    style={{
                        ...T.body,
                        fontSize: 16,
                        color: C.textDim,
                        textAlign: "center",
                        maxWidth: 260,
                        margin: 0
                    }}
                >
                    Find people who sing what you sing. Book a party. Split the bill.
                </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: S2.s10 }}>
                <Button label="Create account" onClick={() => app.go("register")} />
                <Button label="Sign in" variant="secondary" onClick={() => app.go("signin")} />
            </div>
        </div>
    );
}
