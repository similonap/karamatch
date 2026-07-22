// Dumps data/songs.json to a TSV that Postgres can COPY in.
//
// Called by 02-load.sh; not usually run by hand.
//
// Artist and title go out raw — 03-match.sql normalises both sides itself so
// that the catalog and MusicBrainz are guaranteed to be put through identical
// rules.

import fs from "fs";
import path from "path";
import { Song } from "../../types";

const SONGS_PATH = path.join(__dirname, "..", "..", "data", "songs.json");
const OUT_PATH = path.join(process.argv[2] || ".", "karafun.tsv");

// COPY's text format reads backslash as an escape character and tab/newline as
// structure, so any of them sitting in a song title would shift every following
// column. Escape them the way COPY expects to read them back.
function escape(value: string): string {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/\t/g, "\\t")
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");
}

function main() {
    const songs: Song[] = JSON.parse(fs.readFileSync(SONGS_PATH, "utf-8"));

    const lines = songs.map(song =>
        escape(song.id) + "\t" + escape(song.artist) + "\t" + escape(song.title)
    );

    fs.writeFileSync(OUT_PATH, lines.join("\n") + "\n");
    console.log("[export] " + songs.length + " songs -> " + OUT_PATH);
}

main();
