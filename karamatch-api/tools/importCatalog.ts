// One-off converter: karafuncatalog.csv -> data/songs.json
//
// Run it whenever the catalog CSV changes:
//
//     npx ts-node tools/importCatalog.ts
//
// This rewrites songs.json from scratch, which drops the coverArt fields added
// by tools/coverart. Follow it with:
//
//     npx ts-node tools/coverart/mergeCoverArt.ts
//
// (that step reads a committed TSV — it does not need the MusicBrainz dump).
//
// The output is what seed() inserts, so everything expensive (CSV parsing,
// picking the curated pool) happens here rather than at server start.
//
// Two things the app needs out of the catalog:
//
//  1. The whole thing, searchable — 80k+ songs so a user can find whatever
//     they actually want to sing.
//  2. A small, genre-balanced "curated" pool. Matchmaking scores singers on
//     how many favourites they share, which only means anything if everyone
//     is drawing from the same modest set of songs. See CURATED_PER_GENRE.

import fs from "fs";
import path from "path";
import { Song } from "../types";
import { NON_TASTE_GENRES } from "../generators";

const CSV_PATH = path.join(__dirname, "..", "..", "karafuncatalog.csv");
const OUT_PATH = path.join(__dirname, "..", "data", "songs.json");

// How many songs per genre land in the curated pool. This is the dial that
// decides whether the Match tab feels alive: two singers of the same genre
// each pick 4-7 favourites from this many candidates, so at 30 they share a
// song about half the time. Raise it and matches go quiet.
const CURATED_PER_GENRE = 30;

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

// The catalog is semicolon-delimited with optionally quoted fields, and the
// quoted ones contain commas ("Blues,Country,Soul,Rock"), so a split(";") does
// not survive it. Standard state machine: "" inside a quoted field is a
// literal quote.
function parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let field = "";
    let quoted = false;
    let index = 0;

    while (index < line.length) {
        const character = line[index];
        if (quoted) {
            if (character === "\"") {
                if (line[index + 1] === "\"") {
                    field += "\"";
                    index++;
                } else {
                    quoted = false;
                }
            } else {
                field += character;
            }
        } else if (character === "\"") {
            quoted = true;
        } else if (character === ";") {
            fields.push(field);
            field = "";
        } else {
            field += character;
        }
        index++;
    }
    fields.push(field);
    return fields;
}

interface CatalogRow {
    id: string;
    title: string;
    artist: string;
    genre: string[];
    dateAdded: string;
}

// Columns: Id;Title;Artist;Year;Duo;Explicit;"Date Added";Styles;Languages
function toRow(line: string): CatalogRow | null {
    const fields = parseCsvLine(line);
    if (fields.length < 8) {
        return null;
    }
    const id = fields[0].trim();
    const title = fields[1].trim();
    const artist = fields[2].trim();
    if (id === "" || title === "") {
        return null;
    }
    const genre = fields[7]
        .split(",")
        .map(style => style.trim())
        .filter(style => style !== "");
    return { id, title, artist, genre, dateAdded: fields[6].trim() };
}

// ---------------------------------------------------------------------------
// Curation
// ---------------------------------------------------------------------------

// A song is filed under its first style tag — that is the one the catalog
// leads with, and the same convention getSongs() uses to group the discovery
// list.
//
// Within a genre we take the earliest additions to the catalog. Karafun built
// the catalog hits-first, so "added in 2008" is a decent stand-in for the
// popularity signal the CSV does not carry. Deterministic either way, so
// re-running this produces the same pool.
//
// Songs carrying at least MIN_TAGS styles go first. Matchmaking scores half of
// itself on the cosine similarity of two singers' genre profiles, and a profile
// is built from the tags of their favourites — so a pool of singly-tagged songs
// gives everyone a thin, disjoint profile and every cross-genre match rounds to
// zero. Multi-tagged songs ("Rock, Pop, Love, Soundtrack") are what let a Rock
// fan and a Pop fan register as partly compatible.
const MIN_TAGS = 3;

function pickCurated(rows: CatalogRow[]): Set<string> {
    const byGenre = new Map<string, CatalogRow[]>();
    for (const row of rows) {
        const primary = row.genre[0];
        if (primary === undefined || NON_TASTE_GENRES.includes(primary)) {
            continue;
        }
        const group = byGenre.get(primary) || [];
        group.push(row);
        byGenre.set(primary, group);
    }

    const curated = new Set<string>();
    for (const [genre, group] of byGenre) {
        group.sort((a, b) => {
            const aRich = a.genre.length >= MIN_TAGS;
            const bRich = b.genre.length >= MIN_TAGS;
            if (aRich !== bRich) {
                return aRich ? -1 : 1;
            }
            if (a.dateAdded !== b.dateAdded) {
                return a.dateAdded < b.dateAdded ? -1 : 1;
            }
            // Ties broken on id so the pool never depends on sort stability.
            return a.id.localeCompare(b.id);
        });
        const chosen = group.slice(0, CURATED_PER_GENRE);
        for (const row of chosen) {
            curated.add(row.id);
        }
        const rich = chosen.filter(row => row.genre.length >= MIN_TAGS).length;
        console.log("  " + genre.padEnd(26) + chosen.length + " of " + String(group.length).padEnd(6) + " (" + rich + " multi-tagged)");
    }
    return curated;
}

// ---------------------------------------------------------------------------

function main() {
    const csv = fs.readFileSync(CSV_PATH, "utf-8");
    const lines = csv.split(/\r?\n/);

    const rows: CatalogRow[] = [];
    let skipped = 0;
    // Line 0 is the header.
    for (let index = 1; index < lines.length; index++) {
        if (lines[index].trim() === "") {
            continue;
        }
        const row = toRow(lines[index]);
        if (row) {
            rows.push(row);
        } else {
            skipped++;
        }
    }

    console.log("Curated pool (" + CURATED_PER_GENRE + " per genre):");
    const curated = pickCurated(rows);

    const songs: Song[] = rows.map(row => ({
        id: row.id,
        title: row.title,
        artist: row.artist,
        genre: row.genre,
        curated: curated.has(row.id)
    }));

    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(songs));

    const untagged = songs.filter(song => song.genre.length === 0).length;
    console.log("");
    console.log("Parsed:   " + songs.length + " songs (" + skipped + " unparseable, " + untagged + " untagged)");
    console.log("Curated:  " + curated.size);
    console.log("Written:  " + OUT_PATH);
}

main();
