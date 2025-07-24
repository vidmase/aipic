# Adding SAM2 Model via Admin Interface

Since the database setup script requires environment variables, you can add the SAM2 model through the admin interface instead:

## Steps:

1. **Go to Admin Panel**: Navigate to `/admin` in your app
2. **Access Model Management**: Look for the models or configuration section
3. **Add New Model** with these details:

### Model Details:
- **Model ID**: `fal-ai/sam2`
- **Name**: `SAM2 Interactive Segmentation`
- **Description**: `SAM2 model with point and box prompting for precise object selection`
- **Provider**: `fal-ai`
- **Type**: `segmentation`
- **Active**: Yes

### Quota Limits (per tier):
- **Free Tier**: 5/hour, 20/day, 50/month
- **Basic Tier**: 15/hour, 100/day, 200/month  
- **Premium Tier**: 50/hour, 500/day, 1000/month

## Alternative: Direct Database Access

If you have direct database access, you can run these SQL commands:

```sql
-- Add the SAM2 model
INSERT INTO image_models (model_id, name, description, provider, type, is_active, created_at, updated_at)
VALUES ('fal-ai/sam2', 'SAM2 Interactive Segmentation', 'SAM2 model with point and box prompting for precise object selection', 'fal-ai', 'segmentation', true, NOW(), NOW());

-- Get the model UUID (replace with actual UUID from above insert)
-- SELECT id FROM image_models WHERE model_id = 'fal-ai/sam2';

-- Add tier access (replace MODEL_UUID with the actual UUID)
INSERT INTO tier_model_access (tier_id, model_id, is_enabled, created_at)
SELECT ut.id, 'MODEL_UUID', true, NOW()
FROM user_tiers ut;

-- Add quota limits (replace MODEL_UUID with the actual UUID)
INSERT INTO quota_limits (tier_id, model_id, hourly_limit, daily_limit, monthly_limit, created_at)
SELECT 
    ut.id, 
    'MODEL_UUID',
    CASE ut.name 
        WHEN 'free' THEN 5
        WHEN 'basic' THEN 15
        WHEN 'premium' THEN 50
        ELSE 5
    END as hourly_limit,
    CASE ut.name 
        WHEN 'free' THEN 20
        WHEN 'basic' THEN 100
        WHEN 'premium' THEN 500
        ELSE 20
    END as daily_limit,
    CASE ut.name 
        WHEN 'free' THEN 50
        WHEN 'basic' THEN 200
        WHEN 'premium' THEN 1000
        ELSE 50
    END as monthly_limit,
    NOW()
FROM user_tiers ut;
```

## Current Status

For now, the SAM2 interactive segmentation will work even without the proper database setup due to the temporary bypass in the code. However, it's recommended to add the model properly for proper quota management. 