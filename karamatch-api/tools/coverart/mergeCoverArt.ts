// Step 4 — fold the resolved cover art URLs into data/songs.json.
//
//     npx ts-node tools/coverart/mergeCoverArt.ts
//
// This is the only step that needs re-running day to day. coverart.tsv is
// committed, so nobody else has to download 7GB of MusicBrainz to get the art —
// they just run this. Re-run it after importCatalog.ts, which rewrites
// songs.json from the CSV and would otherwise drop the coverArt fields.
//
// Idempotent: running it twice produces the same file.

import fs from "fs";
import path from "path";
import { Song } from "../../types";

const SONGS_PATH = path.join(__dirname, "..", "..", "data", "songs.json");
const TSV_PATH = path.join(__dirname, "coverart.tsv");

function main() {
    if (!fs.existsSync(TSV_PATH)) {
        console.error("Missing " + TSV_PATH + " — run 01-extract.sh and 02-load.sh first.");
        process.exit(1);
    }

    const covers = new Map<string, string>();
    const tsv = fs.readFileSync(TSV_PATH, "utf-8");
    for (const line of tsv.split("\n")) {
        if (line.trim() === "") {
            continue;
        }
        const [id, url] = line.split("\t");
        if (id && url) {
            covers.set(id, url);
        }
    }

    const songs: Song[] = JSON.parse(fs.readFileSync(SONGS_PATH, "utf-8"));

    let matched = 0;
    const merged: Song[] = songs.map(song => {
        const url = covers.get(song.id);
        if (url === undefined) {
            // Leave the field off entirely rather than writing null, so the
            // absence reads the same as it did before this pipeline existed.
            const { coverArt, ...rest } = song;
            return rest as Song;
        }
        matched++;
        return { ...song, coverArt: url };
    });

    fs.writeFileSync(SONGS_PATH, JSON.stringify(merged));

    const pct = ((100 * matched) / songs.length).toFixed(1);
    console.log("Songs:    " + songs.length);
    console.log("With art: " + matched + " (" + pct + "%)");
    console.log("Written:  " + SONGS_PATH);
}

main();
