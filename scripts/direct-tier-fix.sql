-- Fix user tier mismatch for premium users
-- Update user_tier to 'premium' for users who have is_premium=true but user_tier!='premium'

UPDATE public.profiles 
SET user_tier = 'premium'
WHERE is_premium = true 
  AND (user_tier IS NULL OR user_tier != 'premium');

-- Verify the fix
SELECT id, full_name, email, is_premium, user_tier, updated_at
FROM public.profiles 
WHERE is_premium = true; 