-- Admin Access Control & Quota Management Setup
-- Copy and paste this entire script into your Supabase SQL Editor

-- 1. Add columns to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_tier TEXT DEFAULT 'free';

-- 2. Create user_tiers table
CREATE TABLE IF NOT EXISTS public.user_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create image_models table
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

-- 4. Create tier_model_access table
CREATE TABLE IF NOT EXISTS public.tier_model_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_id UUID REFERENCES public.user_tiers(id) ON DELETE CASCADE NOT NULL,
  model_id UUID REFERENCES public.image_models(id) ON DELETE CASCADE NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tier_id, model_id)
);

-- 5. Create quota_limits table
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

-- 6. Create usage_tracking table
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

-- 7. Insert default user tiers
INSERT INTO public.user_tiers (name, display_name, description) VALUES
  ('free', 'Free', 'Basic tier with limited access'),
  ('premium', 'Premium', 'Full access to all features'),
  ('admin', 'Admin', 'Administrative access')
ON CONFLICT (name) DO NOTHING;

-- 8. Insert default image models
INSERT INTO public.image_models (model_id, display_name, description, provider) VALUES
  ('fal-ai/fast-sdxl', 'Fast SDXL', 'Fast Stable Diffusion XL model', 'fal-ai'),
  ('fal-ai/ideogram/v2', 'Ideogram v2', 'Ideogram text-to-image model v2', 'fal-ai'),
  ('fal-ai/ideogram/v3', 'Ideogram v3', 'Latest Ideogram text-to-image model', 'fal-ai'),
  ('fal-ai/flux/schnell', 'Flux Schnell', 'Fast Flux model for quick generation', 'fal-ai'),
  ('fal-ai/flux/dev', 'Flux Dev', 'Development version of Flux model', 'fal-ai')
ON CONFLICT (model_id) DO NOTHING;

-- 9. Set up tier access permissions
WITH tier_data AS (SELECT id, name FROM public.user_tiers),
     model_data AS (SELECT id, model_id FROM public.image_models)
INSERT INTO public.tier_model_access (tier_id, model_id, is_enabled)
SELECT 
  t.id as tier_id,
  m.id as model_id,
  CASE 
    WHEN t.name = 'free' AND m.model_id IN ('fal-ai/fast-sdxl', 'fal-ai/ideogram/v2') THEN TRUE
    WHEN t.name IN ('premium', 'admin') THEN TRUE
    ELSE FALSE
  END as is_enabled
FROM tier_data t
CROSS JOIN model_data m
ON CONFLICT (tier_id, model_id) DO NOTHING;

-- 10. Set up quota limits
WITH tier_data AS (SELECT id, name FROM public.user_tiers),
     model_data AS (SELECT id FROM public.image_models)
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
FROM tier_data t
CROSS JOIN model_data m
ON CONFLICT (tier_id, model_id) DO NOTHING;

-- Success message
SELECT 'Admin system setup complete! 🎉' as status; 