-- Leads Table for Agent Lead Generation
-- This table stores leads from users who want to connect with real estate agents

CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    city VARCHAR(100) NOT NULL,
    municipality VARCHAR(100) NOT NULL,
    neighborhood VARCHAR(255),
    budget_range VARCHAR(50) NOT NULL,
    timeline VARCHAR(50) NOT NULL,
    property_type VARCHAR(100),
    source VARCHAR(100) NOT NULL, -- 'roi_calculator', 'map', 'ownership_calculator', etc.
    context_data JSONB, -- Store additional context like calculator values, property details, etc.
    country VARCHAR(100), -- Country detected from IP address
    country_code VARCHAR(2), -- ISO 2-letter country code (e.g., 'US', 'MX', 'CA')
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'closed', 'lost')),
    assigned_agent_email VARCHAR(255), -- Email of agent who should receive this lead
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_agent ON leads(assigned_agent_email);
CREATE INDEX IF NOT EXISTS idx_leads_country ON leads(country_code);

-- Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read all leads
CREATE POLICY "Admins can view all leads" ON leads 
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM users WHERE email IN (
                '43uy75@gmail.com',
                'marcusding1@gmail.com'
            )
        )
    );

-- Policy: Anyone can insert leads (public form)
CREATE POLICY "Anyone can create leads" ON leads 
    FOR INSERT WITH CHECK (true);

-- Policy: Admins can update leads
CREATE POLICY "Admins can update leads" ON leads 
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT id FROM users WHERE email IN (
                '43uy75@gmail.com',
                'marcusding1@gmail.com'
            )
        )
    );

