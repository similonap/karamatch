#!/usr/bin/env bash
#
# Step 1 — download the MusicBrainz dumps and cut them down to the columns we need.
#
#     ./tools/coverart/01-extract.sh
#
# Why the dumps instead of the MusicBrainz web service: the catalog is 84k songs
# and /ws/2 is rate limited to 1 request/second, so resolving the whole thing
# over the API is a ~23 hour crawl that we would have to repeat every time the
# catalog changes. The dumps turn it into a one-off download and a local join.
#
# Note the split of responsibilities between MusicBrainz and the Cover Art
# Archive: the MB dump has no images in it at all. What it gives us is the
# release MBID, and the separate (tiny) cover-art-archive dump tells us which
# releases actually have a front cover and under which id. From those two the
# image URL is pure string construction — we never call the CAA API, and CAA
# image URLs are not rate limited anyway.
#
# Disk: ~7GB download + ~13GB extracted + ~4GB of slimmed TSVs. The extracted
# originals are deleted at the end of each table, so the peak is well under 30GB.

set -euo pipefail

WORK="${MB_WORK_DIR:-$HOME/.karamatch-mbdump}"
BASE="https://data.metabrainz.org/pub/musicbrainz/data/fullexport"

mkdir -p "$WORK"
cd "$WORK"

# Pin the export we resolve against so a re-run is reproducible. Override with
# MB_EXPORT=latest to pick up a newer twice-weekly dump.
EXPORT="${MB_EXPORT:-20260718-002132}"
if [ "$EXPORT" = "latest" ]; then
    EXPORT="$(curl -sSL --max-time 60 "$BASE/LATEST")"
fi
echo "[extract] using export $EXPORT"

download() {
    local file="$1"
    if [ -f "$WORK/$file.done" ]; then
        echo "[extract] $file already downloaded"
        return
    fi
    echo "[extract] downloading $file ..."
    # -C - resumes a partial file, so an interrupted 7GB download is cheap to retry.
    curl -sSL -C - --retry 5 --retry-delay 10 -o "$file" "$BASE/$EXPORT/$file"

    # A truncated or resumed-wrong archive otherwise fails somewhere deep inside
    # tar, 15 minutes in, with a much less obvious error than this one.
    echo "[extract] verifying $file ..."
    [ -f SHA256SUMS ] || curl -sSL --max-time 60 -o SHA256SUMS "$BASE/$EXPORT/SHA256SUMS"
    local want
    want="$(grep " \*$file\$" SHA256SUMS | cut -d' ' -f1)"
    local got
    got="$(shasum -a 256 "$file" | cut -d' ' -f1)"
    if [ "$want" != "$got" ]; then
        echo "[extract] checksum mismatch for $file — delete it and retry." >&2
        exit 1
    fi

    touch "$WORK/$file.done"
}

download "mbdump.tar.bz2"
download "mbdump-cover-art-archive.tar.bz2"

mkdir -p slim

# Pull only the tables that participate in the recording -> release join. The
# tar is a sequential bz2 stream so it gets decompressed once either way, but
# naming members keeps ~40 unrelated tables off the disk.
echo "[extract] unpacking core tables (this is the slow part, ~10-20 min) ..."
tar -xjf mbdump.tar.bz2 \
    mbdump/artist_credit \
    mbdump/recording \
    mbdump/track \
    mbdump/medium \
    mbdump/release \
    mbdump/release_group

echo "[extract] unpacking cover art tables ..."
tar -xjf mbdump-cover-art-archive.tar.bz2 \
    mbdump/cover_art_archive.cover_art \
    mbdump/cover_art_archive.cover_art_type

# The dumps are headerless, tab-separated, in exact CREATE TABLE column order
# (see admin/sql/CreateTables.sql in musicbrainz-server). We keep only the
# columns the match query touches, which drops ~4x of the bulk before it ever
# reaches Postgres. Safe to cut on tabs: COPY's text format escapes any literal
# tab inside a value as \t, so a raw tab is always a field separator.
#
#   table          kept columns
#   -------------- ------------------------------------------
#   artist_credit  id, name
#   recording      id, name, artist_credit
#   track          recording, medium
#   medium         id, release
#   release        id, gid, release_group, status
#   release_group  id, type
#   cover_art      id, release, ordering
#   cover_art_type id, type_id
slim() {
    local src="$1" dest="$2" fields="$3"
    echo "[extract] slimming $dest ..."
    cut -f"$fields" "mbdump/$src" > "slim/$dest.tsv"
    rm -f "mbdump/$src"
}

slim "artist_credit"                    "artist_credit"  "1,2"
slim "recording"                        "recording"      "1,3,4"
slim "track"                            "track"          "3,4"
slim "medium"                           "medium"         "1,2"
slim "release"                          "release"        "1,2,5,6"
slim "release_group"                    "release_group"  "1,5"
slim "cover_art_archive.cover_art"      "cover_art"      "1,2,5"
slim "cover_art_archive.cover_art_type" "cover_art_type" "1,2"

echo ""
echo "[extract] done. Slimmed tables in $WORK/slim:"
ls -lh slim
echo ""
echo "Next: ./tools/coverart/02-load.sh"
