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