-- Insights storage and refresh logic

-- Table to store precomputed homepage insights
CREATE TABLE IF NOT EXISTS insights (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    national_yoy NUMERIC,
    national_qoq NUMERIC,
    top_states JSONB,
    top_municipalities JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS and read access
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
-- Make policies idempotent for re-runs
DROP POLICY IF EXISTS "Public read access for insights" ON insights;
DROP POLICY IF EXISTS "Authenticated can insert insights" ON insights;
DROP POLICY IF EXISTS "Authenticated can update insights" ON insights;
CREATE POLICY "Public read access for insights" ON insights FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert insights" ON insights FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update insights" ON insights FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Function to compute YoY and QoQ for national and top movers
CREATE OR REPLACE FUNCTION refresh_insights()
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_national UUID;
  v_national_yoy NUMERIC := 0;
  v_national_qoq NUMERIC := 0;
  v_top_states JSONB := '[]'::jsonb;
  v_top_munis JSONB := '[]'::jsonb;
BEGIN
  -- national id
  SELECT id INTO v_national FROM locations WHERE type = 'national' LIMIT 1;

  -- National YoY and QoQ based on last available quarter using window lag
  WITH nat AS (
    SELECT year, quarter, index_value,
           LAG(index_value, 1) OVER (ORDER BY year, quarter) AS prev1,
           LAG(index_value, 4) OVER (ORDER BY year, quarter) AS prev4,
           ROW_NUMBER() OVER (ORDER BY year DESC, quarter DESC) AS rn
    FROM residential_price_indices
    WHERE location_id = v_national
      AND property_type_id IS NULL
  )
  SELECT 
    CASE WHEN prev4 IS NOT NULL AND prev4 > 0 THEN ((index_value - prev4)/prev4)*100 ELSE 0 END,
    CASE WHEN prev1 IS NOT NULL AND prev1 > 0 THEN ((index_value - prev1)/prev1)*100 ELSE 0 END
  INTO v_national_yoy, v_national_qoq
  FROM nat WHERE rn = 1;

  -- Top movers states YoY using lag(4) at the latest point per state
  WITH state_dedup AS (
    -- Deduplicate states by NAME (there may be multiple location_ids for the same state)
    SELECT l.name, r.year, r.quarter, MAX(r.index_value) AS index_value
    FROM residential_price_indices r
    JOIN locations l ON l.id = r.location_id
    WHERE l.type = 'state' AND r.property_type_id IS NULL
    GROUP BY l.name, r.year, r.quarter
  ),
  state_series AS (
    SELECT name, year, quarter, index_value,
           LAG(index_value, 4) OVER (PARTITION BY name ORDER BY year, quarter) AS prev4,
           ROW_NUMBER() OVER (PARTITION BY name ORDER BY year DESC, quarter DESC) AS rn
    FROM state_dedup
  ),
  state_yoy AS (
    SELECT DISTINCT ON (name) name,
           CASE WHEN prev4 IS NOT NULL AND prev4 > 0 THEN ((index_value - prev4)/prev4)*100 ELSE NULL END AS yoy
    FROM state_series
    WHERE prev4 IS NOT NULL
    ORDER BY name, rn
  ),
  state_top AS (
    SELECT * FROM state_yoy WHERE yoy IS NOT NULL ORDER BY yoy DESC LIMIT 6
  )
  SELECT jsonb_agg(jsonb_build_object('id', NULL, 'name', name, 'growthYoY', yoy) ORDER BY yoy DESC)
  INTO v_top_states
  FROM state_top;

  -- Top movers municipalities YoY using lag(4)
  WITH muni_dedup AS (
    -- Deduplicate municipalities by (state, name)
    SELECT l.state, l.name, r.year, r.quarter, MAX(r.index_value) AS index_value
    FROM residential_price_indices r
    JOIN locations l ON l.id = r.location_id
    WHERE l.type = 'municipality' AND r.property_type_id IS NULL
    GROUP BY l.state, l.name, r.year, r.quarter
  ),
  muni_series AS (
    SELECT state, name, year, quarter, index_value,
           LAG(index_value, 4) OVER (PARTITION BY state, name ORDER BY year, quarter) AS prev4,
           ROW_NUMBER() OVER (PARTITION BY state, name ORDER BY year DESC, quarter DESC) AS rn
    FROM muni_dedup
  ),
  muni_yoy AS (
    SELECT DISTINCT ON (state, name) state, name,
           CASE WHEN prev4 IS NOT NULL AND prev4 > 0 THEN ((index_value - prev4)/prev4)*100 ELSE NULL END AS yoy
    FROM muni_series
    WHERE prev4 IS NOT NULL
    ORDER BY state, name, rn
  ),
  muni_top AS (
    SELECT * FROM muni_yoy WHERE yoy IS NOT NULL ORDER BY yoy DESC LIMIT 6
  )
  SELECT jsonb_agg(jsonb_build_object('id', NULL, 'name', name, 'state', state, 'growthYoY', yoy) ORDER BY yoy DESC)
  INTO v_top_munis
  FROM muni_top;

  -- Upsert insights
  INSERT INTO insights (id, national_yoy, national_qoq, top_states, top_municipalities, updated_at)
  VALUES (1, v_national_yoy, v_national_qoq, COALESCE(v_top_states, '[]'::jsonb), COALESCE(v_top_munis, '[]'::jsonb), NOW())
  ON CONFLICT (id)
  DO UPDATE SET national_yoy = EXCLUDED.national_yoy,
                national_qoq = EXCLUDED.national_qoq,
                top_states = EXCLUDED.top_states,
                top_municipalities = EXCLUDED.top_municipalities,
                updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION refresh_insights() TO authenticated, anon;

-- Ensure trigger function is present and idempotent
CREATE OR REPLACE FUNCTION on_upload_completed_refresh_insights()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM refresh_insights();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_insights_on_upload ON data_upload_logs;
CREATE TRIGGER trg_refresh_insights_on_upload
AFTER UPDATE ON data_upload_logs
FOR EACH ROW
EXECUTE FUNCTION on_upload_completed_refresh_insights();

-- Trigger to refresh insights when an upload is marked completed
CREATE OR REPLACE FUNCTION on_upload_completed_refresh_insights()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM refresh_insights();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_insights_on_upload ON data_upload_logs;
CREATE TRIGGER trg_refresh_insights_on_upload
AFTER UPDATE ON data_upload_logs
FOR EACH ROW
EXECUTE FUNCTION on_upload_completed_refresh_insights();


