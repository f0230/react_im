-- Persistent cache for Figma exported image URLs.
-- Serverless functions (Vercel) lose in-memory state between invocations;
-- this table provides a shared cache across all instances.
CREATE TABLE IF NOT EXISTS figma_image_cache (
  file_key  text NOT NULL,
  node_id   text NOT NULL,
  scale     text NOT NULL DEFAULT '2',
  format    text NOT NULL DEFAULT 'png',
  image_url text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (file_key, node_id, scale, format)
);

-- Only service role needs access (backend only, never exposed to frontend)
ALTER TABLE figma_image_cache ENABLE ROW LEVEL SECURITY;
