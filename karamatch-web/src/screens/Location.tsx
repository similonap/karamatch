import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api";
import { useApp } from "../AppContext";
import { C, LAYOUT, R, S, S2, SHADOW, T } from "../design/tokens";
import { Icon } from "../design/icons";
import { AppBar, BottomBar, Button, Pressable, SearchField, StepHeader, TILE_ATTRIBUTION, tileFilter, tileUrl } from "../ui";

// The seeded world sits around Antwerp, so a fresh pin lands somewhere
// already populated. Moving the map moves the pin for real: the API
// generates venues wherever it ends up.
const DEFAULT_LAT = 51.231;
const DEFAULT_LNG = 4.418;
const DEFAULT_ZOOM = 14;

const NOMINATIM = "https://nominatim.openstreetmap.org";

interface SearchResult {
    label: string;
    lat: number;
    lng: number;
}

function coordLabel(lat: number, lng: number) {
    return lat.toFixed(4) + ", " + lng.toFixed(4);
}

// Nominatim's display_name is the full postal chain; the first few parts are
// the only ones worth showing on a pin card.
function shortenPlace(displayName: string) {
    return displayName.split(",").slice(0, 3).join(",").trim();
}

export default function Location() {
    const app = useApp();
    const saved = app.me?.location;
    // Onboarding sends you on to the songs step; the profile editor comes back.
    const editing = app.editingLocation;
    const mapRef = useRef<L.Map | null>(null);
    const tileRef = useRef<L.TileLayer | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const reverseTimer = useRef<number | null>(null);
    const reverseAbort = useRef<AbortController | null>(null);

    const [lat, setLat] = useState(saved?.lat ?? DEFAULT_LAT);
    const [lng, setLng] = useState(saved?.lng ?? DEFAULT_LNG);
    // Frozen on first render: the map's opening camera. Later edits to the
    // saved location must not rebuild the map under the user.
    const [initialCentre] = useState<[number, number]>([saved?.lat ?? DEFAULT_LAT, saved?.lng ?? DEFAULT_LNG]);
    const [label, setLabel] = useState(saved?.label || coordLabel(saved?.lat ?? DEFAULT_LAT, saved?.lng ?? DEFAULT_LNG));
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [busy, setBusy] = useState(false);
    // True while the map is mid-pan, which lifts the pin off its shadow.
    const [dragging, setDragging] = useState(false);

    // Build the map once. The pin itself is a fixed overlay at the centre of
    // the viewport, so panning the map is what picks the location.
    useEffect(() => {
        if (!containerRef.current) {
            return;
        }
        const map = L.map(containerRef.current, {
            center: initialCentre,
            zoom: DEFAULT_ZOOM,
            zoomControl: false,
            attributionControl: true
        });
        tileRef.current = L.tileLayer(tileUrl(app.theme), { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
        const tilePane = map.getPane("tilePane");
        if (tilePane) {
            tilePane.style.filter = tileFilter(app.theme);
        }
        mapRef.current = map;

        function onMove() {
            const centre = map.getCenter();
            setLat(centre.lat);
            setLng(centre.lng);
            setDragging(false);
        }
        function onStart() {
            setDragging(true);
        }
        map.on("moveend", onMove);
        map.on("movestart", onStart);

        return () => {
            map.off("moveend", onMove);
            map.off("movestart", onStart);
            map.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialCentre]);

    // Swap the basemap in place on a theme change: rebuilding the map would
    // snap the camera back to initialCentre and lose wherever the user panned.
    useEffect(() => {
        tileRef.current?.setUrl(tileUrl(app.theme));
        const tilePane = mapRef.current?.getPane("tilePane");
        if (tilePane) {
            tilePane.style.filter = tileFilter(app.theme);
        }
    }, [app.theme]);

    // Ask Nominatim what sits under the pin, debounced so panning does not
    // hammer a free service (their policy allows about one call per second).
    useEffect(() => {
        if (reverseTimer.current !== null) {
            window.clearTimeout(reverseTimer.current);
        }
        reverseTimer.current = window.setTimeout(() => {
            reverseAbort.current?.abort();
            const controller = new AbortController();
            reverseAbort.current = controller;
            const url =
                NOMINATIM +
                "/reverse?format=jsonv2&zoom=16&lat=" +
                encodeURIComponent(lat) +
                "&lon=" +
                encodeURIComponent(lng);
            fetch(url, { signal: controller.signal })
                .then(response => response.json())
                .then((data: { display_name?: string }) => {
                    setLabel(data.display_name ? shortenPlace(data.display_name) : coordLabel(lat, lng));
                })
                .catch(() => {
                    // Offline or rate-limited: coordinates are still a valid label.
                    if (!controller.signal.aborted) {
                        setLabel(coordLabel(lat, lng));
                    }
                });
        }, 600);

        return () => {
            if (reverseTimer.current !== null) {
                window.clearTimeout(reverseTimer.current);
            }
        };
    }, [lat, lng]);

    async function search() {
        const term = query.trim();
        if (term === "") {
            return;
        }
        setSearching(true);
        try {
            const response = await fetch(NOMINATIM + "/search?format=jsonv2&limit=5&q=" + encodeURIComponent(term));
            const data: { display_name: string; lat: string; lon: string }[] = await response.json();
            setResults(
                data.map(item => ({
                    label: shortenPlace(item.display_name),
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon)
                }))
            );
            if (data.length === 0) {
                app.toast("No places found");
            }
        } catch {
            app.toast("Search is unavailable right now");
        } finally {
            setSearching(false);
        }
    }

    function pick(result: SearchResult) {
        setResults([]);
        setQuery("");
        mapRef.current?.flyTo([result.lat, result.lng], 16);
    }

    function useCurrentLocation() {
        if (!navigator.geolocation) {
            app.toast("Geolocation is not available");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            position => {
                mapRef.current?.flyTo([position.coords.latitude, position.coords.longitude], 16);
                app.toast("Pin moved to your location");
            },
            () => app.toast("Could not read your location")
        );
    }

    async function submit() {
        setBusy(true);
        try {
            await api.setLocation(lat, lng, label);
            await app.refreshMe();
            if (editing) {
                app.toast("Location updated");
                app.go("profile");
            } else {
                app.go("songs");
            }
        } catch (err) {
            app.toast((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            {editing ? (
                <AppBar title="Change location" onBack={() => app.go("profile")} />
            ) : (
                <div style={{ padding: S.md + "px " + LAYOUT.gutter + "px " + S2.s12 + "px", flexShrink: 0 }}>
                    <StepHeader
                        step={2}
                        total={3}
                        title="Drop your pin"
                        subtitle="Move the map to where you sing. We'll show karaoke nearby."
                    />
                </div>
            )}

            <div style={{ position: "relative", flex: 1, overflow: "hidden", minHeight: 0 }}>
                <div ref={containerRef} style={{ position: "absolute", inset: 0, background: "var(--km-map-bg)" }} />

                {/* Map chrome floats over the tiles on an opaque surface — a
                    translucent blur panel renders differently per platform. */}
                <div
                    style={{
                        position: "absolute",
                        top: S2.s12,
                        left: S2.s12,
                        right: S2.s12,
                        zIndex: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: S2.s6
                    }}
                >
                    <div style={{ display: "flex", gap: S.sm }}>
                        <div style={{ flex: 1, boxShadow: SHADOW.e2, borderRadius: R.md }}>
                            <SearchField value={query} onChange={setQuery} placeholder="Search a city or address" />
                        </div>
                        <Pressable
                            onClick={search}
                            ariaLabel="Search"
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: R.md,
                                background: C.surface1,
                                border: "1px solid " + C.border,
                                color: C.tintSoft,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                boxShadow: SHADOW.e2
                            }}
                        >
                            <Icon name={searching ? "clock" : "search"} size={19} strokeWidth={2} />
                        </Pressable>
                    </div>

                    {results.length > 0 ? (
                        <div
                            style={{
                                borderRadius: R.md,
                                border: "1px solid " + C.border,
                                background: C.surface1,
                                overflow: "hidden",
                                boxShadow: SHADOW.e2
                            }}
                        >
                            {results.map((result, index) => (
                                <Pressable
                                    key={result.lat + ":" + result.lng}
                                    onClick={() => pick(result)}
                                    scaleTo={1}
                                    opacityTo={0.6}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: S.sm,
                                        width: "100%",
                                        padding: "11px 14px",
                                        borderBottom: index === results.length - 1 ? "none" : "1px solid " + C.border,
                                        color: C.text,
                                        ...T.caption,
                                        boxSizing: "border-box"
                                    }}
                                >
                                    <Icon name="pin" size={15} style={{ color: C.textFaint }} />
                                    <span style={{ flex: 1, minWidth: 0 }}>{result.label}</span>
                                </Pressable>
                            ))}
                        </div>
                    ) : null}
                </div>

                {/* The centre pin. It lifts while you drag, which is the cue that
                    the map moves under a fixed pin rather than the other way. */}
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        zIndex: 450,
                        transform: "translate(-50%,-100%) translateY(" + (dragging ? -6 : 0) + "px)",
                        transition: "transform 180ms cubic-bezier(.22,.61,.36,1)",
                        pointerEvents: "none"
                    }}
                >
                    <div
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50% 50% 50% 0",
                            transform: "rotate(-45deg)",
                            background: "linear-gradient(135deg,#FF3D8F,#B23DFF)",
                            boxShadow: "0 6px 18px rgba(255,61,143,.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#fff", transform: "rotate(45deg)" }} />
                    </div>
                </div>
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        zIndex: 440,
                        transform: "translate(-50%,-2px)",
                        width: dragging ? 16 : 12,
                        height: 4,
                        borderRadius: "50%",
                        background: "rgba(0,0,0,.4)",
                        filter: "blur(2px)",
                        transition: "width 180ms ease",
                        pointerEvents: "none"
                    }}
                />

                <Pressable
                    onClick={useCurrentLocation}
                    ariaLabel="Use my current location"
                    style={{
                        position: "absolute",
                        bottom: S.md,
                        right: S2.s12,
                        zIndex: 500,
                        width: 46,
                        height: 46,
                        borderRadius: R.md,
                        border: "1px solid " + C.border,
                        background: C.surface1,
                        color: C.tintSoft,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: SHADOW.e2
                    }}
                >
                    <Icon name="locate" size={21} strokeWidth={2} />
                </Pressable>
            </div>

            <BottomBar>
                <div style={{ display: "flex", alignItems: "center", gap: S2.s12, minWidth: 0 }}>
                    <div
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: R.sm,
                            background: C.tintBg,
                            color: C.tintSoft,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0
                        }}
                    >
                        <Icon name="pin" size={18} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ ...T.footnote, color: C.textMuted }}>Selected location</div>
                        <div
                            style={{
                                ...T.bodyStrong,
                                color: C.text,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                            }}
                        >
                            {label}
                        </div>
                    </div>
                </div>
                <Button label={busy ? "Saving" : editing ? "Save location" : "Continue"} onClick={submit} busy={busy} />
            </BottomBar>
        </>
    );
}
