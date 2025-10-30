-- PropTrenz Database Schema for Supabase
-- This file contains all the SQL commands to set up the database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Locations Table (Hierarchical: National -> States -> Municipalities -> Metro Zones)
CREATE TABLE locations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type VARCHAR(50) NOT NULL CHECK (type IN ('national', 'state', 'municipality', 'metro_zone')),
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100),
    parent_id UUID REFERENCES locations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Residential Property Types
CREATE TABLE residential_property_types (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name_en VARCHAR(100) NOT NULL,
    display_name_es VARCHAR(100) NOT NULL,
    display_name_zh VARCHAR(100) NOT NULL,
    description_en TEXT,
    description_es TEXT,
    description_zh TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default property types
INSERT INTO residential_property_types (name, display_name_en, display_name_es, display_name_zh) VALUES
('nueva', 'New Properties', 'Propiedades Nuevas', '新房'),
('usada', 'Used Properties', 'Propiedades Usadas', '二手房'),
('casa_sola', 'Single Family Homes', 'Casas Individuales', '独栋房屋'),
('condominio', 'Condominiums', 'Condominios', '公寓');

-- Residential Price Index Data
CREATE TABLE residential_price_indices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    location_id UUID NOT NULL REFERENCES locations(id),
    property_type_id UUID REFERENCES residential_property_types(id),
    quarter INTEGER NOT NULL CHECK (quarter >= 1 AND quarter <= 4),
    year INTEGER NOT NULL CHECK (year >= 2005),
    index_value DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(location_id, property_type_id, quarter, year)
);

-- Users Table (for authentication and personalization)
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Watchlists
CREATE TABLE user_watchlists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id),
    property_type_id UUID REFERENCES residential_property_types(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, location_id, property_type_id)
);

-- Data Upload Logs (for admin CSV uploads)
CREATE TABLE data_upload_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    records_processed INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    error_message TEXT,
    uploaded_by UUID REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_state ON locations(state);
CREATE INDEX idx_locations_parent ON locations(parent_id);
CREATE INDEX idx_price_indices_location ON residential_price_indices(location_id);
CREATE INDEX idx_price_indices_property_type ON residential_price_indices(property_type_id);
CREATE INDEX idx_price_indices_year_quarter ON residential_price_indices(year, quarter);
CREATE INDEX idx_watchlists_user ON user_watchlists(user_id);
CREATE INDEX idx_watchlists_location ON user_watchlists(location_id);

-- Row Level Security (RLS) policies
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE residential_property_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE residential_price_indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_upload_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for locations and price data
CREATE POLICY "Public read access for locations" ON locations FOR SELECT USING (true);
CREATE POLICY "Public read access for property types" ON residential_property_types FOR SELECT USING (true);
CREATE POLICY "Public read access for price indices" ON residential_price_indices FOR SELECT USING (true);

-- User-specific policies for watchlists
CREATE POLICY "Users can manage their own watchlists" ON user_watchlists 
    FOR ALL USING (auth.uid() = user_id);

-- Admin policies for data uploads
CREATE POLICY "Admins can manage data uploads" ON data_upload_logs 
    FOR ALL USING (auth.uid() IN (
        SELECT id FROM users WHERE email IN (
            '43uy75@gmail.com',
            'marcusding1@gmail.com'
        )
    ));

-- Functions for data processing
CREATE OR REPLACE FUNCTION get_price_trend(
    p_location_id UUID,
    p_property_type_id UUID DEFAULT NULL,
    p_years_back INTEGER DEFAULT 20
)
RETURNS TABLE (
    year INTEGER,
    quarter INTEGER,
    index_value DECIMAL(10,2),
    growth_rate DECIMAL(10,4)
) AS $$
BEGIN
    RETURN QUERY
    WITH price_data AS (
        SELECT 
            rpi.year,
            rpi.quarter,
            rpi.index_value,
            LAG(rpi.index_value) OVER (ORDER BY rpi.year, rpi.quarter) as prev_value
        FROM residential_price_indices rpi
        WHERE rpi.location_id = p_location_id
        AND (p_property_type_id IS NULL OR rpi.property_type_id = p_property_type_id)
        AND rpi.year >= (EXTRACT(YEAR FROM NOW()) - p_years_back)
        ORDER BY rpi.year, rpi.quarter
    )
    SELECT 
        pd.year,
        pd.quarter,
        pd.index_value,
        CASE 
            WHEN pd.prev_value IS NOT NULL AND pd.prev_value > 0 
            THEN ((pd.index_value - pd.prev_value) / pd.prev_value) * 100
            ELSE 0
        END as growth_rate
    FROM price_data pd;
END;
$$ LANGUAGE plpgsql;

-- Function to get location hierarchy
CREATE OR REPLACE FUNCTION get_location_hierarchy(p_location_id UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    type VARCHAR(50),
    state VARCHAR(100),
    level INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE location_tree AS (
        SELECT l.id, l.name, l.type, l.state, 0 as level
        FROM locations l
        WHERE l.id = p_location_id
        
        UNION ALL
        
        SELECT l.id, l.name, l.type, l.state, lt.level + 1
        FROM locations l
        JOIN location_tree lt ON l.parent_id = lt.id
    )
    SELECT * FROM location_tree ORDER BY level DESC;
END;
$$ LANGUAGE plpgsql;
