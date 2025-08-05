-- LinkPipe Database Schema
-- This file initializes the PostgreSQL database with the required tables

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create links table
CREATE TABLE IF NOT EXISTS links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    url TEXT NOT NULL,
    domain VARCHAR(255) DEFAULT 'localhost:8001',
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255), 
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),
    description TEXT,
    tags TEXT[], -- Array of tags
    is_active BOOLEAN DEFAULT true,
    click_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_links_slug ON links(slug);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at);
CREATE INDEX IF NOT EXISTS idx_links_is_active ON links(is_active);
CREATE INDEX IF NOT EXISTS idx_links_expires_at ON links(expires_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_links_updated_at
    BEFORE UPDATE ON links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO links (slug, url, description, tags, utm_source, utm_medium, utm_campaign) 
VALUES 
    ('example', 'https://example.com', 'Example link for testing', ARRAY['test', 'example'], 'newsletter', 'email', 'welcome'),
    ('github', 'https://github.com', 'GitHub homepage', ARRAY['code', 'development'], 'social', 'organic', 'sharing')
ON CONFLICT (slug) DO NOTHING;

-- Settings table for storing application configuration
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
('domains', '["localhost:8001", "short.example.com"]', 'Available domains for short links'),
('utm_sources', '["newsletter", "social", "website", "blog", "email", "direct", "referral", "organic", "paid", "advertising"]', 'Predefined UTM source options'),
('utm_mediums', '["email", "social", "cpc", "banner", "affiliate", "referral", "direct", "organic", "print", "video", "display"]', 'Predefined UTM medium options'),
('utm_campaigns', '["spring_sale", "summer_promotion", "black_friday", "product_launch", "webinar", "newsletter_signup", "holiday_campaign"]', 'Predefined UTM campaign options'),
('utm_contents', '["header_link", "footer_link", "sidebar_ad", "main_cta", "secondary_cta", "hero_banner", "text_link"]', 'Predefined UTM content options')
ON CONFLICT (key) DO NOTHING;