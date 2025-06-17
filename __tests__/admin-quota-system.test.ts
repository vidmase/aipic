// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    })),
    auth: {
      getUser: jest.fn(),
      getSession: jest.fn(),
    },
  })),
}))

import { QuotaManager } from '@/lib/quota-manager'

describe('Admin Quota System', () => {
  let quotaManager: QuotaManager
  let mockSupabase: any

  beforeEach(() => {
    quotaManager = new QuotaManager()
    mockSupabase = (quotaManager as any).supabase
    jest.clearAllMocks()
  })

  describe('QuotaManager', () => {
    describe('getUserTier', () => {
      it('should return user tier information for existing user', async () => {
        const mockProfile = { user_tier: 'premium', is_premium: true }
        mockSupabase.from().select().eq().single.mockResolvedValue({ data: mockProfile })

        const result = await quotaManager.getUserTier('test-user-id')

        expect(result).toEqual({ tier: 'premium', is_premium: true })
        expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      })

      it('should return null for non-existing user', async () => {
        mockSupabase.from().select().eq().single.mockResolvedValue({ data: null })

        const result = await quotaManager.getUserTier('non-existing-user')

        expect(result).toBeNull()
      })

      it('should handle database errors gracefully', async () => {
        mockSupabase.from().select().eq().single.mockRejectedValue(new Error('DB Error'))

        const result = await quotaManager.getUserTier('test-user-id')

        expect(result).toBeNull()
      })
    })

    describe('checkModelAccess', () => {
      it('should allow access for premium user to premium model', async () => {
        const mockProfile = { user_tier: 'premium', is_premium: true }
        const mockAccess = { is_enabled: true }
        
        mockSupabase.from()
          .select().eq().single
          .mockResolvedValueOnce({ data: mockProfile })
          .mockResolvedValueOnce({ data: mockAccess })

        const result = await quotaManager.checkModelAccess('user-id', 'fal-ai/flux/pro')

        expect(result).toBe(true)
      })

      it('should deny access for free user to premium model', async () => {
        const mockProfile = { user_tier: 'free', is_premium: false }
        const mockAccess = { is_enabled: false }
        
        mockSupabase.from()
          .select().eq().single
          .mockResolvedValueOnce({ data: mockProfile })
          .mockResolvedValueOnce({ data: mockAccess })

        const result = await quotaManager.checkModelAccess('user-id', 'fal-ai/flux/pro')

        expect(result).toBe(false)
      })

      it('should handle missing access configuration', async () => {
        const mockProfile = { user_tier: 'free', is_premium: false }
        
        mockSupabase.from()
          .select().eq().single
          .mockResolvedValueOnce({ data: mockProfile })
          .mockResolvedValueOnce({ data: null })

        const result = await quotaManager.checkModelAccess('user-id', 'unknown-model')

        expect(result).toBe(false)
      })
    })

    describe('checkQuota', () => {
      it('should allow generation when under quota limits', async () => {
        const mockProfile = { user_tier: 'free', is_premium: false }
        const mockQuotaLimits = {
          daily_limit: 3,
          monthly_limit: 90,
          hourly_limit: 1
        }
        const mockModel = { id: 'model-uuid' }
        const mockUsage = [{ images_generated: 1 }]

        mockSupabase.from()
          .select().eq().single
          .mockResolvedValueOnce({ data: mockProfile }) // user tier
          .mockResolvedValueOnce({ data: mockQuotaLimits }) // quota limits
          .mockResolvedValueOnce({ data: mockModel }) // model uuid

        mockSupabase.from().select().eq()
          .mockResolvedValueOnce({ data: mockUsage }) // hourly usage
          .mockResolvedValueOnce({ data: mockUsage }) // daily usage
          .mockResolvedValueOnce({ data: mockUsage }) // monthly usage

        const result = await quotaManager.checkQuota('user-id', 'fal-ai/fast-sdxl')

        expect(result.allowed).toBe(true)
        expect(result.usage.daily).toBe(1)
        expect(result.limits.daily).toBe(3)
      })

      it('should deny generation when daily quota exceeded', async () => {
        const mockProfile = { user_tier: 'free', is_premium: false }
        const mockQuotaLimits = {
          daily_limit: 3,
          monthly_limit: 90,
          hourly_limit: 1
        }
        const mockModel = { id: 'model-uuid' }
        const mockUsage = [{ images_generated: 3 }]

        mockSupabase.from()
          .select().eq().single
          .mockResolvedValueOnce({ data: mockProfile })
          .mockResolvedValueOnce({ data: mockQuotaLimits })
          .mockResolvedValueOnce({ data: mockModel })

        mockSupabase.from().select().eq()
          .mockResolvedValueOnce({ data: [] }) // hourly usage
          .mockResolvedValueOnce({ data: mockUsage }) // daily usage
          .mockResolvedValueOnce({ data: mockUsage }) // monthly usage

        const result = await quotaManager.checkQuota('user-id', 'fal-ai/fast-sdxl')

        expect(result.allowed).toBe(false)
        expect(result.reason).toContain('Daily limit exceeded')
      })

      it('should deny generation when hourly quota exceeded', async () => {
        const mockProfile = { user_tier: 'free', is_premium: false }
        const mockQuotaLimits = {
          daily_limit: 3,
          monthly_limit: 90,
          hourly_limit: 1
        }
        const mockModel = { id: 'model-uuid' }
        const mockHourlyUsage = [{ images_generated: 1 }]
        const mockDailyUsage = [{ images_generated: 2 }]

        mockSupabase.from()
          .select().eq().single
          .mockResolvedValueOnce({ data: mockProfile })
          .mockResolvedValueOnce({ data: mockQuotaLimits })
          .mockResolvedValueOnce({ data: mockModel })

        mockSupabase.from().select().eq()
          .mockResolvedValueOnce({ data: mockHourlyUsage }) // hourly usage
          .mockResolvedValueOnce({ data: mockDailyUsage }) // daily usage
          .mockResolvedValueOnce({ data: mockDailyUsage }) // monthly usage

        const result = await quotaManager.checkQuota('user-id', 'fal-ai/fast-sdxl')

        expect(result.allowed).toBe(false)
        expect(result.reason).toContain('Hourly limit exceeded')
      })
    })

    describe('trackUsage', () => {
      it('should successfully track usage', async () => {
        const mockModel = { id: 'model-uuid' }
        
        mockSupabase.from()
          .select().eq().single.mockResolvedValue({ data: mockModel })
        
        mockSupabase.from().upsert.mockResolvedValue({ error: null })

        const result = await quotaManager.trackUsage('user-id', 'fal-ai/fast-sdxl', 2)

        expect(result).toBe(true)
        expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'user-id',
            model_id: 'model-uuid',
            images_generated: 2
          }),
          expect.any(Object)
        )
      })

      it('should handle missing model gracefully', async () => {
        mockSupabase.from()
          .select().eq().single.mockResolvedValue({ data: null })

        const result = await quotaManager.trackUsage('user-id', 'unknown-model')

        expect(result).toBe(false)
      })

      it('should handle database errors in usage tracking', async () => {
        const mockModel = { id: 'model-uuid' }
        
        mockSupabase.from()
          .select().eq().single.mockResolvedValue({ data: mockModel })
        
        mockSupabase.from().upsert.mockResolvedValue({ error: new Error('DB Error') })

        const result = await quotaManager.trackUsage('user-id', 'fal-ai/fast-sdxl')

        expect(result).toBe(false)
      })
    })

    describe('getUserQuotaStatus', () => {
      it('should return quota status for all accessible models', async () => {
        const mockProfile = { user_tier: 'premium', is_premium: true }
        const mockAccessibleModels = [
          { image_models: { model_id: 'model-1' } },
          { image_models: { model_id: 'model-2' } }
        ]

        mockSupabase.from()
          .select().eq().single.mockResolvedValue({ data: mockProfile })
        
        mockSupabase.from()
          .select().eq().mockResolvedValue({ data: mockAccessibleModels })

        // Mock checkQuota calls
        const originalCheckQuota = quotaManager.checkQuota
        quotaManager.checkQuota = jest.fn()
          .mockResolvedValueOnce({ 
            allowed: true, 
            usage: { hourly: 0, daily: 1, monthly: 5 },
            limits: { hourly: 10, daily: 100, monthly: 1000 }
          })
          .mockResolvedValueOnce({ 
            allowed: false, 
            reason: 'Daily limit exceeded',
            usage: { hourly: 2, daily: 100, monthly: 500 },
            limits: { hourly: 10, daily: 100, monthly: 1000 }
          })

        const result = await quotaManager.getUserQuotaStatus('user-id')

        expect(result).toEqual({
          'model-1': expect.objectContaining({ allowed: true }),
          'model-2': expect.objectContaining({ allowed: false })
        })

        // Restore original method
        quotaManager.checkQuota = originalCheckQuota
      })

      it('should return empty object for non-existing user', async () => {
        mockSupabase.from()
          .select().eq().single.mockResolvedValue({ data: null })

        const result = await quotaManager.getUserQuotaStatus('non-existing-user')

        expect(result).toEqual({})
      })
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete workflow: access check -> quota check -> usage tracking', async () => {
      // Setup mocks for successful workflow
      const mockProfile = { user_tier: 'free', is_premium: false }
      const mockAccess = { is_enabled: true }
      const mockQuotaLimits = {
        daily_limit: 3,
        monthly_limit: 90,
        hourly_limit: 1
      }
      const mockModel = { id: 'model-uuid' }
      const mockUsage = []

      mockSupabase.from()
        .select().eq().single
        .mockResolvedValueOnce({ data: mockProfile }) // getUserTier for access check
        .mockResolvedValueOnce({ data: mockAccess }) // checkModelAccess
        .mockResolvedValueOnce({ data: mockProfile }) // getUserTier for quota check
        .mockResolvedValueOnce({ data: mockQuotaLimits }) // quota limits
        .mockResolvedValueOnce({ data: mockModel }) // model for quota check
        .mockResolvedValueOnce({ data: mockModel }) // model for usage tracking

      mockSupabase.from().select().eq()
        .mockResolvedValueOnce({ data: mockUsage }) // hourly usage
        .mockResolvedValueOnce({ data: mockUsage }) // daily usage
        .mockResolvedValueOnce({ data: mockUsage }) // monthly usage

      mockSupabase.from().upsert.mockResolvedValue({ error: null })

      // Test the workflow
      const hasAccess = await quotaManager.checkModelAccess('user-id', 'fal-ai/fast-sdxl')
      expect(hasAccess).toBe(true)

      const quotaCheck = await quotaManager.checkQuota('user-id', 'fal-ai/fast-sdxl')
      expect(quotaCheck.allowed).toBe(true)

      const trackingResult = await quotaManager.trackUsage('user-id', 'fal-ai/fast-sdxl', 1)
      expect(trackingResult).toBe(true)
    })
  })
})

describe('Error Handling', () => {
  let quotaManager: QuotaManager

  beforeEach(() => {
    quotaManager = new QuotaManager()
    jest.clearAllMocks()
  })

  it('should handle network errors gracefully', async () => {
    const mockSupabase = (quotaManager as any).supabase
    mockSupabase.from().select().eq().single.mockRejectedValue(new Error('Network error'))

    const result = await quotaManager.getUserTier('user-id')
    expect(result).toBeNull()
  })

  it('should handle malformed data gracefully', async () => {
    const mockSupabase = (quotaManager as any).supabase
    mockSupabase.from().select().eq().single.mockResolvedValue({ data: { invalid: 'data' } })

    const result = await quotaManager.getUserTier('user-id')
    expect(result).toEqual({ tier: 'free', is_premium: false })
  })

  it('should handle concurrent usage tracking', async () => {
    const mockSupabase = (quotaManager as any).supabase
    const mockModel = { id: 'model-uuid' }
    
    mockSupabase.from()
      .select().eq().single.mockResolvedValue({ data: mockModel })
    
    mockSupabase.from().upsert.mockResolvedValue({ error: null })

    // Simulate concurrent tracking
    const promises = [
      quotaManager.trackUsage('user-id', 'fal-ai/fast-sdxl', 1),
      quotaManager.trackUsage('user-id', 'fal-ai/fast-sdxl', 1),
      quotaManager.trackUsage('user-id', 'fal-ai/fast-sdxl', 1)
    ]

    const results = await Promise.all(promises)
    expect(results.every(r => r === true)).toBe(true)
  })
})

describe('Performance Tests', () => {
  let quotaManager: QuotaManager

  beforeEach(() => {
    quotaManager = new QuotaManager()
    jest.clearAllMocks()
  })

  it('should complete quota check within reasonable time', async () => {
    const mockSupabase = (quotaManager as any).supabase
    const mockProfile = { user_tier: 'free', is_premium: false }
    const mockQuotaLimits = { daily_limit: 3, monthly_limit: 90, hourly_limit: 1 }
    const mockModel = { id: 'model-uuid' }

    mockSupabase.from()
      .select().eq().single
      .mockResolvedValueOnce({ data: mockProfile })
      .mockResolvedValueOnce({ data: mockQuotaLimits })
      .mockResolvedValueOnce({ data: mockModel })

    mockSupabase.from().select().eq()
      .mockResolvedValue({ data: [] })

    const startTime = Date.now()
    await quotaManager.checkQuota('user-id', 'fal-ai/fast-sdxl')
    const endTime = Date.now()

    expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
  })
}) 