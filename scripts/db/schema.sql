CREATE EXTENSION IF NOT EXISTS postgis;

-- Kandidatų sodybų lentelė
CREATE TABLE IF NOT EXISTS sodyba (
  id              SERIAL PRIMARY KEY,
  osm_id          BIGINT UNIQUE,          -- OpenStreetMap node/way ID
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  geom            GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED,

  -- Metaduomenys
  adresas         TEXT,
  savivaldybe     TEXT,
  seniunija       TEXT,
  pastato_metai   INT,                    -- statybos metai jei žinomi
  saltinis        TEXT NOT NULL,          -- 'osm', 'rc', 'kvr'

  -- Geoportal.lt tikrinimo rezultatai
  checked_at      TIMESTAMPTZ,
  miskas_m        INT,                    -- atstumas iki miško (metrais)
      -- NULL = netikrinta, 0 = sklypo viduje
  upelis_m        INT,                    -- atstumas iki upelio/ežero
  natura2000      BOOLEAN,
  saugomos_terit  BOOLEAN,
  kultura_paveldas BOOLEAN,
  szns_raw        JSONB,                  -- pilnas geoportal atsakymas

  -- Vienkiemio score
  kaimynai_200m   INT,                    -- pastatų skaičius 200m spinduliu
  kaimynai_500m   INT,

  -- AI analizė (vėliau)
  ai_analyzed_at  TIMESTAMPTZ,
  ai_medžiai      BOOLEAN,
  ai_vaismedžiai  BOOLEAN,
  ai_bukle        TEXT,                   -- 'gera', 'vidutine', 'bloga'
  ai_raw          JSONB,

  -- Bendras įvertinimas (0-100)
  score           INT,
  score_details   JSONB,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sodyba_geom_idx ON sodyba USING GIST(geom);
CREATE INDEX IF NOT EXISTS sodyba_score_idx ON sodyba(score DESC);
CREATE INDEX IF NOT EXISTS sodyba_checked_idx ON sodyba(checked_at);

-- Paieškos istorija (kas buvo žiūrėta)
CREATE TABLE IF NOT EXISTS search_log (
  id        SERIAL PRIMARY KEY,
  lat       DOUBLE PRECISION,
  lng       DOUBLE PRECISION,
  filtrai   JSONB,
  rezultatai INT,
  at        TIMESTAMPTZ DEFAULT NOW()
);
