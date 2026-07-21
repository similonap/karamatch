import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useApp } from "./AppContext";
import type { ThemeName } from "./AppContext";
import { C, FONT, GRAD, LAYOUT, R, S, S2, SHADOW, T, avatarColor, initial } from "./design/tokens";
import { Icon, StarIcon } from "./design/icons";
import type { IconName } from "./design/icons";

// OpenStreetMap data through CARTO's basemaps, picked to match the theme so a
// map never glows white in the dark app or goes black in the light one.
export function tileUrl(theme: ThemeName) {
    const variant = theme === "light" ? "light_all" : "dark_all";
    return "https://{s}.basemaps.cartocdn.com/" + variant + "/{z}/{x}/{y}{r}.png";
}

// CARTO's dark basemap is near-black by design, which reads as an empty panel
// at this size. Lifting the tiles brings the streets back without turning the
// map into a white hole in a dark screen.
export function tileFilter(theme: ThemeName) {
    return theme === "light" ? "contrast(1.05) saturate(1.1)" : "brightness(3.1) contrast(0.72) saturate(1.25)";
}

export const TILE_ATTRIBUTION =
    "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a>";

// ---------------------------------------------------------------------------
// Device frame
// ---------------------------------------------------------------------------

// A deliberately neutral handset: rounded slab, centred punch-hole camera, one
// gesture bar. No Dynamic Island — the brief is a UI that is identical on
// Android and iOS, and the frame should not imply one of them.
export function PhoneFrame({ children }: { children: ReactNode }) {
    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--km-stage)",
                padding: S.xl,
                fontFamily: FONT.body,
                boxSizing: "border-box"
            }}
        >
            <div
                style={{
                    width: 390,
                    height: 844,
                    borderRadius: 44,
                    overflow: "hidden",
                    position: "relative",
                    background: "#000",
                    boxShadow: SHADOW.e3 + ", 0 0 0 1px var(--km-border-strong)",
                    flexShrink: 0
                }}
            >
                <div
                    style={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        background: C.surface,
                        color: C.text,
                        overflow: "hidden",
                        position: "relative",
                        boxSizing: "border-box"
                    }}
                >
                    <StatusBar />
                    {children}
                </div>
                {/* Gesture bar. Both platforms draw one; it is the reason every
                    screen reserves LAYOUT.safeBottom at the bottom. */}
                <div
                    style={{
                        position: "absolute",
                        bottom: 8,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 134,
                        height: 5,
                        borderRadius: 3,
                        background: C.textMuted,
                        opacity: 0.6,
                        zIndex: 60,
                        pointerEvents: "none"
                    }}
                />
            </div>
        </div>
    );
}

// The OS status bar. Drawn rather than emoji'd so it is pixel-identical on
// every platform, and so it can tint itself against whatever screen is below.
function StatusBar() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 30000);
        return () => window.clearInterval(timer);
    }, []);

    const clock = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");

    return (
        <div
            style={{
                height: LAYOUT.safeTop,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 " + S.lg + "px",
                paddingTop: 10,
                position: "relative",
                zIndex: 40,
                color: C.text,
                boxSizing: "border-box"
            }}
        >
            <div style={{ ...T.footnote, fontSize: 13, fontWeight: 700, letterSpacing: 0.2 }}>{clock}</div>
            {/* Punch-hole camera, centred — the neutral choice across platforms. */}
            <div
                style={{
                    position: "absolute",
                    top: 14,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 11,
                    height: 11,
                    borderRadius: "50%",
                    background: "#000",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,.12)"
                }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <svg width="17" height="11" viewBox="0 0 17 11" aria-hidden="true" style={{ display: "block" }}>
                    {[0, 1, 2, 3].map(i => (
                        <rect
                            key={i}
                            x={i * 4.4}
                            y={8 - i * 2.4}
                            width="3"
                            height={3 + i * 2.4}
                            rx="1"
                            fill="currentColor"
                            opacity={i === 3 ? 0.35 : 1}
                        />
                    ))}
                </svg>
                <svg width="15" height="11" viewBox="0 0 15 11" aria-hidden="true" style={{ display: "block" }}>
                    <path
                        d="M7.5 9.4 1 3.6a9.6 9.6 0 0 1 13 0Z"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinejoin="round"
                    />
                </svg>
                <svg width="25" height="12" viewBox="0 0 25 12" aria-hidden="true" style={{ display: "block" }}>
                    <rect x="0.6" y="0.6" width="21" height="10.8" rx="3.2" fill="none" stroke="currentColor" opacity="0.4" strokeWidth="1.1" />
                    <rect x="2.2" y="2.2" width="14" height="7.6" rx="1.9" fill="currentColor" />
                    <path d="M23.2 4.2v3.6a2 2 0 0 0 0-3.6Z" fill="currentColor" opacity="0.4" />
                </svg>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Pressable — the foundation of every touchable in the app
// ---------------------------------------------------------------------------

// Native touchables acknowledge a finger the instant it lands. Nothing in the
// old build did: it relied on `cursor: pointer` and CSS :hover, neither of
// which exists on a phone. This dips scale + opacity on pointerdown and
// releases on up/cancel/leave, which is what Pressable does in React Native.
export function Pressable({
    onClick,
    disabled,
    style,
    children,
    scaleTo = 0.97,
    opacityTo = 0.72,
    as = "button",
    ariaLabel,
    title,
    stopPropagation
}: {
    onClick?: () => void;
    disabled?: boolean;
    style?: CSSProperties;
    children: ReactNode;
    /** 1 disables the scale dip — right for full-bleed rows, wrong for buttons. */
    scaleTo?: number;
    opacityTo?: number;
    as?: "button" | "div";
    ariaLabel?: string;
    title?: string;
    stopPropagation?: boolean;
}) {
    const [down, setDown] = useState(false);
    const active = down && !disabled;

    const base: CSSProperties = {
        appearance: "none",
        border: "none",
        background: "none",
        padding: 0,
        margin: 0,
        font: "inherit",
        color: "inherit",
        textAlign: "left",
        cursor: disabled ? "default" : "pointer",
        touchAction: "manipulation",
        transform: active ? "scale(" + scaleTo + ")" : "scale(1)",
        opacity: disabled ? 0.45 : active ? opacityTo : 1,
        transition: active ? "transform 60ms ease-out, opacity 60ms ease-out" : "transform 160ms ease-out, opacity 160ms ease-out",
        ...style
    };

    const handlers = {
        onPointerDown: () => setDown(true),
        onPointerUp: () => setDown(false),
        onPointerLeave: () => setDown(false),
        onPointerCancel: () => setDown(false),
        onClick: (event: { stopPropagation: () => void }) => {
            if (stopPropagation) {
                event.stopPropagation();
            }
            if (!disabled) {
                onClick?.();
            }
        }
    };

    if (as === "div") {
        return (
            <div {...handlers} role="button" tabIndex={0} aria-label={ariaLabel} title={title} style={base}>
                {children}
            </div>
        );
    }

    return (
        <button {...handlers} type="button" disabled={disabled} aria-label={ariaLabel} title={title} style={base}>
            {children}
        </button>
    );
}

// ---------------------------------------------------------------------------
// Screen scaffolding
// ---------------------------------------------------------------------------

// A stack screen's navigation bar: fixed height, hairline underneath, back
// affordance on the left and at most one action on the right.
export function AppBar({
    title,
    onBack,
    right,
    large,
    subtitle,
    bordered = true
}: {
    title?: ReactNode;
    onBack?: () => void;
    right?: ReactNode;
    /** Renders the title below the bar instead, as a large screen heading. */
    large?: boolean;
    subtitle?: string;
    bordered?: boolean;
}) {
    return (
        <div style={{ flexShrink: 0 }}>
            <div
                style={{
                    height: LAYOUT.appBar,
                    display: "flex",
                    alignItems: "center",
                    gap: S.sm,
                    padding: "0 " + S.sm + "px 0 " + (onBack ? S.xs : LAYOUT.gutter) + "px",
                    borderBottom: bordered && !large ? "1px solid " + C.border : "1px solid transparent",
                    boxSizing: "border-box"
                }}
            >
                {onBack ? (
                    <Pressable
                        onClick={onBack}
                        ariaLabel="Go back"
                        style={{
                            width: LAYOUT.touch,
                            height: LAYOUT.touch,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: R.full,
                            color: C.text
                        }}
                    >
                        <Icon name="chevronLeft" size={24} strokeWidth={2} />
                    </Pressable>
                ) : null}

                <div style={{ flex: 1, minWidth: 0 }}>
                    {!large && title ? (
                        <div style={{ ...T.navTitle, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {title}
                        </div>
                    ) : null}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: S.xs }}>{right}</div>
            </div>

            {large && title ? (
                <div style={{ padding: "0 " + LAYOUT.gutter + "px " + S.md + "px" }}>
                    <h1 style={{ ...T.title, color: C.text, margin: 0 }}>{title}</h1>
                    {subtitle ? <div style={{ ...T.caption, color: C.textMuted, marginTop: 3 }}>{subtitle}</div> : null}
                </div>
            ) : null}
        </div>
    );
}

/** A circular icon button for an app bar or an overlay. */
export function IconButton({
    icon,
    onClick,
    label,
    badge,
    tone = "plain",
    size = LAYOUT.touch
}: {
    icon: IconName;
    onClick: () => void;
    label: string;
    badge?: number;
    tone?: "plain" | "filled";
    size?: number;
}) {
    return (
        <Pressable
            onClick={onClick}
            ariaLabel={label}
            title={label}
            style={{
                position: "relative",
                width: size,
                height: size,
                borderRadius: R.full,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.text,
                background: tone === "filled" ? C.surface2 : "transparent",
                border: tone === "filled" ? "1px solid " + C.border : "none",
                boxSizing: "border-box"
            }}
        >
            <Icon name={icon} size={22} />
            {badge && badge > 0 ? (
                <span
                    style={{
                        position: "absolute",
                        top: 5,
                        right: 4,
                        minWidth: 17,
                        height: 17,
                        borderRadius: R.full,
                        background: C.tint,
                        color: C.onTint,
                        ...T.footnote,
                        fontSize: 10,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 4px",
                        boxSizing: "border-box",
                        border: "2px solid " + C.surface
                    }}
                >
                    {badge > 9 ? "9+" : badge}
                </span>
            ) : null}
        </Pressable>
    );
}

/** The scrolling body of a screen. Handles the gutter and the safe-area pad. */
export function ScrollBody({
    children,
    pad = true,
    bottomPad = LAYOUT.safeBottom + S.md,
    gap = S2.s12,
    style,
    onScroll
}: {
    children: ReactNode;
    pad?: boolean;
    bottomPad?: number;
    gap?: number;
    style?: CSSProperties;
    /** Scroll offset in px, for screens with a collapsing header. */
    onScroll?: (offset: number) => void;
}) {
    return (
        <div
            className="km-scroll"
            onScroll={onScroll ? event => onScroll(event.currentTarget.scrollTop) : undefined}
            style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap,
                padding: pad ? "0 " + LAYOUT.gutter + "px" : 0,
                paddingBottom: bottomPad,
                ...style
            }}
        >
            {children}
        </div>
    );
}

/** Bottom-docked action area — a primary button pinned above the safe inset. */
export function BottomBar({ children }: { children: ReactNode }) {
    return (
        <div
            style={{
                flexShrink: 0,
                padding: S.md + "px " + LAYOUT.gutter + "px",
                paddingBottom: LAYOUT.safeBottom + S.sm,
                borderTop: "1px solid " + C.border,
                background: C.surface,
                display: "flex",
                flexDirection: "column",
                gap: S.sm
            }}
        >
            {children}
        </div>
    );
}

// Screen transition wrapper. A stack screen entering slides in from the right
// (push) and a screen you go back to slides in from the left (pop) — the
// direction is the whole point, since it tells you where you are in the stack.
// Tab switches cross-fade, because tabs are siblings, not a stack.
const TRANSITION_ANIMATION = {
    push: "km-push",
    pop: "km-pop-screen",
    fade: "km-fade"
} as const;

export function Transition({
    mode,
    keyed,
    children
}: {
    mode: keyof typeof TRANSITION_ANIMATION;
    keyed: string;
    children: ReactNode;
}) {
    return (
        <div
            key={keyed}
            style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                animation: TRANSITION_ANIMATION[mode] + " 240ms cubic-bezier(.22,.61,.36,1)"
            }}
        >
            {children}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Content primitives
// ---------------------------------------------------------------------------

export function Card({
    children,
    onClick,
    style,
    padded = true,
    highlight
}: {
    children: ReactNode;
    onClick?: () => void;
    style?: CSSProperties;
    padded?: boolean;
    /** Tints the border, for the one card that deserves attention. */
    highlight?: boolean;
}) {
    const base: CSSProperties = {
        background: C.surface1,
        border: "1px solid " + (highlight ? C.tintBorder : C.border),
        borderRadius: R.lg,
        boxShadow: SHADOW.e1,
        padding: padded ? S.md : 0,
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        ...style
    };

    if (!onClick) {
        return <div style={base}>{children}</div>;
    }
    return (
        <Pressable as="div" onClick={onClick} scaleTo={0.985} opacityTo={0.85} style={base}>
            {children}
        </Pressable>
    );
}

/** A grouped-list container: rows share one rounded surface, split by hairlines. */
export function Group({ children, title }: { children: ReactNode; title?: string }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: S.sm, flexShrink: 0 }}>
            {title ? (
                <div style={{ ...T.sectionHeader, color: C.textMuted, paddingLeft: S.xs }}>{title}</div>
            ) : null}
            <div
                style={{
                    background: C.surface1,
                    border: "1px solid " + C.border,
                    borderRadius: R.lg,
                    overflow: "hidden",
                    boxShadow: SHADOW.e1
                }}
            >
                {children}
            </div>
        </div>
    );
}

/** A row inside a Group: leading icon, title/subtitle, trailing value + chevron. */
export function ListRow({
    icon,
    iconColor,
    leading,
    title,
    subtitle,
    value,
    onClick,
    chevron,
    danger,
    trailing,
    last
}: {
    icon?: IconName;
    iconColor?: string;
    leading?: ReactNode;
    title: ReactNode;
    subtitle?: ReactNode;
    value?: ReactNode;
    onClick?: () => void;
    chevron?: boolean;
    danger?: boolean;
    trailing?: ReactNode;
    last?: boolean;
}) {
    const body = (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: S2.s12,
                minHeight: 52,
                padding: "10px " + S.md + "px",
                borderBottom: last ? "none" : "1px solid " + C.border,
                boxSizing: "border-box"
            }}
        >
            {leading}
            {icon ? (
                <div style={{ color: danger ? C.tintSoft : iconColor ?? C.textMuted, display: "flex" }}>
                    <Icon name={icon} size={20} />
                </div>
            ) : null}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...T.body, color: danger ? C.tintSoft : C.text, fontWeight: 600 }}>{title}</div>
                {subtitle ? (
                    <div style={{ ...T.caption, color: C.textMuted, marginTop: 1 }}>{subtitle}</div>
                ) : null}
            </div>
            {value ? <div style={{ ...T.caption, color: C.textMuted, flexShrink: 0 }}>{value}</div> : null}
            {trailing}
            {chevron ? (
                <div style={{ color: C.textFaint, display: "flex", flexShrink: 0 }}>
                    <Icon name="chevronRight" size={18} />
                </div>
            ) : null}
        </div>
    );

    if (!onClick) {
        return body;
    }
    return (
        <Pressable as="div" onClick={onClick} scaleTo={1} opacityTo={0.6} style={{ display: "block" }}>
            {body}
        </Pressable>
    );
}

/** A titled block of content within a screen. */
export function Section({
    title,
    hint,
    children,
    gap = S.sm
}: {
    title: string;
    hint?: ReactNode;
    children: ReactNode;
    gap?: number;
}) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap, flexShrink: 0 }}>
            <div style={{ ...T.sectionHeader, color: C.textMuted }}>{title}</div>
            {children}
            {hint ? <div style={{ ...T.footnote, color: C.textFaint }}>{hint}</div> : null}
        </div>
    );
}

/** −/＋ numeric stepper with full-size touch targets. */
export function Stepper({
    value,
    min,
    max,
    onChange,
    suffix
}: {
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    suffix?: string;
}) {
    const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));

    const control = (label: string, icon: IconName, delta: number, off: boolean) => (
        <Pressable
            onClick={() => step(delta)}
            disabled={off}
            ariaLabel={label}
            scaleTo={0.9}
            style={{
                width: LAYOUT.touch,
                height: LAYOUT.touch,
                borderRadius: R.md,
                border: "1px solid " + C.border,
                background: C.surface2,
                color: C.text,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box"
            }}
        >
            <Icon name={icon} size={18} strokeWidth={2.4} />
        </Pressable>
    );

    return (
        <div style={{ display: "flex", alignItems: "center", gap: S2.s12 }}>
            {control("Decrease", "minus", -1, value <= min)}
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, minWidth: 52, justifyContent: "center" }}>
                <span style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: C.text }}>{value}</span>
                {suffix ? <span style={{ ...T.footnote, color: C.textMuted }}>{suffix}</span> : null}
            </div>
            {control("Increase", "plus", 1, value >= max)}
        </div>
    );
}

export function Divider() {
    return <div style={{ height: 1, background: C.border, flexShrink: 0 }} />;
}

type ButtonVariant = "primary" | "tinted" | "secondary" | "ghost" | "danger";

export function Button({
    label,
    onClick,
    variant = "primary",
    disabled,
    busy,
    icon,
    size = "lg",
    style,
    stopPropagation
}: {
    label: string;
    onClick: () => void;
    variant?: ButtonVariant;
    disabled?: boolean;
    busy?: boolean;
    icon?: IconName;
    size?: "lg" | "md" | "sm";
    style?: CSSProperties;
    /** Set when the button sits inside a tappable row, so it does not also fire it. */
    stopPropagation?: boolean;
}) {
    const height = size === "lg" ? 52 : size === "md" ? 44 : 36;
    const off = disabled || busy;

    // The gradient is reserved for the enabled primary action — one per screen.
    // A disabled primary drops to a flat surface rather than a dimmed gradient,
    // so "can't press this" reads instantly. `tinted` is the in-list action:
    // clearly the affordance, but it does not compete with a screen's primary.
    const skin: Record<ButtonVariant, CSSProperties> = {
        primary: off
            ? { background: C.surface3, color: C.textFaint }
            : { background: GRAD, color: C.onTint, boxShadow: "0 6px 20px " + C.tintGlow },
        tinted: { background: C.tintBg, color: C.tintSoft, border: "1px solid " + C.tintBorder },
        secondary: { background: C.surface2, color: C.text, border: "1px solid " + C.border },
        ghost: { background: "transparent", color: C.tintSoft },
        danger: { background: C.dangerBg, color: C.danger, border: "1px solid " + C.dangerBorder }
    };

    return (
        <Pressable
            onClick={onClick}
            disabled={off}
            scaleTo={0.98}
            stopPropagation={stopPropagation}
            style={{
                height,
                borderRadius: size === "sm" ? R.sm : R.md,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: S.sm,
                padding: "0 " + (size === "sm" ? S2.s12 : S.lg) + "px",
                ...T.bodyStrong,
                fontSize: size === "lg" ? 16 : size === "md" ? 15 : 13,
                boxSizing: "border-box",
                ...skin[variant],
                ...style
            }}
        >
            {busy ? <Spinner size={16} inline /> : icon ? <Icon name={icon} size={18} strokeWidth={2} /> : null}
            {label}
        </Pressable>
    );
}

// Onboarding progress. The old screens printed "STEP 1 OF 3" as tracked-out
// caps; a filled track shows the same thing without reading like a form.
export function StepHeader({
    step,
    total,
    title,
    subtitle,
    trailing
}: {
    step: number;
    total: number;
    title: string;
    subtitle?: string;
    trailing?: ReactNode;
}) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: S2.s10, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 4 }} role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={total}>
                {Array.from({ length: total }, (_, index) => (
                    <div
                        key={index}
                        style={{
                            flex: 1,
                            height: 3,
                            borderRadius: 2,
                            background: index < step ? C.tint : C.surface3,
                            transition: "background 240ms ease"
                        }}
                    />
                ))}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: S.sm }}>
                <h1 style={{ ...T.title, color: C.text, margin: 0 }}>{title}</h1>
                {trailing}
            </div>
            {subtitle ? <div style={{ ...T.callout, color: C.textMuted }}>{subtitle}</div> : null}
        </div>
    );
}

/** A labelled text field. 16px text, or mobile Safari zooms the page on focus. */
export function TextField({
    value,
    onChange,
    placeholder,
    label,
    type = "text",
    onEnter,
    autoFocus,
    multiline,
    maxLength
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    type?: "text" | "password" | "email";
    onEnter?: () => void;
    autoFocus?: boolean;
    multiline?: boolean;
    maxLength?: number;
}) {
    const [focused, setFocused] = useState(false);

    const shared: CSSProperties = {
        width: "100%",
        borderRadius: R.md,
        border: "1px solid " + (focused ? C.tintBorder : C.border),
        background: C.surface2,
        color: C.text,
        padding: multiline ? "12px 14px" : "0 14px",
        fontSize: 16,
        fontFamily: FONT.body,
        boxSizing: "border-box",
        transition: "border-color 140ms ease",
        resize: "none" as const
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: S2.s6, flexShrink: 0 }}>
            {/* Sentence case, so a field label never competes with the all-caps
                Section header directly above it. */}
            {label ? <label style={{ ...T.captionStrong, color: C.textMuted, paddingLeft: 2 }}>{label}</label> : null}
            {multiline ? (
                <textarea
                    value={value}
                    onChange={event => onChange(event.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    rows={3}
                    style={{ ...shared, minHeight: 88, lineHeight: 1.5 }}
                />
            ) : (
                <input
                    value={value}
                    type={type}
                    onChange={event => onChange(event.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onKeyDown={event => {
                        if (event.key === "Enter" && onEnter) {
                            onEnter();
                        }
                    }}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    autoFocus={autoFocus}
                    style={{ ...shared, height: 50 }}
                />
            )}
        </div>
    );
}

/** Search field with a leading glyph and a clear button once it has content. */
export function SearchField({
    value,
    onChange,
    placeholder
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: S.sm,
                height: 44,
                padding: "0 10px 0 12px",
                borderRadius: R.md,
                background: C.surface2,
                border: "1px solid " + C.border,
                flexShrink: 0
            }}
        >
            <Icon name="search" size={17} style={{ color: C.textFaint }} />
            <input
                value={value}
                onChange={event => onChange(event.target.value)}
                placeholder={placeholder}
                style={{
                    flex: 1,
                    minWidth: 0,
                    border: "none",
                    background: "transparent",
                    color: C.text,
                    fontSize: 16,
                    fontFamily: FONT.body
                }}
            />
            {value ? (
                <Pressable
                    onClick={() => onChange("")}
                    ariaLabel="Clear search"
                    style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: R.full, color: C.textFaint }}
                >
                    <Icon name="close" size={15} strokeWidth={2.2} />
                </Pressable>
            ) : null}
        </div>
    );
}

/** A small status/metadata pill. */
export function Chip({
    label,
    icon,
    tone = "neutral",
    onClick,
    selected
}: {
    label: ReactNode;
    icon?: IconName;
    tone?: "neutral" | "tint" | "cyan" | "gold" | "green";
    onClick?: () => void;
    selected?: boolean;
}) {
    const tones: Record<string, CSSProperties> = {
        neutral: { color: C.textDim, background: C.surface2, border: "1px solid " + C.border },
        tint: { color: C.tintSoft, background: C.tintBg, border: "1px solid " + C.tintBorder },
        cyan: { color: C.cyan, background: C.cyanBg, border: "1px solid " + C.cyanBorder },
        gold: { color: C.gold, background: "transparent", border: "1px solid " + C.border },
        green: { color: C.green, background: "transparent", border: "1px solid " + C.border }
    };

    const body = (
        <div
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 26,
                padding: "0 10px",
                borderRadius: R.sm,
                ...T.footnote,
                fontSize: 12,
                fontWeight: 600,
                boxSizing: "border-box",
                ...tones[selected ? "tint" : tone]
            }}
        >
            {icon ? <Icon name={icon} size={13} strokeWidth={2} /> : null}
            {label}
        </div>
    );

    if (!onClick) {
        return body;
    }
    return (
        <Pressable onClick={onClick} style={{ display: "inline-flex" }}>
            {body}
        </Pressable>
    );
}

/** A selectable option pill — day, time, room. Replaces the old `optionStyle`. */
export function OptionPill({
    label,
    sub,
    selected,
    onClick,
    disabled
}: {
    label: ReactNode;
    sub?: ReactNode;
    selected: boolean;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <Pressable
            onClick={onClick}
            disabled={disabled}
            scaleTo={0.96}
            style={{
                minHeight: LAYOUT.touch,
                padding: "8px 14px",
                borderRadius: R.md,
                border: "1px solid " + (selected ? C.tintBorder : C.border),
                background: selected ? C.tintBg : C.surface2,
                color: selected ? C.tintSoft : C.textDim,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                boxSizing: "border-box"
            }}
        >
            <span style={{ ...T.captionStrong, fontWeight: selected ? 800 : 600 }}>{label}</span>
            {sub ? <span style={{ ...T.footnote, fontSize: 10, opacity: 0.8 }}>{sub}</span> : null}
        </Pressable>
    );
}

/** A switch. One geometry for both platforms, per the identical-design brief. */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
    return (
        <Pressable
            onClick={() => onChange(!on)}
            ariaLabel={label}
            scaleTo={1}
            opacityTo={0.8}
            style={{
                width: 46,
                height: 28,
                borderRadius: R.full,
                background: on ? C.green : C.surface3,
                border: "1px solid " + (on ? "transparent" : C.border),
                position: "relative",
                flexShrink: 0,
                transition: "background 200ms ease",
                boxSizing: "border-box"
            }}
        >
            <div
                style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute",
                    top: 2,
                    left: on ? 21 : 2,
                    boxShadow: SHADOW.e1,
                    transition: "left 200ms cubic-bezier(.22,.61,.36,1)"
                }}
            />
        </Pressable>
    );
}

/** iOS/Material-neutral segmented control, for switching a pane within a screen. */
export function Segmented<K extends string>({
    items,
    value,
    onChange
}: {
    items: { key: K; label: string; dot?: boolean }[];
    value: K;
    onChange: (key: K) => void;
}) {
    return (
        <div
            style={{
                display: "flex",
                background: C.surface2,
                border: "1px solid " + C.border,
                borderRadius: R.md,
                padding: 3,
                gap: 2,
                flexShrink: 0
            }}
        >
            {items.map(item => {
                const on = item.key === value;
                return (
                    <Pressable
                        key={item.key}
                        onClick={() => onChange(item.key)}
                        scaleTo={1}
                        opacityTo={0.8}
                        style={{
                            flex: 1,
                            height: 34,
                            borderRadius: R.sm,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            background: on ? C.surfacePress : "transparent",
                            color: on ? C.text : C.textMuted,
                            ...T.captionStrong,
                            fontWeight: on ? 700 : 600,
                            transition: "background 160ms ease, color 160ms ease"
                        }}
                    >
                        {item.label}
                        {item.dot ? (
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.tint, flexShrink: 0 }} />
                        ) : null}
                    </Pressable>
                );
            })}
        </div>
    );
}

export function Avatar({
    name,
    photoUrl,
    seed,
    size = 40,
    ring
}: {
    name: string;
    photoUrl?: string | null;
    seed?: string | number;
    size?: number;
    ring?: boolean;
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
                fontFamily: FONT.body,
                fontSize: Math.round(size * 0.38),
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
                overflow: "hidden",
                boxShadow: ring ? "0 0 0 2px " + C.surface + ", 0 0 0 4px " + C.tint : "none"
            }}
        >
            {showPhoto ? (
                <img
                    src={photoUrl}
                    alt=""
                    onError={() => setBroken(true)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            ) : (
                initial(name)
            )}
        </div>
    );
}

/** Overlapping avatars, for "who is in this party". */
export function AvatarStack({
    people,
    max = 4,
    size = 28
}: {
    people: { name: string; photoUrl?: string | null; id?: string | number }[];
    max?: number;
    size?: number;
}) {
    const shown = people.slice(0, max);
    const extra = people.length - shown.length;

    return (
        <div style={{ display: "flex", alignItems: "center" }}>
            {shown.map((person, index) => (
                <div
                    key={person.id ?? person.name + index}
                    style={{
                        marginLeft: index === 0 ? 0 : -size * 0.32,
                        borderRadius: "50%",
                        boxShadow: "0 0 0 2px " + C.surface1,
                        zIndex: shown.length - index
                    }}
                >
                    <Avatar name={person.name} photoUrl={person.photoUrl} seed={person.id ?? person.name} size={size} />
                </div>
            ))}
            {extra > 0 ? (
                <div
                    style={{
                        marginLeft: -size * 0.32,
                        width: size,
                        height: size,
                        borderRadius: "50%",
                        background: C.surface3,
                        color: C.textDim,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        ...T.footnote,
                        fontSize: Math.round(size * 0.34),
                        fontWeight: 700,
                        boxShadow: "0 0 0 2px " + C.surface1
                    }}
                >
                    +{extra}
                </div>
            ) : null}
        </div>
    );
}

// Taste compatibility as a compact pill, for singers listed in a row.
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
                borderRadius: R.sm,
                padding: "2px 8px",
                ...T.footnote,
                fontSize: 11,
                fontWeight: 800,
                color: strong ? C.tintSoft : C.textMuted,
                border: "1px solid " + (strong ? C.tintBorder : C.border),
                background: strong ? C.tintBg : C.surface2
            }}
        >
            {pct}%
        </div>
    );
}

/** Star rating, drawn not typed. */
export function Rating({ value, size = 13, showValue = true }: { value: number; size?: number; showValue?: boolean }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: C.gold, flexShrink: 0 }}>
            <StarIcon size={size} />
            {showValue ? (
                <span style={{ ...T.footnote, fontSize: 12, fontWeight: 700, color: C.gold }}>{value.toFixed(1)}</span>
            ) : null}
        </div>
    );
}

/**
 * Five small stars filled to `value` — the read-only twin of StarInput, for
 * places like a review list where a single averaged number says too little.
 */
export function StarRow({ value, size = 13 }: { value: number; size?: number }) {
    return (
        <div
            style={{ display: "flex", gap: 1, flexShrink: 0 }}
            role="img"
            aria-label={value + " out of 5 stars"}
        >
            {[1, 2, 3, 4, 5].map(star => (
                <StarIcon key={star} size={size} color={star <= value ? C.gold : C.surface3} />
            ))}
        </div>
    );
}

/** Tappable 1–5 star input. Each star gets a full-size touch target. */
export function StarInput({ value, onChange }: { value: number; onChange: (stars: number) => void }) {
    return (
        <div style={{ display: "flex", gap: 2 }} role="radiogroup" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map(star => {
                const on = star <= value;
                return (
                    <Pressable
                        key={star}
                        onClick={() => onChange(star)}
                        ariaLabel={star + (star === 1 ? " star" : " stars")}
                        scaleTo={0.85}
                        style={{
                            width: LAYOUT.touch,
                            height: LAYOUT.touch,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: on ? C.gold : C.surface3,
                            transition: "color 140ms ease"
                        }}
                    >
                        <StarIcon size={26} filled={on} />
                    </Pressable>
                );
            })}
        </div>
    );
}

export function Toast({ message }: { message: string }) {
    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                position: "absolute",
                bottom: LAYOUT.tabBar + LAYOUT.safeBottom + S.md,
                left: LAYOUT.gutter,
                right: LAYOUT.gutter,
                background: C.surface3,
                border: "1px solid " + C.borderStrong,
                color: C.text,
                padding: "12px 16px",
                borderRadius: R.md,
                ...T.caption,
                textAlign: "center",
                animation: "km-toast-in 200ms cubic-bezier(.22,.61,.36,1)",
                boxShadow: SHADOW.e2,
                zIndex: 80
            }}
        >
            {message}
        </div>
    );
}

// Blocking confirm, styled as a native alert: centred, short, two actions,
// destructive one on the right and tinted.
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
                background: C.scrim,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: S.lg,
                zIndex: 90,
                animation: "km-fade 160ms ease"
            }}
        >
            <div
                onClick={event => event.stopPropagation()}
                style={{
                    width: "100%",
                    maxWidth: 300,
                    background: C.surface1,
                    border: "1px solid " + C.border,
                    borderRadius: R.xl,
                    padding: S.lg,
                    display: "flex",
                    flexDirection: "column",
                    gap: S.sm,
                    animation: "km-sheet-in 220ms cubic-bezier(.22,.61,.36,1)",
                    boxShadow: SHADOW.e3
                }}
            >
                <div style={{ ...T.heading, color: C.text, textAlign: "center" }}>{title}</div>
                <div style={{ ...T.caption, color: C.textDim, textAlign: "center" }}>{body}</div>
                <div style={{ display: "flex", gap: S.sm, marginTop: S.sm }}>
                    <Button label="Cancel" variant="secondary" size="md" onClick={onCancel} disabled={busy} style={{ flex: 1 }} />
                    <Button
                        label={confirmLabel}
                        variant="danger"
                        size="md"
                        onClick={onConfirm}
                        busy={busy}
                        style={{ flex: 1 }}
                    />
                </div>
            </div>
        </div>
    );
}

export function Spinner({ size = 24, inline }: { size?: number; inline?: boolean }) {
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                border: Math.max(2, Math.round(size / 12)) + "px solid " + C.border,
                borderTopColor: inline ? "currentColor" : C.tint,
                animation: "km-spin 800ms linear infinite",
                flexShrink: 0
            }}
        />
    );
}

/** Centred filler while a screen's first fetch is in flight. */
export function Loading({ label }: { label?: string }) {
    return (
        <div
            style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: S2.s12,
                padding: S.xl,
                color: C.textMuted,
                ...T.caption
            }}
        >
            <Spinner size={28} />
            {label ? <div style={{ textAlign: "center" }}>{label}</div> : null}
        </div>
    );
}

/** Placeholder blocks that hold a list's shape while it loads. */
export function Skeleton({ height = 76, radius = R.lg, count = 3 }: { height?: number; radius?: number; count?: number }) {
    return (
        <>
            {Array.from({ length: count }, (_, index) => (
                <div
                    key={index}
                    style={{
                        height,
                        borderRadius: radius,
                        background: "var(--km-skeleton)",
                        animation: "km-skeleton 1.4s ease-in-out infinite",
                        animationDelay: index * 120 + "ms",
                        flexShrink: 0
                    }}
                />
            ))}
        </>
    );
}

export function ErrorNote({ message }: { message: string }) {
    return (
        <div
            role="alert"
            style={{
                display: "flex",
                alignItems: "center",
                gap: S.sm,
                color: C.tintSoft,
                ...T.caption,
                background: C.tintBg,
                border: "1px solid " + C.tintBorder,
                borderRadius: R.md,
                padding: "10px 14px",
                flexShrink: 0
            }}
        >
            <Icon name="info" size={16} />
            <span style={{ flex: 1 }}>{message}</span>
        </div>
    );
}

/** The empty state for a list: an icon, a line, and ideally a way out. */
export function EmptyState({
    icon = "info",
    title,
    body,
    action
}: {
    icon?: IconName;
    title: string;
    body?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: S.sm,
                padding: S.xl + "px " + S.lg + "px",
                flexShrink: 0
            }}
        >
            <div
                style={{
                    width: 52,
                    height: 52,
                    borderRadius: R.lg,
                    background: C.surface2,
                    border: "1px solid " + C.border,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.textFaint,
                    marginBottom: S.xs
                }}
            >
                <Icon name={icon} size={24} />
            </div>
            <div style={{ ...T.bodyStrong, color: C.text }}>{title}</div>
            {body ? <div style={{ ...T.caption, color: C.textMuted, maxWidth: 250 }}>{body}</div> : null}
            {action ? <div style={{ marginTop: S.sm }}>{action}</div> : null}
        </div>
    );
}

/** The check affordance used by the song picker and invite list. */
export function CheckRing({ on, size = 22 }: { on: boolean; size?: number }) {
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: "50%",
                border: "2px solid " + (on ? C.tint : C.borderStrong),
                background: on ? C.tint : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.onTint,
                flexShrink: 0,
                boxSizing: "border-box",
                transition: "background 140ms ease, border-color 140ms ease"
            }}
        >
            {on ? <Icon name="check" size={size * 0.6} strokeWidth={3} /> : null}
        </div>
    );
}

/** A brand mark tile — the app icon, essentially. */
export function BrandMark({ size = 72, radius }: { size?: number; radius?: number }) {
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: radius ?? Math.round(size * 0.28),
                background: "linear-gradient(135deg,#FF3D8F,#8A2BE2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "0 10px 40px " + C.tintGlow,
                flexShrink: 0
            }}
        >
            <Icon name="mic" size={Math.round(size * 0.5)} solid />
        </div>
    );
}

export function Wordmark({ size = 19 }: { size?: number }) {
    return (
        <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: size, letterSpacing: -0.4 }}>
            Kara<span style={{ color: C.tint }}>Match</span>
        </span>
    );
}

// A read-only "here it is" map: every interaction is off, so it never traps a
// scroll or wanders off the venue.
const VENUE_ZOOM = 16;

const VENUE_PIN = L.divIcon({
    className: "",
    html:
        "<div style=\"width:14px;height:14px;border-radius:50%;background:#FF3D8F;" +
        "border:2px solid #fff;box-shadow:0 0 12px rgba(255,61,143,.9)\"></div>",
    iconSize: [14, 14],
    iconAnchor: [7, 7]
});

export function VenueMap({
    lat,
    lng,
    height = 132,
    active = true,
    radius = R.md
}: {
    lat: number;
    lng: number;
    height?: number;
    // False while the map sits in a hidden pane: Leaflet measures the container
    // on creation and reads 0x0 when it is display:none.
    active?: boolean;
    radius?: number;
}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const theme = useApp().theme;

    useEffect(() => {
        if (!containerRef.current) {
            return;
        }
        const map = L.map(containerRef.current, {
            center: [lat, lng],
            zoom: VENUE_ZOOM,
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            touchZoom: false,
            boxZoom: false,
            keyboard: false
        });
        L.tileLayer(tileUrl(theme), { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
        L.marker([lat, lng], { icon: VENUE_PIN, interactive: false, keyboard: false }).addTo(map);
        const tilePane = map.getPane("tilePane");
        if (tilePane) {
            tilePane.style.filter = tileFilter(theme);
        }
        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, [lat, lng, theme]);

    useEffect(() => {
        if (active) {
            mapRef.current?.invalidateSize();
        }
    }, [active]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
            <div
                style={{
                    height,
                    borderRadius: radius,
                    overflow: "hidden",
                    border: "1px solid " + C.border,
                    background: "var(--km-map-bg)"
                }}
            >
                <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
            </div>
            {/* OpenStreetMap and CARTO both require visible credit. */}
            <div style={{ ...T.footnote, fontSize: 9, color: C.textFaint }}>
                © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ color: C.textFaint }}>OpenStreetMap</a>
                {" · "}
                <a href="https://carto.com/attributions" target="_blank" rel="noreferrer" style={{ color: C.textFaint }}>CARTO</a>
            </div>
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

// "Today 21:00" / "Tomorrow 20:00" / "Sat 21:00"
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

/** Coarse "how long ago" for things that only need a rough age, like reviews. */
export function formatAgo(iso: string) {
    if (!iso) {
        return "";
    }
    const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days <= 0) {
        return "today";
    }
    if (days === 1) {
        return "yesterday";
    }
    if (days < 7) {
        return days + " days ago";
    }
    if (days < 60) {
        const weeks = Math.round(days / 7);
        return weeks === 1 ? "a week ago" : weeks + " weeks ago";
    }
    const months = Math.round(days / 30);
    return months + " months ago";
}

export function money(amount: number) {
    return "€" + amount;
}

export function plural(count: number, one: string, many: string) {
    return count + " " + (count === 1 ? one : many);
}
