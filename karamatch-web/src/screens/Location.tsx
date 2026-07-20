import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api";
import { useApp } from "../AppContext";
import { C, primaryButton, roundBack } from "../theme";
import { TILE_ATTRIBUTION, TILE_URL } from "../ui";

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
        L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
        L.control.zoom({ position: "topright" }).addTo(map);
        mapRef.current = map;

        function onMove() {
            const centre = map.getCenter();
            setLat(centre.lat);
            setLng(centre.lng);
        }
        map.on("moveend", onMove);

        return () => {
            map.off("moveend", onMove);
            map.remove();
            mapRef.current = null;
        };
    }, [initialCentre]);

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

    async function search(event: React.FormEvent) {
        event.preventDefault();
        const term = query.trim();
        if (term === "") {
            return;
        }
        setSearching(true);
        try {
            const response = await fetch(
                NOMINATIM + "/search?format=jsonv2&limit=5&q=" + encodeURIComponent(term)
            );
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
                app.toast("Location updated ✓");
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
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 0 0", overflow: "hidden" }}>
            <div style={{ padding: "0 24px", display: "flex", flexDirection: "column", gap: 8 }}>
                {editing ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button
                            onClick={() => app.go("profile")}
                            style={{ ...roundBack, width: 36, height: 36, fontSize: 16 }}
                        >
                            ‹
                        </button>
                        <div style={{ fontFamily: "Unbounded, sans-serif", fontSize: 20, fontWeight: 700 }}>
                            Change location
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ color: C.pink, fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>
                            STEP 2 OF 3
                        </div>
                        <div
                            style={{
                                fontFamily: "Unbounded, sans-serif",
                                fontSize: 26,
                                fontWeight: 700,
                                lineHeight: 1.2
                            }}
                        >
                            Drop your pin
                        </div>
                    </>
                )}
                <div style={{ color: C.textDim, fontSize: 14, lineHeight: 1.5 }}>
                    Move the map to place the pin where you sing. We'll show karaoke nearby.
                </div>
            </div>

            <div style={{ position: "relative", flex: 1, margin: "16px 0 0", overflow: "hidden" }}>
                <div ref={containerRef} style={{ position: "absolute", inset: 0, background: "#0B1220" }} />

                <form
                    onSubmit={search}
                    style={{
                        position: "absolute",
                        top: 12,
                        left: 12,
                        right: 70,
                        zIndex: 500,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6
                    }}
                >
                    <div style={{ display: "flex", gap: 8 }}>
                        <input
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            placeholder="Search a city or address"
                            style={{
                                flex: 1,
                                height: 44,
                                borderRadius: 14,
                                border: "1px solid rgba(255,255,255,.14)",
                                background: "rgba(11,18,32,.9)",
                                color: C.text,
                                padding: "0 14px",
                                fontSize: 15,
                                fontFamily: "Outfit, sans-serif",
                                boxSizing: "border-box",
                                backdropFilter: "blur(8px)"
                            }}
                        />
                        <button
                            type="submit"
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 14,
                                border: "1px solid rgba(41,224,255,.4)",
                                background: "rgba(11,18,32,.9)",
                                color: C.cyan,
                                fontSize: 17,
                                cursor: "pointer",
                                flexShrink: 0,
                                backdropFilter: "blur(8px)"
                            }}
                        >
                            {searching ? "…" : "⌕"}
                        </button>
                    </div>

                    {results.length > 0 && (
                        <div
                            style={{
                                borderRadius: 14,
                                border: "1px solid rgba(255,255,255,.12)",
                                background: "rgba(11,18,32,.95)",
                                overflow: "hidden",
                                backdropFilter: "blur(8px)"
                            }}
                        >
                            {results.map(result => (
                                <button
                                    key={result.lat + ":" + result.lng}
                                    type="button"
                                    onClick={() => pick(result)}
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        textAlign: "left",
                                        border: "none",
                                        borderBottom: "1px solid rgba(255,255,255,.07)",
                                        background: "transparent",
                                        color: C.text,
                                        padding: "10px 14px",
                                        fontSize: 14,
                                        fontFamily: "Outfit, sans-serif",
                                        cursor: "pointer"
                                    }}
                                >
                                    {result.label}
                                </button>
                            ))}
                        </div>
                    )}
                </form>

                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        zIndex: 450,
                        transform: "translate(-50%,-100%)",
                        pointerEvents: "none",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center"
                    }}
                >
                    <div
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50% 50% 50% 0",
                            transform: "rotate(-45deg)",
                            background: "linear-gradient(135deg,#FF3D8F,#B23DFF)",
                            boxShadow: "0 6px 18px rgba(255,61,143,.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <div
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                background: C.bg,
                                transform: "rotate(45deg)"
                            }}
                        />
                    </div>
                </div>
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        zIndex: 450,
                        transform: "translate(-50%,-2px)",
                        width: 14,
                        height: 5,
                        borderRadius: "50%",
                        background: "rgba(0,0,0,.5)",
                        filter: "blur(1px)",
                        pointerEvents: "none"
                    }}
                />

                <button
                    onClick={useCurrentLocation}
                    style={{
                        position: "absolute",
                        bottom: 26,
                        right: 16,
                        zIndex: 500,
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        border: "1px solid rgba(41,224,255,.4)",
                        background: "rgba(11,18,32,.85)",
                        color: C.cyan,
                        fontSize: 20,
                        cursor: "pointer",
                        backdropFilter: "blur(8px)"
                    }}
                >
                    ◎
                </button>
            </div>

            <div
                style={{
                    padding: "16px 24px 36px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    background: "linear-gradient(180deg,transparent,#0A0512 30%)"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,.12)",
                        background: "rgba(255,255,255,.05)",
                        padding: "12px 16px"
                    }}
                >
                    <div
                        style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: "rgba(255,61,143,.14)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 17,
                            flexShrink: 0
                        }}
                    >
                        📍
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: C.textMuted }}>Selected location</div>
                        <div
                            style={{
                                fontWeight: 700,
                                fontSize: 16,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                            }}
                        >
                            {label}
                        </div>
                        <div style={{ fontSize: 12, color: C.textFaint }}>{coordLabel(lat, lng)}</div>
                    </div>
                </div>
                <button onClick={submit} style={primaryButton(!busy)}>
                    {busy ? "Saving…" : editing ? "Save location" : "Continue"}
                </button>
            </div>
        </div>
    );
}
