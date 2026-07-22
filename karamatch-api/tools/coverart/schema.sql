-- Minimal slice of the MusicBrainz schema — only the columns 01-extract.sh keeps.
--
-- Column order here must match the cut order in 01-extract.sh exactly, because
-- COPY reads headerless positional TSV.

DROP TABLE IF EXISTS artist_credit, recording, track, medium, release, release_group,
                     cover_art, cover_art_type CASCADE;

CREATE TABLE artist_credit (
    id            INTEGER,
    name          TEXT
);

CREATE TABLE recording (
    id            INTEGER,
    name          TEXT,
    artist_credit INTEGER
);

CREATE TABLE track (
    recording     INTEGER,
    medium        INTEGER
);

CREATE TABLE medium (
    id            INTEGER,
    release       INTEGER
);

CREATE TABLE release (
    id            INTEGER,
    gid           UUID,
    release_group INTEGER,
    status        INTEGER
);

CREATE TABLE release_group (
    id            INTEGER,
    type          INTEGER
);

CREATE TABLE cover_art (
    id            BIGINT,
    release       INTEGER,
    ordering      INTEGER
);

CREATE TABLE cover_art_type (
    id            BIGINT,
    type_id       INTEGER
);

-- The catalog side of the join, loaded from songs.json by 02-load.sh. Stored raw
-- and normalised by the same SQL functions the MusicBrainz side goes through —
-- if the two sides normalised differently the join would silently under-match.
DROP TABLE IF EXISTS karafun;
CREATE TABLE karafun (
    id            TEXT,
    artist        TEXT,
    title         TEXT
);
