import { useApp } from "../AppContext";
import type { Tab } from "../AppContext";
import { C, GRAD } from "../theme";
import { Avatar } from "../ui";
import VenuesTab from "./tabs/VenuesTab";
import OpenBoxesTab from "./tabs/OpenBoxesTab";
import MatchTab from "./tabs/MatchTab";
import FriendsTab from "./tabs/FriendsTab";
import MineTab from "./tabs/MineTab";

const TABS: { key: Tab; label: string }[] = [
    { key: "venues", label: "Venues" },
    { key: "boxes", label: "Boxes" },
    { key: "match", label: "Match" },
    { key: "friends", label: "Friends" },
    { key: "mine", label: "Mine" }
];

export default function MainTabs() {
    const app = useApp();

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div
                style={{
                    padding: "14px 24px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexShrink: 0
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                        onClick={() => app.go("profile")}
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            border: "1px solid rgba(255,61,143,.4)",
                            background: "transparent",
                            padding: 0,
                            cursor: "pointer",
                            overflow: "hidden"
                        }}
                        title="Edit profile"
                    >
                        <Avatar
                            name={app.me?.name ?? "You"}
                            photoUrl={app.me?.photoUrl}
                            seed={app.me?.id ?? "me"}
                            size={36}
                            fontSize={14}
                        />
                    </button>
                    <button
                        onClick={() => app.go("notifs")}
                        style={{
                            position: "relative",
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            border: "1px solid rgba(255,255,255,.14)",
                            background: "rgba(255,255,255,.06)",
                            color: C.text,
                            fontSize: 16,
                            cursor: "pointer"
                        }}
                        title="Notifications"
                    >
                        🔔
                        {app.notifCount > 0 ? (
                            <span
                                style={{
                                    position: "absolute",
                                    top: -4,
                                    right: -4,
                                    minWidth: 18,
                                    height: 18,
                                    borderRadius: 999,
                                    background: C.pink,
                                    color: "#fff",
                                    fontSize: 11,
                                    fontWeight: 800,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    padding: "0 4px",
                                    boxShadow: "0 0 12px rgba(255,61,143,.6)"
                                }}
                            >
                                {app.notifCount}
                            </span>
                        ) : null}
                    </button>
                </div>
                <div style={{ fontFamily: "Unbounded, sans-serif", fontWeight: 900, fontSize: 19 }}>
                    Kara<span style={{ color: C.pink }}>Match</span>
                </div>
                <div style={{ width: 38 }} />
            </div>

            {app.tab === "venues" ? <VenuesTab /> : null}
            {app.tab === "boxes" ? <OpenBoxesTab /> : null}
            {app.tab === "match" ? <MatchTab /> : null}
            {app.tab === "friends" ? <FriendsTab /> : null}
            {app.tab === "mine" ? <MineTab /> : null}

            <div
                style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: "10px 20px 30px",
                    background: "linear-gradient(180deg,transparent,#08040F 30%)",
                    display: "flex",
                    gap: 6
                }}
            >
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        background: "rgba(255,255,255,.06)",
                        border: "1px solid rgba(255,255,255,.1)",
                        borderRadius: 20,
                        padding: 6,
                        backdropFilter: "blur(14px)"
                    }}
                >
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => app.goTab(tab.key)}
                            style={{
                                flex: 1,
                                height: 46,
                                border: "none",
                                borderRadius: 15,
                                background: app.tab === tab.key ? GRAD : "transparent",
                                color: app.tab === tab.key ? "#fff" : C.textMuted,
                                fontFamily: "Outfit, sans-serif",
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: "pointer",
                                padding: 0
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
