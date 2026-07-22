-- Step 3 — resolve each catalog song to a Cover Art Archive front cover.
--
-- The chain is:
--   recording (song title + artist credit)
--     -> track -> medium -> release        (which releases the song appears on)
--     -> release has a front cover in CAA   (which of those we can show)
--
-- Output is a two column TSV: karafun id, image URL.

\set ON_ERROR_STOP on
\timing on

CREATE EXTENSION IF NOT EXISTS unaccent;

-- ---------------------------------------------------------------------------
-- Normalisation
-- ---------------------------------------------------------------------------
-- Karafun and MusicBrainz disagree constantly on punctuation, accents, case and
-- trailing qualifiers, so nothing matches on raw strings. Both sides go through
-- these two functions and the join happens on the result.

-- Titles: "Don't Stop Believin'" -> "dont stop believin",
--         "Shallow (Radio Edit)" -> "shallow".
-- The trailing bracket strip is what earns most of the extra matches: Karafun
-- and MB pick different qualifiers for the same song ("(Live)", "[Remastered]",
-- "(2019 Version)") and none of them change which cover we want.
CREATE OR REPLACE FUNCTION norm_title(txt TEXT) RETURNS TEXT AS $$
    SELECT btrim(regexp_replace(
        regexp_replace(
            lower(unaccent(coalesce(txt, ''))),
            '\s*[\(\[][^\)\]]*[\)\]]\s*$', '', 'g'),
        '[^a-z0-9]+', ' ', 'g'));
$$ LANGUAGE SQL;

-- Artists: additionally drop featured-artist tails, since Karafun credits
-- "Eminem" where MB credits "Eminem feat. Rihanna" (or vice versa), and drop a
-- leading article — the two catalogues disagree constantly about whether the
-- band is "The Carpenters" or "Carpenters". Stripping it on both sides makes
-- the disagreement moot.
CREATE OR REPLACE FUNCTION norm_artist(txt TEXT) RETURNS TEXT AS $$
    SELECT btrim(regexp_replace(
        regexp_replace(
            regexp_replace(
                regexp_replace(
                    lower(unaccent(coalesce(txt, ''))),
                    '\s*[\(\[][^\)\]]*[\)\]]\s*$', '', 'g'),
                '\s+(feat|ft|featuring|with)[\.\s].*$', '', 'g'),
            '^\s*the\s+', '', 'g'),
        '[^a-z0-9]+', ' ', 'g'));
$$ LANGUAGE SQL;

-- ---------------------------------------------------------------------------
-- Front covers
-- ---------------------------------------------------------------------------
-- A release can carry many images (back, booklet, medium, spine...). art_type 1
-- is "Front", which is the only one worth showing in a song list. Where a
-- release has several fronts, `ordering` is the order the editors put them in,
-- so the first one is the primary.
--
-- Deliberately NOT filtering on thumb_500_filesize: that column is NULL on the
-- majority of (older) rows even though CAA serves a 500px thumbnail for them,
-- so filtering on it would throw away most of the archive.
DROP TABLE IF EXISTS front_art;
CREATE TABLE front_art AS
SELECT DISTINCT ON (ca.release)
       ca.release,
       ca.id AS cover_id
FROM cover_art ca
JOIN cover_art_type cat ON cat.id = ca.id AND cat.type_id = 1
ORDER BY ca.release, ca.ordering, ca.id;

CREATE INDEX ON front_art (release);
ANALYZE front_art;

-- ---------------------------------------------------------------------------
-- Narrow to artists we actually care about
-- ---------------------------------------------------------------------------
-- recording x track is ~35M x ~50M rows. Restricting to the ~15k artist names
-- in the catalog first turns the big join into a small one, which is the
-- difference between minutes and hours.
DROP TABLE IF EXISTS karafun_norm;
CREATE TABLE karafun_norm AS
SELECT id,
       norm_artist(artist) AS a,
       norm_title(title)   AS t
FROM karafun;

CREATE INDEX ON karafun_norm (a, t);
ANALYZE karafun_norm;

DROP TABLE IF EXISTS ac_match;
CREATE TABLE ac_match AS
SELECT ac.id, norm_artist(ac.name) AS a
FROM artist_credit ac
WHERE norm_artist(ac.name) IN (SELECT DISTINCT a FROM karafun_norm WHERE a <> '');

CREATE INDEX ON ac_match (id);
CREATE INDEX ON ac_match (a);
ANALYZE ac_match;

-- ---------------------------------------------------------------------------
-- Candidate releases per (artist, title)
-- ---------------------------------------------------------------------------
-- Narrow on title as well as artist before touching track/medium/release. A
-- prolific artist has thousands of recordings across hundreds of releases, and
-- expanding all of them through the track join only to discard the titles we
-- never asked about is where this query would otherwise spend its time.
DROP TABLE IF EXISTS rec_match;
CREATE TABLE rec_match AS
SELECT r.id, am.a, norm_title(r.name) AS t
FROM ac_match am
JOIN recording r ON r.artist_credit = am.id
WHERE norm_title(r.name) IN (SELECT DISTINCT t FROM karafun_norm WHERE t <> '');

CREATE INDEX ON rec_match (id);
ANALYZE rec_match;

DROP TABLE IF EXISTS candidate;
CREATE TABLE candidate AS
SELECT rm.a,
       rm.t,
       rel.gid            AS release_gid,
       fa.cover_id,
       -- Ranking signals, best first. An official studio album is the cover a
       -- singer expects to see; compilations and bootlegs are the fallback.
       (rel.status = 1)    AS is_official,
       (rg.type = 1)       AS is_album,
       rel.id              AS release_id
FROM rec_match rm
JOIN track t         ON t.recording = rm.id
JOIN medium m        ON m.id = t.medium
JOIN release rel     ON rel.id = m.release
JOIN release_group rg ON rg.id = rel.release_group
JOIN front_art fa    ON fa.release = rel.id;

CREATE INDEX ON candidate (a, t);
ANALYZE candidate;

-- Collapse to one release per (artist, title). release_id as the final tiebreak
-- keeps the choice deterministic, so re-running against the same dump produces
-- byte-identical output.
DROP TABLE IF EXISTS best;
CREATE TABLE best AS
SELECT DISTINCT ON (a, t) a, t, release_gid, cover_id
FROM candidate
ORDER BY a, t, is_official DESC, is_album DESC, release_id;

CREATE INDEX ON best (a, t);
ANALYZE best;

-- ---------------------------------------------------------------------------
-- Output
-- ---------------------------------------------------------------------------
\echo ''
\echo 'Coverage:'
SELECT count(*)                                        AS catalog_songs,
       count(b.release_gid)                            AS matched,
       round(100.0 * count(b.release_gid) / count(*), 1) AS pct
FROM karafun_norm k
LEFT JOIN best b ON b.a = k.a AND b.t = k.t;

\copy (SELECT k.id, 'https://coverartarchive.org/release/' || b.release_gid || '/' || b.cover_id || '-500.jpg' FROM karafun_norm k JOIN best b ON b.a = k.a AND b.t = k.t ORDER BY k.id) TO '/out/coverart.tsv'
