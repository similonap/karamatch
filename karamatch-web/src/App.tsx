import { useCallback, useEffect, useRef, useState } from "react";
import { api, getToken, setToken } from "./api";
import type { Me } from "./api";
import { AppContext } from "./AppContext";
import type { AppApi, PayContext, Screen, Tab, ThemeName } from "./AppContext";
import { PhoneFrame, Toast, Loading } from "./ui";
import Welcome from "./screens/Welcome";
import SignIn from "./screens/SignIn";
import Register from "./screens/Register";
import Location from "./screens/Location";
import SongPicker from "./screens/SongPicker";
import MainTabs from "./screens/MainTabs";
import VenueDetail from "./screens/VenueDetail";
import Pay from "./screens/Pay";
import PartyRoom from "./screens/PartyRoom";
import Notifications from "./screens/Notifications";
import InviteFriends from "./screens/InviteFriends";
import Rate from "./screens/Rate";
import Profile from "./screens/Profile";
import UserProfile from "./screens/UserProfile";

const THEME_KEY = "karamatch.theme";

// A stored choice wins; otherwise follow whatever the device is set to.
function initialTheme(): ThemeName {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") {
        return stored;
    }
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export default function App() {
    const [me, setMe] = useState<Me | null>(null);
    const [theme, setThemeState] = useState<ThemeName>(initialTheme);
    const [booting, setBooting] = useState(Boolean(getToken()));
    const [screen, setScreen] = useState<Screen>("welcome");
    const [tab, setTab] = useState<Tab>("venues");
    const [venueId, setVenueId] = useState<string | null>(null);
    const [partyId, setPartyId] = useState<string | null>(null);
    const [ratePartyId, setRatePartyId] = useState<string | null>(null);
    const [pay, setPay] = useState<PayContext | null>(null);
    const [profileUsername, setProfileUsername] = useState<string | null>(null);
    const [profileBack, setProfileBack] = useState<Screen>("app");
    const [editingLocation, setEditingLocation] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [notifCount, setNotifCount] = useState(0);
    const toastTimer = useRef<number | undefined>(undefined);

    const toast = useCallback((message: string) => {
        window.clearTimeout(toastTimer.current);
        setToastMessage(message);
        toastTimer.current = window.setTimeout(() => setToastMessage(null), 2200);
    }, []);

    // Every colour is a CSS variable keyed off this attribute, so setting it on
    // <html> reskins the app — nothing below has to re-render to follow along.
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    const setTheme = useCallback((next: ThemeName) => {
        localStorage.setItem(THEME_KEY, next);
        setThemeState(next);
    }, []);

    const refreshMe = useCallback(async () => {
        try {
            const fresh = await api.me();
            setMe(fresh);
            return fresh;
        } catch {
            return null;
        }
    }, []);

    const refreshNotifCount = useCallback(() => {
        api.notifications()
            .then(list => setNotifCount(list.length))
            .catch(() => setNotifCount(0));
    }, []);

    // Resume a stored session: a token alone decides where onboarding drops you.
    useEffect(() => {
        if (!getToken()) {
            return;
        }
        api.me()
            .then(fresh => {
                setMe(fresh);
                if (!fresh.location) {
                    setScreen("location");
                } else if (fresh.favoriteSongIds.length < 3) {
                    setScreen("songs");
                } else {
                    setScreen("app");
                }
            })
            .catch(() => {
                setToken(null);
                setScreen("welcome");
            })
            .finally(() => setBooting(false));
    }, []);

    // Keep the bell badge current while signed in.
    useEffect(() => {
        if (!me || !me.location) {
            return;
        }
        refreshNotifCount();
        const timer = window.setInterval(refreshNotifCount, 20000);
        return () => window.clearInterval(timer);
    }, [me, refreshNotifCount]);

    const logout = useCallback(() => {
        setToken(null);
        setMe(null);
        setScreen("welcome");
        setTab("venues");
        setNotifCount(0);
    }, []);

    const value: AppApi = {
        me,
        setMe,
        refreshMe,
        screen,
        tab,
        // Any navigation away drops the location screen back to onboarding mode.
        go: (next: Screen) => {
            setEditingLocation(false);
            setScreen(next);
        },
        goTab: (next: Tab) => {
            setTab(next);
            setScreen("app");
        },
        venueId,
        openVenue: (id: string) => {
            setVenueId(id);
            setScreen("venue");
        },
        partyId,
        openRoom: (id: string) => {
            setPartyId(id);
            setScreen("room");
        },
        ratePartyId,
        openRate: (id: string) => {
            setRatePartyId(id);
            setScreen("rate");
        },
        profileUsername,
        openProfile: (username: string) => {
            setProfileUsername(username);
            // Hopping profile → profile keeps the original screen as the way back.
            if (screen !== "user") {
                setProfileBack(screen);
            }
            setScreen("user");
        },
        closeProfile: () => setScreen(profileBack),
        pay,
        startPay: (context: PayContext) => {
            setPay(context);
            setScreen("pay");
        },
        editingLocation,
        openLocationEditor: () => {
            setEditingLocation(true);
            setScreen("location");
        },
        theme,
        setTheme,
        notifCount,
        refreshNotifCount,
        toast,
        logout
    };

    return (
        <AppContext.Provider value={value}>
            <PhoneFrame>
                {booting ? <Loading label="Signing you back in…" /> : <CurrentScreen screen={screen} />}
                {toastMessage ? <Toast message={toastMessage} /> : null}
            </PhoneFrame>
        </AppContext.Provider>
    );
}

function CurrentScreen({ screen }: { screen: Screen }) {
    switch (screen) {
        case "welcome":
            return <Welcome />;
        case "signin":
            return <SignIn />;
        case "register":
            return <Register />;
        case "location":
            return <Location />;
        case "songs":
            return <SongPicker />;
        case "app":
            return <MainTabs />;
        case "venue":
            return <VenueDetail />;
        case "pay":
            return <Pay />;
        case "room":
            return <PartyRoom />;
        case "notifs":
            return <Notifications />;
        case "invitefriends":
            return <InviteFriends />;
        case "rate":
            return <Rate />;
        case "profile":
            return <Profile />;
        case "user":
            return <UserProfile />;
        default:
            return <Welcome />;
    }
}
