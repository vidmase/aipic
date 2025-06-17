-- Admin Access Control and Quota Management Schema

-- Add is_premium column to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_tier TEXT DEFAULT 'free';

-- Create user_tiers table for flexible tier management
CREATE TABLE IF NOT EXISTS public.user_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create image_models table
CREATE TABLE IF NOT EXISTS public.image_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  provider TEXT NOT NULL DEFAULT 'fal-ai',
  is_active BOOLEAN DEFAULT TRUE,
  default_parameters JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tier_model_access table for model access control
CREATE TABLE IF NOT EXISTS public.tier_model_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_id UUID REFERENCES public.user_tiers(id) ON DELETE CASCADE NOT NULL,
  model_id UUID REFERENCES public.image_models(id) ON DELETE CASCADE NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tier_id, model_id)
);

-- Create quota_limits table for usage limits
CREATE TABLE IF NOT EXISTS public.quota_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_id UUID REFERENCES public.user_tiers(id) ON DELETE CASCADE NOT NULL,
  model_id UUID REFERENCES public.image_models(id) ON DELETE CASCADE NOT NULL,
  daily_limit INTEGER DEFAULT 3,
  monthly_limit INTEGER DEFAULT 90,
  hourly_limit INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tier_id, model_id)
);

-- Create usage_tracking table for monitoring user usage
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  model_id UUID REFERENCES public.image_models(id) ON DELETE CASCADE NOT NULL,
  images_generated INTEGER DEFAULT 1,
  date DATE DEFAULT CURRENT_DATE,
  hour INTEGER DEFAULT EXTRACT(HOUR FROM NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, model_id, date, hour)
);

-- Create admin_settings table for global settings
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default user tiers
INSERT INTO public.user_tiers (name, display_name, description) VALUES
  ('free', 'Free', 'Basic tier with limited access'),
  ('premium', 'Premium', 'Full access to all features'),
  ('admin', 'Admin', 'Administrative access')
ON CONFLICT (name) DO NOTHING;

-- Insert default image models
INSERT INTO public.image_models (model_id, display_name, description, provider) VALUES
  ('fal-ai/fast-sdxl', 'Fast SDXL', 'Fast Stable Diffusion XL model', 'fal-ai'),
  ('fal-ai/ideogram/v2', 'Ideogram v2', 'Ideogram text-to-image model v2', 'fal-ai'),
  ('fal-ai/ideogram/v3', 'Ideogram v3', 'Latest Ideogram text-to-image model', 'fal-ai'),
  ('fal-ai/flux/schnell', 'Flux Schnell', 'Fast Flux model for quick generation', 'fal-ai'),
  ('fal-ai/flux/dev', 'Flux Dev', 'Development version of Flux model', 'fal-ai')
ON CONFLICT (model_id) DO NOTHING;

-- Set up default tier access (free tier gets limited models)
WITH tier_free AS (SELECT id FROM public.user_tiers WHERE name = 'free'),
     tier_premium AS (SELECT id FROM public.user_tiers WHERE name = 'premium'),
     tier_admin AS (SELECT id FROM public.user_tiers WHERE name = 'admin'),
     models AS (SELECT id, model_id FROM public.image_models)
INSERT INTO public.tier_model_access (tier_id, model_id, is_enabled)
SELECT 
  t.id as tier_id,
  m.id as model_id,
  CASE 
    WHEN t.name = 'free' AND m.model_id IN ('fal-ai/fast-sdxl', 'fal-ai/ideogram/v2') THEN TRUE
    WHEN t.name IN ('premium', 'admin') THEN TRUE
    ELSE FALSE
  END as is_enabled
FROM (SELECT id, name FROM public.user_tiers) t
CROSS JOIN models m
ON CONFLICT (tier_id, model_id) DO NOTHING;

-- Set up default quota limits
WITH tier_free AS (SELECT id FROM public.user_tiers WHERE name = 'free'),
     tier_premium AS (SELECT id FROM public.user_tiers WHERE name = 'premium'),
     tier_admin AS (SELECT id FROM public.user_tiers WHERE name = 'admin'),
     models AS (SELECT id FROM public.image_models)
INSERT INTO public.quota_limits (tier_id, model_id, daily_limit, monthly_limit, hourly_limit)
SELECT 
  t.id as tier_id,
  m.id as model_id,
  CASE 
    WHEN t.name = 'free' THEN 3
    WHEN t.name = 'premium' THEN 100
    WHEN t.name = 'admin' THEN 1000
  END as daily_limit,
  CASE 
    WHEN t.name = 'free' THEN 90
    WHEN t.name = 'premium' THEN 3000
    WHEN t.name = 'admin' THEN 30000
  END as monthly_limit,
  CASE 
    WHEN t.name = 'free' THEN 1
    WHEN t.name = 'premium' THEN 10
    WHEN t.name = 'admin' THEN 100
  END as hourly_limit
FROM (SELECT id, name FROM public.user_tiers) t
CROSS JOIN models m
ON CONFLICT (tier_id, model_id) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.user_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_model_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quota_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create admin-only policies
CREATE POLICY "Admins can manage user tiers" ON public.user_tiers FOR ALL 
  USING (auth.jwt() ->> 'email' IN (
    SELECT unnest(string_to_array('admin@example.com,admin2@example.com', ','))
  ));

CREATE POLICY "Admins can manage image models" ON public.image_models FOR ALL 
  USING (auth.jwt() ->> 'email' IN (
    SELECT unnest(string_to_array('admin@example.com,admin2@example.com', ','))
  ));

CREATE POLICY "Admins can manage tier model access" ON public.tier_model_access FOR ALL 
  USING (auth.jwt() ->> 'email' IN (
    SELECT unnest(string_to_array('admin@example.com,admin2@example.com', ','))
  ));

CREATE POLICY "Admins can manage quota limits" ON public.quota_limits FOR ALL 
  USING (auth.jwt() ->> 'email' IN (
    SELECT unnest(string_to_array('admin@example.com,admin2@example.com', ','))
  ));

CREATE POLICY "Admins can manage admin settings" ON public.admin_settings FOR ALL 
  USING (auth.jwt() ->> 'email' IN (
    SELECT unnest(string_to_array('admin@example.com,admin2@example.com', ','))
  ));

-- Users can view their own usage tracking
CREATE POLICY "Users can view own usage" ON public.usage_tracking 
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all usage tracking
CREATE POLICY "Admins can view all usage" ON public.usage_tracking 
  FOR ALL USING (auth.jwt() ->> 'email' IN (
    SELECT unnest(string_to_array('admin@example.com,admin2@example.com', ','))
  ));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON public.usage_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_model_date ON public.usage_tracking(model_id, date);
CREATE INDEX IF NOT EXISTS idx_tier_model_access_tier ON public.tier_model_access(tier_id);
CREATE INDEX IF NOT EXISTS idx_quota_limits_tier ON public.quota_limits(tier_id);

-- Create function to check user quota
CREATE OR REPLACE FUNCTION check_user_quota(
  p_user_id UUID,
  p_model_id TEXT,
  p_check_type TEXT DEFAULT 'daily'
) RETURNS BOOLEAN AS $$
DECLARE
  user_tier_name TEXT;
  model_uuid UUID;
  current_usage INTEGER;
  quota_limit INTEGER;
BEGIN
  -- Get user tier
  SELECT user_tier INTO user_tier_name 
  FROM public.profiles 
  WHERE id = p_user_id;
  
  -- Get model UUID
  SELECT id INTO model_uuid 
  FROM public.image_models 
  WHERE model_id = p_model_id;
  
  -- Get quota limit based on check type
  IF p_check_type = 'daily' THEN
    SELECT ql.daily_limit INTO quota_limit
    FROM public.quota_limits ql
    JOIN public.user_tiers ut ON ut.id = ql.tier_id
    WHERE ut.name = user_tier_name AND ql.model_id = model_uuid;
    
    -- Get current daily usage
    SELECT COALESCE(SUM(images_generated), 0) INTO current_usage
    FROM public.usage_tracking
    WHERE user_id = p_user_id 
      AND model_id = model_uuid 
      AND date = CURRENT_DATE;
      
  ELSIF p_check_type = 'hourly' THEN
    SELECT ql.hourly_limit INTO quota_limit
    FROM public.quota_limits ql
    JOIN public.user_tiers ut ON ut.id = ql.tier_id
    WHERE ut.name = user_tier_name AND ql.model_id = model_uuid;
    
    -- Get current hourly usage
    SELECT COALESCE(SUM(images_generated), 0) INTO current_usage
    FROM public.usage_tracking
    WHERE user_id = p_user_id 
      AND model_id = model_uuid 
      AND date = CURRENT_DATE
      AND hour = EXTRACT(HOUR FROM NOW());
      
  ELSIF p_check_type = 'monthly' THEN
    SELECT ql.monthly_limit INTO quota_limit
    FROM public.quota_limits ql
    JOIN public.user_tiers ut ON ut.id = ql.tier_id
    WHERE ut.name = user_tier_name AND ql.model_id = model_uuid;
    
    -- Get current monthly usage
    SELECT COALESCE(SUM(images_generated), 0) INTO current_usage
    FROM public.usage_tracking
    WHERE user_id = p_user_id 
      AND model_id = model_uuid 
      AND date >= DATE_TRUNC('month', CURRENT_DATE);
  END IF;
  
  RETURN current_usage < quota_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to track usage
CREATE OR REPLACE FUNCTION track_usage(
  p_user_id UUID,
  p_model_id TEXT,
  p_images_count INTEGER DEFAULT 1
) RETURNS VOID AS $$
DECLARE
  model_uuid UUID;
BEGIN
  -- Get model UUID
  SELECT id INTO model_uuid 
  FROM public.image_models 
  WHERE model_id = p_model_id;
  
  -- Insert or update usage tracking
  INSERT INTO public.usage_tracking (user_id, model_id, images_generated, date, hour)
  VALUES (p_user_id, model_uuid, p_images_count, CURRENT_DATE, EXTRACT(HOUR FROM NOW()))
  ON CONFLICT (user_id, model_id, date, hour)
  DO UPDATE SET 
    images_generated = public.usage_tracking.images_generated + p_images_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 