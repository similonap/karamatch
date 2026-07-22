#!/usr/bin/env bash
#
# Step 2 — load the slimmed tables into a throwaway Postgres and run the match.
#
#     ./tools/coverart/02-load.sh
#
# Postgres runs in Docker and is only ever used here, at build time. Nothing in
# the app talks to it — the app stays on MongoDB. The end product is a plain
# TSV, which is why this pipeline adds no npm dependencies at all.
#
# Drop the container when you are done:
#
#     docker rm -f karamatch-mb && rm -rf ~/.karamatch-mbdump

set -euo pipefail

WORK="${MB_WORK_DIR:-$HOME/.karamatch-mbdump}"
HERE="$(cd "$(dirname "$0")" && pwd)"
CONTAINER="karamatch-mb"
PORT="${MB_PORT:-55432}"

mkdir -p "$WORK/out"

if [ ! -f "$WORK/slim/recording.tsv" ]; then
    echo "Missing $WORK/slim — run ./tools/coverart/01-extract.sh first." >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# Container
# ---------------------------------------------------------------------------
if [ -z "$(docker ps -q -f name="^${CONTAINER}$")" ]; then
    if [ -n "$(docker ps -aq -f name="^${CONTAINER}$")" ]; then
        echo "[load] starting existing container ..."
        docker start "$CONTAINER" > /dev/null
    else
        echo "[load] creating container ..."
        # The memory settings matter: the recording/track join and the index
        # builds are the whole runtime here, and at defaults (4MB work_mem)
        # Postgres spills them to disk and takes hours instead of minutes.
        #
        # --shm-size is not optional. Docker gives a container 64MB of /dev/shm
        # by default, and parallel workers allocate their hash tables there, so
        # the big join dies with "could not resize shared memory segment".
        docker run -d --name "$CONTAINER" \
            -e POSTGRES_PASSWORD=mb \
            -e POSTGRES_DB=mb \
            -e POSTGRES_USER=mb \
            -v "$WORK/slim:/slim:ro" \
            -v "$WORK/out:/out" \
            -p "$PORT:5432" \
            --shm-size=1g \
            postgres:16 \
            -c shared_buffers=2GB \
            -c work_mem=512MB \
            -c maintenance_work_mem=2GB \
            -c max_wal_size=8GB \
            -c synchronous_commit=off \
            -c fsync=off > /dev/null
    fi
fi

echo "[load] waiting for Postgres ..."
until docker exec "$CONTAINER" pg_isready -U mb -d mb > /dev/null 2>&1; do
    sleep 1
done

psql_run() {
    docker exec -i "$CONTAINER" psql -U mb -d mb -v ON_ERROR_STOP=1 "$@"
}

# ---------------------------------------------------------------------------
# Schema + data
# ---------------------------------------------------------------------------
echo "[load] creating schema ..."
psql_run -q < "$HERE/schema.sql"

echo "[load] exporting catalog ..."
(cd "$HERE/../.." && npx ts-node tools/coverart/exportCatalog.ts "$WORK/slim")

# COPY runs server-side straight off the mounted directory, so the TSVs never
# travel through a client connection.
for table in artist_credit recording track medium release release_group cover_art cover_art_type karafun; do
    echo "[load] copying $table ..."
    psql_run -q -c "COPY $table FROM '/slim/${table}.tsv'"
done

echo "[load] indexing ..."
psql_run -q -c "CREATE INDEX ON recording (artist_credit);"
psql_run -q -c "CREATE INDEX ON track (recording);"
psql_run -q -c "CREATE INDEX ON medium (id);"
psql_run -q -c "CREATE INDEX ON release (id);"
psql_run -q -c "CREATE INDEX ON release_group (id);"
psql_run -q -c "ANALYZE;"

# ---------------------------------------------------------------------------
# Match
# ---------------------------------------------------------------------------
echo "[load] matching ..."
psql_run < "$HERE/03-match.sql"

cp "$WORK/out/coverart.tsv" "$HERE/coverart.tsv"

echo ""
echo "[load] wrote $HERE/coverart.tsv ($(wc -l < "$HERE/coverart.tsv" | tr -d ' ') matches)"
echo ""
echo "Next: npx ts-node tools/coverart/mergeCoverArt.ts"
