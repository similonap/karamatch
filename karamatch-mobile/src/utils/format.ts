// Ported verbatim from karamatch-web/src/ui.tsx — pure date/number
// formatting, nothing DOM-specific to adapt.

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
