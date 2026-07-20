import { createContext, useContext } from "react";
import type { Me } from "./api";

export type Screen =
    | "welcome"
    | "signin"
    | "register"
    | "location"
    | "songs"
    | "app"
    | "venue"
    | "pay"
    | "room"
    | "notifs"
    | "invitefriends"
    | "rate"
    | "profile"
    | "user";

export type Tab = "venues" | "parties" | "match" | "friends" | "mine";

// What the payment screen is settling: a party you host in full, or your share.
export interface PayContext {
    kind: "host" | "join";
    partyId: string;
    amount: number;
    hostUsername?: string;
}

export interface AppApi {
    me: Me | null;
    refreshMe: () => Promise<Me | null>;
    setMe: (me: Me | null) => void;

    screen: Screen;
    tab: Tab;
    go: (screen: Screen) => void;
    goTab: (tab: Tab) => void;

    // Screen parameters.
    venueId: string | null;
    openVenue: (id: string) => void;
    partyId: string | null;
    openRoom: (id: string) => void;
    ratePartyId: string | null;
    openRate: (id: string) => void;
    // A singer's profile can be opened from any screen, so closeProfile goes
    // back to wherever you tapped instead of always to the tabs.
    profileUsername: string | null;
    openProfile: (username: string) => void;
    closeProfile: () => void;
    pay: PayContext | null;
    startPay: (context: PayContext) => void;
    // The location screen doubles as onboarding step 2 and as the editor
    // reached from the profile; this says which one is on screen.
    editingLocation: boolean;
    openLocationEditor: () => void;

    notifCount: number;
    refreshNotifCount: () => void;

    toast: (message: string) => void;
    logout: () => void;
}

export const AppContext = createContext<AppApi | null>(null);

export function useApp() {
    const value = useContext(AppContext);
    if (!value) {
        throw new Error("useApp must be used inside <App>");
    }
    return value;
}
