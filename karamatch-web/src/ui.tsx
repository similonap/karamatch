import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { C, GRAD, avatarColor, initial, roundBack } from "./theme";

// ---------------------------------------------------------------------------
// Phone frame — mirrors ios-frame.jsx (402x874, r48, dynamic island, home bar)
// ---------------------------------------------------------------------------

export function PhoneFrame({ children }: { children: ReactNode }) {
    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "radial-gradient(1200px 700px at 50% -10%, #1B0F33 0%, #07040D 60%)",
                padding: 32,
                fontFamily: "Outfit, sans-serif",
                boxSizing: "border-box"
            }}
        >
            <div
                style={{
                    width: 402,
                    height: 874,
                    borderRadius: 48,
                    overflow: "hidden",
                    position: "relative",
                    background: "#000",
                    boxShadow: "0 40px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)",
                    flexShrink: 0
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: 11,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 126,
                        height: 37,
                        borderRadius: 24,
                        background: "#000",
                        zIndex: 50
                    }}
                />
                <div
                    style={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        background: "linear-gradient(180deg,#0D0718 0%,#0A0512 100%)",
                        color: C.text,
                        overflow: "hidden",
                        position: "relative",
                        paddingTop: 58,
                        boxSizing: "border-box"
                    }}
                >
                    {children}
                </div>
                <div
                    style={{
                        position: "absolute",
                        bottom: 8,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 140,
                        height: 5,
                        borderRadius: 3,
                        background: "rgba(255,255,255,.35)",
                        zIndex: 60,
                        pointerEvents: "none"
                    }}
                />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

export function Avatar({
    name,
    photoUrl,
    seed,
    size = 38,
    fontSize
}: {
    name: string;
    photoUrl?: string | null;
    seed?: string | number;
    size?: number;
    fontSize?: number;
}) {
    const [broken, setBroken] = useState(false);
    const showPhoto = photoUrl && !broken;
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                background: avatarColor(seed ?? name),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: fontSize ?? Math.round(size * 0.4),
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
                overflow: "hidden"
            }}
        >
            {showPhoto ? (
                <img
                    src={photoUrl}
                    alt={name}
                    onError={() => setBroken(true)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            ) : (
                initial(name)
            )}
        </div>
    );
}

// Taste compatibility as a compact pill, for singers listed in a row. The
// Match tab uses a big conic ring instead — that has room, list rows do not.
// Renders nothing when pct is null (that singer is you).
export function MatchBadge({ pct }: { pct: number | null | undefined }) {
    if (pct === null || pct === undefined) {
        return null;
    }
    const strong = pct >= 60;
    return (
        <div
            title={pct + "% taste match with you"}
            style={{
                flexShrink: 0,
                borderRadius: 999,
                padding: "3px 9px",
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1.4,
                color: strong ? C.pinkSoft : C.textMuted,
                border: "1px solid " + (strong ? "rgba(255,61,143,.5)" : "rgba(255,255,255,.14)"),
                background: strong ? "rgba(255,61,143,.14)" : "rgba(255,255,255,.05)"
            }}
        >
            {pct}%
        </div>
    );
}

export function BackButton({ onClick }: { onClick: () => void }) {
    return (
        <button onClick={onClick} style={roundBack}>
            ‹
        </button>
    );
}

export function Toast({ message }: { message: string }) {
    return (
        <div
            style={{
                position: "absolute",
                bottom: 110,
                left: 24,
                right: 24,
                background: "rgba(20,11,34,.95)",
                border: "1px solid rgba(41,224,255,.4)",
                color: C.text,
                padding: "12px 16px",
                borderRadius: 14,
                fontSize: 14,
                textAlign: "center",
                animation: "km-pop .25s ease",
                boxShadow: "0 8px 30px rgba(0,0,0,.5)",
                zIndex: 50
            }}
        >
            {message}
        </div>
    );
}

// Blocking "are you sure?" for destructive actions. Like Toast it is absolute
// inside the phone frame, so it dims the whole screen instead of the browser.
export function ConfirmDialog({
    title,
    body,
    confirmLabel,
    busy,
    onConfirm,
    onCancel
}: {
    title: string;
    body: string;
    confirmLabel: string;
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div
            onClick={onCancel}
            style={{
                position: "absolute",
                inset: 0,
                background: "rgba(5,2,10,.72)",
                backdropFilter: "blur(2px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 28,
                zIndex: 70
            }}
        >
            <div
                onClick={event => event.stopPropagation()}
                style={{
                    width: "100%",
                    background: C.panel,
                    border: "1px solid rgba(255,255,255,.12)",
                    borderRadius: 22,
                    padding: 22,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    animation: "km-pop .25s ease",
                    boxShadow: "0 20px 60px rgba(0,0,0,.6)"
                }}
            >
                <div style={{ fontFamily: "Unbounded, sans-serif", fontSize: 17, fontWeight: 700 }}>{title}</div>
                <div style={{ color: C.textDim, fontSize: 14, lineHeight: 1.5 }}>{body}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <button
                        onClick={onCancel}
                        disabled={busy}
                        style={{
                            flex: 1,
                            height: 46,
                            borderRadius: 14,
                            border: "1px solid rgba(255,255,255,.16)",
                            background: "rgba(255,255,255,.05)",
                            color: C.textDim,
                            fontWeight: 700,
                            fontSize: 14,
                            fontFamily: "Outfit, sans-serif",
                            cursor: "pointer"
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={busy}
                        style={{
                            flex: 1,
                            height: 46,
                            borderRadius: 14,
                            border: "1px solid rgba(255,61,143,.45)",
                            background: "rgba(255,61,143,.14)",
                            color: C.pinkSoft,
                            fontWeight: 700,
                            fontSize: 14,
                            fontFamily: "Outfit, sans-serif",
                            cursor: "pointer",
                            opacity: busy ? 0.6 : 1
                        }}
                    >
                        {busy ? "Removing…" : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function Spinner({ size = 64 }: { size?: number }) {
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                border: "3px solid rgba(255,61,143,.25)",
                borderTopColor: C.pink,
                animation: "km-spin 1s linear infinite"
            }}
        />
    );
}

// Centred filler used while a screen's first fetch is in flight.
export function Loading({ label }: { label?: string }) {
    return (
        <div
            style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                color: C.textMuted,
                fontSize: 14
            }}
        >
            <Spinner size={40} />
            {label ? <div>{label}</div> : null}
        </div>
    );
}

export function ErrorNote({ message }: { message: string }) {
    return (
        <div
            style={{
                color: C.pinkSoft,
                fontSize: 13,
                background: "rgba(255,61,143,.08)",
                border: "1px solid rgba(255,61,143,.3)",
                borderRadius: 12,
                padding: "10px 14px"
            }}
        >
            {message}
        </div>
    );
}

export function EmptyCard({ children }: { children: ReactNode }) {
    return (
        <div
            style={{
                borderRadius: 20,
                border: "1px dashed rgba(255,255,255,.18)",
                padding: 24,
                textAlign: "center",
                color: C.textMuted,
                fontSize: 14,
                lineHeight: 1.6
            }}
        >
            {children}
        </div>
    );
}

// A selectable pill (day / time / room) — the prototype's `opt()` helper.
export function optionStyle(selected: boolean): CSSProperties {
    return {
        borderColor: selected ? "rgba(255,61,143,.6)" : "rgba(255,255,255,.12)",
        background: selected ? "rgba(255,61,143,.12)" : "rgba(255,255,255,.05)",
        color: selected ? C.pinkSoft : C.textDim
    };
}

// The check-ring used by the song picker and invite list.
export function CheckRing({ on, size = 24 }: { on: boolean; size?: number }) {
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                border: "2px solid " + (on ? C.pink : "rgba(255,255,255,.25)"),
                background: on ? C.pink : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                color: "#0A0512",
                fontWeight: 800,
                flexShrink: 0,
                boxSizing: "border-box"
            }}
        >
            {on ? "✓" : ""}
        </div>
    );
}

export function GradientTile({ size, radius, children }: { size: number; radius: number; children: ReactNode }) {
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: radius,
                background: GRAD,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: Math.round(size * 0.45),
                color: "#fff",
                flexShrink: 0
            }}
        >
            {children}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Hooks & formatting
// ---------------------------------------------------------------------------

// Runs an async loader on mount / when `deps` change, tracking loading + error.
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nonce, setNonce] = useState(0);

    useEffect(() => {
        let live = true;
        setLoading(true);
        setError(null);
        loader()
            .then(result => {
                if (live) {
                    setData(result);
                }
            })
            .catch((err: Error) => {
                if (live) {
                    setError(err.message);
                }
            })
            .finally(() => {
                if (live) {
                    setLoading(false);
                }
            });
        return () => {
            live = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, nonce]);

    return { data, loading, error, reload: () => setNonce(n => n + 1), setData };
}

// Debounced value, for the song / people search inputs.
export function useDebounced<T>(value: T, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// "Today 21:00" / "Tomorrow 20:00" / "Sat 21:00" — the prototype's phrasing.
export function formatWhen(iso: string) {
    if (!iso) {
        return "";
    }
    const date = new Date(iso);
    const days = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);
    const time = String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
    if (days === 0) {
        return "Today " + time;
    }
    if (days === 1) {
        return "Tomorrow " + time;
    }
    if (days === -1) {
        return "Yesterday " + time;
    }
    if (days > 1 && days < 7) {
        return DAY_NAMES[date.getDay()] + " " + time;
    }
    if (days < 0) {
        return "last " + DAY_NAMES[date.getDay()];
    }
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " " + time;
}

export function formatTime(iso: string) {
    const date = new Date(iso);
    return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
}

export function formatDayLabel(iso: string) {
    const date = new Date(iso);
    const days = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);
    if (days === 0) {
        return "Today";
    }
    if (days === 1) {
        return "Tomorrow";
    }
    return DAY_NAMES[date.getDay()];
}

export function money(amount: number) {
    return "€" + amount;
}

export function plural(count: number, one: string, many: string) {
    return count + " " + (count === 1 ? one : many);
}
