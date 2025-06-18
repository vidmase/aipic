import { createServiceRoleClient } from "@/lib/supabase/server"

export interface QuotaCheck {
  allowed: boolean
  reason?: string
  usage: {
    hourly: number
    daily: number
    monthly: number
  }
  limits: {
    hourly: number
    daily: number
    monthly: number
  }
}

export interface UserTierInfo {
  tier: string
  is_premium: boolean
}

export class QuotaManager {
  private supabase

  constructor() {
    this.supabase = createServiceRoleClient()
  }

  async getUserTier(userId: string): Promise<UserTierInfo | null> {
    try {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('user_tier, is_premium')
        .eq('id', userId)
        .single()

      return profile ? {
        tier: profile.user_tier || 'free',
        is_premium: profile.is_premium || false
      } : null
    } catch (error) {
      console.error('Error fetching user tier:', error)
      return null
    }
  }

  async checkModelAccess(userId: string, modelId: string): Promise<boolean> {
    try {
      const userInfo = await this.getUserTier(userId)
      if (!userInfo) return false

      // Check if the user's tier has access to this model
      const { data: access } = await this.supabase
        .from('tier_model_access')
        .select(`
          is_enabled,
          user_tiers!inner(name),
          image_models!inner(model_id)
        `)
        .eq('user_tiers.name', userInfo.tier)
        .eq('image_models.model_id', modelId)
        .single()

      return access?.is_enabled || false
    } catch (error) {
      console.error('Error checking model access:', error)
      return false
    }
  }

  async checkQuota(userId: string, modelId: string): Promise<QuotaCheck> {
    try {
      const userInfo = await this.getUserTier(userId)
      if (!userInfo) {
        return {
          allowed: false,
          reason: 'User not found',
          usage: { hourly: 0, daily: 0, monthly: 0 },
          limits: { hourly: 0, daily: 0, monthly: 0 }
        }
      }

      // Get quota limits for this tier and model
      const { data: quotaLimits } = await this.supabase
        .from('quota_limits')
        .select(`
          daily_limit,
          monthly_limit,
          hourly_limit,
          user_tiers!inner(name),
          image_models!inner(model_id)
        `)
        .eq('user_tiers.name', userInfo.tier)
        .eq('image_models.model_id', modelId)
        .single()

      if (!quotaLimits) {
        return {
          allowed: false,
          reason: 'No quota limits found for this tier/model combination',
          usage: { hourly: 0, daily: 0, monthly: 0 },
          limits: { hourly: 0, daily: 0, monthly: 0 }
        }
      }

      // Get model UUID for usage tracking
      const { data: model } = await this.supabase
        .from('image_models')
        .select('id')
        .eq('model_id', modelId)
        .single()

      if (!model) {
        return {
          allowed: false,
          reason: 'Model not found',
          usage: { hourly: 0, daily: 0, monthly: 0 },
          limits: { hourly: 0, daily: 0, monthly: 0 }
        }
      }

      // Get current usage
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const currentHour = now.getHours()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

      // Hourly usage
      const { data: hourlyUsage } = await this.supabase
        .from('usage_tracking')
        .select('images_generated')
        .eq('user_id', userId)
        .eq('model_id', model.id)
        .eq('date', today)
        .eq('hour', currentHour)

      // Daily usage
      const { data: dailyUsage } = await this.supabase
        .from('usage_tracking')
        .select('images_generated')
        .eq('user_id', userId)
        .eq('model_id', model.id)
        .eq('date', today)

      // Monthly usage
      const { data: monthlyUsage } = await this.supabase
        .from('usage_tracking')
        .select('images_generated')
        .eq('user_id', userId)
        .eq('model_id', model.id)
        .gte('date', monthStart)

      const usage = {
        hourly: hourlyUsage?.reduce((sum, item) => sum + item.images_generated, 0) || 0,
        daily: dailyUsage?.reduce((sum, item) => sum + item.images_generated, 0) || 0,
        monthly: monthlyUsage?.reduce((sum, item) => sum + item.images_generated, 0) || 0
      }

      const limits = {
        hourly: quotaLimits.hourly_limit,
        daily: quotaLimits.daily_limit,
        monthly: quotaLimits.monthly_limit
      }

      // Check if any limit is exceeded - prioritize daily limit for free users
      if (usage.daily >= limits.daily) {
        return {
          allowed: false,
          reason: `Daily limit exceeded (${usage.daily}/${limits.daily})`,
          usage,
          limits
        }
      }

      if (usage.hourly >= limits.hourly) {
        return {
          allowed: false,
          reason: `Hourly limit exceeded (${usage.hourly}/${limits.hourly})`,
          usage,
          limits
        }
      }

      if (usage.monthly >= limits.monthly) {
        return {
          allowed: false,
          reason: `Monthly limit exceeded (${usage.monthly}/${limits.monthly})`,
          usage,
          limits
        }
      }

      return {
        allowed: true,
        usage,
        limits
      }
    } catch (error) {
      console.error('Error checking quota:', error)
      return {
        allowed: false,
        reason: 'Error checking quota',
        usage: { hourly: 0, daily: 0, monthly: 0 },
        limits: { hourly: 0, daily: 0, monthly: 0 }
      }
    }
  }

  async trackUsage(userId: string, modelId: string, imageCount: number = 1): Promise<boolean> {
    try {
      // Get model UUID
      const { data: model } = await this.supabase
        .from('image_models')
        .select('id')
        .eq('model_id', modelId)
        .single()

      if (!model) {
        console.error('Model not found for tracking:', modelId)
        return false
      }

      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const currentHour = now.getHours()

      // Insert or update usage tracking - properly increment count
      // First, try to get existing record
      const { data: existingRecord } = await this.supabase
        .from('usage_tracking')
        .select('images_generated')
        .eq('user_id', userId)
        .eq('model_id', model.id)
        .eq('date', today)
        .eq('hour', currentHour)
        .single()

      let error: any = null
      
      if (existingRecord) {
        // Update existing record by incrementing
        const { error: updateError } = await this.supabase
          .from('usage_tracking')
          .update({
            images_generated: existingRecord.images_generated + imageCount
          })
          .eq('user_id', userId)
          .eq('model_id', model.id)
          .eq('date', today)
          .eq('hour', currentHour)
        error = updateError
      } else {
        // Insert new record
        const { error: insertError } = await this.supabase
          .from('usage_tracking')
          .insert({
            user_id: userId,
            model_id: model.id,
            images_generated: imageCount,
            date: today,
            hour: currentHour
          })
        error = insertError
      }

      if (error) {
        console.error('Error tracking usage:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in trackUsage:', error)
      return false
    }
  }

  async getUserQuotaStatus(userId: string): Promise<{
    [modelId: string]: QuotaCheck
  }> {
    try {
      const userInfo = await this.getUserTier(userId)
      if (!userInfo) return {}

      // Get all models accessible to user's tier
      const { data: accessibleModels } = await this.supabase
        .from('tier_model_access')
        .select(`
          is_enabled,
          image_models!inner(model_id),
          user_tiers!inner(name)
        `)
        .eq('user_tiers.name', userInfo.tier)
        .eq('is_enabled', true)

      const quotaStatus: { [modelId: string]: QuotaCheck } = {}

      if (accessibleModels) {
        for (const access of accessibleModels) {
          const modelId = access.image_models.model_id
          quotaStatus[modelId] = await this.checkQuota(userId, modelId)
        }
      }

      return quotaStatus
    } catch (error) {
      console.error('Error getting user quota status:', error)
      return {}
    }
  }
}

// Singleton instance
export const quotaManager = new QuotaManager() 