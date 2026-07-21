import { useApp } from "../AppContext";
import type { Tab } from "../AppContext";
import { C, LAYOUT, S, T } from "../design/tokens";
import { Icon } from "../design/icons";
import type { IconName } from "../design/icons";
import { Avatar, IconButton, Pressable, Transition, Wordmark } from "../ui";
import VenuesTab from "./tabs/VenuesTab";
import OpenPartiesTab from "./tabs/OpenPartiesTab";
import MatchTab from "./tabs/MatchTab";
import FriendsTab from "./tabs/FriendsTab";
import MineTab from "./tabs/MineTab";

const TABS: { key: Tab; label: string; icon: IconName }[] = [
    { key: "venues", label: "Venues", icon: "pin" },
    { key: "parties", label: "Parties", icon: "mic" },
    { key: "match", label: "Match", icon: "spark" },
    { key: "friends", label: "Friends", icon: "users" },
    { key: "mine", label: "Mine", icon: "calendar" }
];

export default function MainTabs() {
    const app = useApp();

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {/* App bar: wordmark left, actions right — one layout for both platforms. */}
            <div
                style={{
                    height: LAYOUT.appBar,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 " + S.sm + "px 0 " + LAYOUT.gutter + "px",
                    boxSizing: "border-box"
                }}
            >
                <Wordmark />
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <IconButton icon="bell" label="Notifications" badge={app.notifCount} onClick={() => app.go("notifs")} />
                    <Pressable
                        onClick={() => app.go("profile")}
                        ariaLabel="Your profile"
                        title="Your profile"
                        style={{
                            width: LAYOUT.touch,
                            height: LAYOUT.touch,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <Avatar
                            name={app.me?.name ?? "You"}
                            photoUrl={app.me?.photoUrl}
                            seed={app.me?.id ?? "me"}
                            size={32}
                        />
                    </Pressable>
                </div>
            </div>

            {/* Tab content cross-fades — tabs never slide, only stack pushes do. */}
            <Transition mode="fade" keyed={app.tab}>
                {app.tab === "venues" ? <VenuesTab /> : null}
                {app.tab === "parties" ? <OpenPartiesTab /> : null}
                {app.tab === "match" ? <MatchTab /> : null}
                {app.tab === "friends" ? <FriendsTab /> : null}
                {app.tab === "mine" ? <MineTab /> : null}
            </Transition>

            <TabBar current={app.tab} onSelect={app.goTab} />
        </div>
    );
}

// A flat, opaque, edge-to-edge tab bar: hairline on top, icon over label, the
// selected tab marked by a filled glyph and the tint colour.
//
// Explicitly *not* a floating translucent pill. That treatment is an iOS 26
// idiom, it renders differently wherever backdrop-filter is unsupported, and
// it would break the "identical on both platforms" requirement. This one
// composites the same everywhere.
function TabBar({ current, onSelect }: { current: Tab; onSelect: (tab: Tab) => void }) {
    return (
        <nav
            style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "stretch",
                height: LAYOUT.tabBar + LAYOUT.safeBottom,
                paddingBottom: LAYOUT.safeBottom,
                background: C.surface,
                borderTop: "1px solid " + C.border,
                boxSizing: "border-box"
            }}
        >
            {TABS.map(tab => {
                const on = current === tab.key;
                return (
                    <Pressable
                        key={tab.key}
                        onClick={() => onSelect(tab.key)}
                        ariaLabel={tab.label}
                        scaleTo={0.92}
                        opacityTo={0.6}
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 3,
                            color: on ? C.tint : C.textMuted,
                            transition: "color 160ms ease"
                        }}
                    >
                        <Icon name={tab.icon} size={24} solid={on} strokeWidth={1.8} />
                        <span
                            style={{
                                ...T.footnote,
                                fontSize: 10,
                                fontWeight: on ? 700 : 500,
                                letterSpacing: 0.1
                            }}
                        >
                            {tab.label}
                        </span>
                    </Pressable>
                );
            })}
        </nav>
    );
}
