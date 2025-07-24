"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Settings, 
  Users, 
  Bot, 
  Shield, 
  Plus, 
  Edit, 
  Save,
  Loader2,
  Eye,
  BarChart3,
  Clock,
  Calendar,
  Zap,
  RefreshCw
} from "lucide-react"

interface UserTier {
  id: string
  name: string
  display_name: string
  description: string
  is_active: boolean
}

interface ImageModel {
  id: string
  model_id: string
  display_name: string
  description: string
  provider: string
  is_active: boolean
}

interface TierAccess {
  id: string
  tier_id: string
  model_id: string
  is_enabled: boolean
  user_tiers: { name: string; display_name: string }
  image_models: { model_id: string; display_name: string }
}

interface QuotaLimit {
  id: string
  tier_id: string
  model_id: string
  daily_limit: number
  monthly_limit: number
  hourly_limit: number
  user_tiers: { name: string; display_name: string }
  image_models: { model_id: string; display_name: string }
}

interface UsageData {
  id: string
  user_id: string
  model_id: string
  images_generated: number
  date: string
  hour: number
  profiles: { full_name: string }
  image_models: { model_id: string; display_name: string }
}

interface AccessControlPanelProps {
  initialData: {
    tiers: any[]
    models: any[]
    access: any[]
    quotas: any[]
  }
  defaultTab?: string
}

export function AccessControlPanel({ initialData, defaultTab = "access" }: AccessControlPanelProps) {
  const [tiers, setTiers] = useState<UserTier[]>(initialData.tiers || [])
  const [models, setModels] = useState<ImageModel[]>(initialData.models || [])
  const [tierAccess, setTierAccess] = useState<TierAccess[]>(initialData.access || [])
  const [quotas, setQuotas] = useState<QuotaLimit[]>(initialData.quotas || [])
  const [usage, setUsage] = useState<UsageData[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshingUsage, setRefreshingUsage] = useState(false)

  // Form states
  const [newTier, setNewTier] = useState({ name: '', display_name: '', description: '' })
  const [newModel, setNewModel] = useState({ model_id: '', display_name: '', description: '', provider: 'fal-ai' })
  const [selectedQuota, setSelectedQuota] = useState<QuotaLimit | null>(null)
  
  // Filter states
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all')
  const [usageTimeFrame, setUsageTimeFrame] = useState<'hourly' | 'daily' | 'monthly'>('daily')
  
  const { toast } = useToast()

  // Filter the tierAccess data based on selected tier
  const filteredTierAccess = selectedTierFilter === 'all' 
    ? tierAccess 
    : tierAccess.filter(access => access.tier_id === selectedTierFilter)

  // Filter the quotas data based on selected tier
  const filteredQuotas = selectedTierFilter === 'all' 
    ? quotas 
    : quotas.filter(quota => quota.tier_id === selectedTierFilter)

  // Aggregate usage data by time frame
  const getAggregatedUsage = () => {
    const aggregated = new Map()
    
    usage.forEach((item) => {
      let key = ''
      let dateLabel = ''
      
      const itemDate = new Date(item.date)
      
      switch (usageTimeFrame) {
        case 'hourly':
          key = `${item.date}-${item.hour}-${item.user_id}-${item.model_id}`
          dateLabel = `${itemDate.toLocaleDateString()} ${item.hour}:00`
          break
        case 'daily':
          const dailyKey = item.date
          key = `${dailyKey}-${item.user_id}-${item.model_id}`
          dateLabel = itemDate.toLocaleDateString()
          break
        case 'monthly':
          const monthlyKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`
          key = `${monthlyKey}-${item.user_id}-${item.model_id}`
          dateLabel = `${itemDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
          break
      }
      
      if (aggregated.has(key)) {
        aggregated.get(key).images_generated += item.images_generated
      } else {
        aggregated.set(key, {
          ...item,
          dateLabel,
          images_generated: item.images_generated
        })
      }
    })
    
    return Array.from(aggregated.values()).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }

  const aggregatedUsage = getAggregatedUsage()

  useEffect(() => {
    loadUsageData()
  }, [])

  const loadUsageData = async () => {
    try {
      const usageRes = await fetch('/api/admin/access-control?type=usage')
      if (usageRes.ok) {
        const usageData = await usageRes.json()
        setUsage(usageData.usage || [])
      } else {
        console.warn('Usage data API returned error:', usageRes.status, usageRes.statusText)
        setUsage([]) // Set empty array on API error
      }
    } catch (error) {
      console.error('Error loading usage data:', error)
      setUsage([]) // Set empty array on network error
    }
  }

  const refreshUsageData = async () => {
    setRefreshingUsage(true)
    try {
      const usageRes = await fetch('/api/admin/access-control?type=usage')
      if (usageRes.ok) {
        const usageData = await usageRes.json()
        setUsage(usageData.usage || [])
        toast({
          title: "Success",
          description: "Usage analytics refreshed successfully",
        })
      } else {
        console.warn('Usage data API returned error:', usageRes.status, usageRes.statusText)
        toast({
          title: "Warning",
          description: "Failed to refresh usage data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error refreshing usage data:', error)
      toast({
        title: "Error",
        description: "Failed to refresh usage analytics",
        variant: "destructive",
      })
    } finally {
      setRefreshingUsage(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [tiersRes, modelsRes, accessRes, quotasRes] = await Promise.all([
        fetch('/api/admin/access-control?type=tiers'),
        fetch('/api/admin/access-control?type=models'),
        fetch('/api/admin/access-control?type=access'),
        fetch('/api/admin/access-control?type=quotas')
      ])

      if (tiersRes.ok && modelsRes.ok && accessRes.ok && quotasRes.ok) {
        const [tiersData, modelsData, accessData, quotasData] = await Promise.all([
          tiersRes.json(),
          modelsRes.json(),
          accessRes.json(),
          quotasRes.json()
        ])

        setTiers(tiersData.tiers || [])
        setModels(modelsData.models || [])
        setTierAccess(accessData.access || [])
        setQuotas(quotasData.quotas || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to refresh admin data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAccessToggle = async (accessId: string, currentEnabled: boolean) => {
    setSaving(true)
    try {
      const accessItem = tierAccess.find(a => a.id === accessId)
      if (!accessItem) return

      const response = await fetch('/api/admin/access-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_tier_access',
          data: {
            tier_id: accessItem.tier_id,
            model_id: accessItem.model_id,
            is_enabled: !currentEnabled
          }
        })
      })

      if (response.ok) {
        setTierAccess(prev => 
          prev.map(item => 
            item.id === accessId 
              ? { ...item, is_enabled: !currentEnabled }
              : item
          )
        )
        toast({
          title: "Success",
          description: "Access permissions updated",
        })
      } else {
        throw new Error('Failed to update access')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update access permissions",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleQuotaUpdate = async (quotaData: Partial<QuotaLimit>) => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/access-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_quota',
          data: quotaData
        })
      })

      if (response.ok) {
        await loadData()
        setSelectedQuota(null)
        toast({
          title: "Success",
          description: "Quota limits updated",
        })
      } else {
        throw new Error('Failed to update quota')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quota limits",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateTier = async () => {
    if (!newTier.name || !newTier.display_name) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/access-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_tier',
          data: newTier
        })
      })

      if (response.ok) {
        await loadData()
        setNewTier({ name: '', display_name: '', description: '' })
        toast({
          title: "Success",
          description: "User tier created",
        })
      } else {
        throw new Error('Failed to create tier')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user tier",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateModel = async () => {
    if (!newModel.model_id || !newModel.display_name) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/access-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_model',
          data: newModel
        })
      })

      if (response.ok) {
        await loadData()
        setNewModel({ model_id: '', display_name: '', description: '', provider: 'fal-ai' })
        toast({
          title: "Success",
          description: "Image model created with access and quota settings",
        })
      } else {
        throw new Error('Failed to create model')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create image model",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSyncMissingQuotas = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/access-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_missing_quotas'
        })
      })

      if (response.ok) {
        const data = await response.json()
        await loadData()
        
        const { results } = data
        const totalFixed = results.accessCreated + results.quotasCreated
        
        if (totalFixed > 0) {
          toast({
            title: "Success",
            description: `Fixed ${totalFixed} missing records for ${results.affectedModels.length} models`,
          })
        } else {
          toast({
            title: "Info",
            description: "All models already have complete access and quota settings",
          })
        }
      } else {
        throw new Error('Failed to sync quota records')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync missing quota records",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading admin data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">System Configuration</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage AI models, user tiers, access permissions, and quota limits
          </p>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <div className="relative">
          <div className="overflow-x-auto scrollbar-hide">
            <TabsList className="inline-flex h-12 sm:h-10 w-full min-w-max sm:grid sm:grid-cols-5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <TabsTrigger value="access" className="px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
                <Shield className="w-4 h-4 mr-1.5 sm:hidden" />
                <span className="hidden sm:inline">Model Access</span>
                <span className="sm:hidden">Access</span>
              </TabsTrigger>
              <TabsTrigger value="quotas" className="px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
                <Zap className="w-4 h-4 mr-1.5 sm:hidden" />
                <span className="hidden sm:inline">Quota Limits</span>
                <span className="sm:hidden">Quotas</span>
              </TabsTrigger>
              <TabsTrigger value="tiers" className="px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
                <Users className="w-4 h-4 mr-1.5 sm:hidden" />
                <span className="hidden sm:inline">User Tiers</span>
                <span className="sm:hidden">Tiers</span>
              </TabsTrigger>
              <TabsTrigger value="models" className="px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
                <Bot className="w-4 h-4 mr-1.5 sm:hidden" />
                <span className="hidden sm:inline">AI Models</span>
                <span className="sm:hidden">Models</span>
              </TabsTrigger>
              <TabsTrigger value="usage" className="px-3 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap">
                <BarChart3 className="w-4 h-4 mr-1.5 sm:hidden" />
                <span className="hidden sm:inline">Usage Analytics</span>
                <span className="sm:hidden">Analytics</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Model Access Control
              </CardTitle>
              <CardDescription>
                Control which AI models each user tier can access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <Label htmlFor="tier-filter" className="text-sm font-medium whitespace-nowrap">Filter by Tier:</Label>
                  <Select
                    value={selectedTierFilter}
                    onValueChange={setSelectedTierFilter}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      {tiers.map((tier) => (
                        <SelectItem key={tier.id} value={tier.id}>
                          {tier.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedTierFilter !== 'all' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTierFilter('all')}
                    className="self-start sm:self-center"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
              
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {filteredTierAccess.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {selectedTierFilter === 'all' 
                      ? 'No tier access data found' 
                      : 'No models found for selected tier'
                    }
                  </div>
                ) : (
                  filteredTierAccess.map((access) => (
                    <Card key={access.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {access.user_tiers?.display_name || 'Unknown Tier'}
                          </Badge>
                          <Switch
                            checked={access.is_enabled}
                            onCheckedChange={() => handleAccessToggle(access.id, access.is_enabled)}
                            disabled={saving}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{access.image_models?.display_name || 'Unknown Model'}</p>
                          <Badge variant={access.is_enabled ? "default" : "secondary"} className="mt-1 text-xs">
                            {access.is_enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Tier</TableHead>
                      <TableHead>AI Model</TableHead>
                      <TableHead>Access Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTierAccess.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          {selectedTierFilter === 'all' 
                            ? 'No tier access data found' 
                            : 'No models found for selected tier'
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTierAccess.map((access) => (
                        <TableRow key={access.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {access.user_tiers?.display_name || 'Unknown Tier'}
                            </Badge>
                          </TableCell>
                          <TableCell>{access.image_models?.display_name || 'Unknown Model'}</TableCell>
                          <TableCell>
                            <Badge variant={access.is_enabled ? "default" : "secondary"}>
                              {access.is_enabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={access.is_enabled}
                              onCheckedChange={() => handleAccessToggle(access.id, access.is_enabled)}
                              disabled={saving}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Quota Management
              </CardTitle>
              <CardDescription>
                Set generation limits for each user tier and model combination
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <Label htmlFor="quota-tier-filter" className="text-sm font-medium whitespace-nowrap">Filter by Tier:</Label>
                  <Select
                    value={selectedTierFilter}
                    onValueChange={setSelectedTierFilter}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      {tiers.map((tier) => (
                        <SelectItem key={tier.id} value={tier.id}>
                          {tier.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedTierFilter !== 'all' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTierFilter('all')}
                    className="self-start sm:self-center"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
              
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {filteredQuotas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {selectedTierFilter === 'all' 
                      ? 'No quota data found' 
                      : 'No quotas found for selected tier'
                    }
                  </div>
                ) : (
                  filteredQuotas.map((quota) => (
                    <Card key={quota.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {quota.user_tiers.display_name}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedQuota(quota)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                        <div>
                          <p className="font-medium text-sm mb-2">{quota.image_models.display_name}</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Hourly</p>
                              <Badge variant="secondary" className="text-xs">{quota.hourly_limit}</Badge>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Daily</p>
                              <Badge variant="secondary" className="text-xs">{quota.daily_limit}</Badge>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Monthly</p>
                              <Badge variant="secondary" className="text-xs">{quota.monthly_limit}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Tier</TableHead>
                      <TableHead>AI Model</TableHead>
                      <TableHead>Hourly Limit</TableHead>
                      <TableHead>Daily Limit</TableHead>
                      <TableHead>Monthly Limit</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {selectedTierFilter === 'all' 
                            ? 'No quota data found' 
                            : 'No quotas found for selected tier'
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredQuotas.map((quota) => (
                      <TableRow key={quota.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {quota.user_tiers.display_name}
                          </Badge>
                        </TableCell>
                        <TableCell>{quota.image_models.display_name}</TableCell>
                        <TableCell>{quota.hourly_limit}</TableCell>
                        <TableCell>{quota.daily_limit}</TableCell>
                        <TableCell>{quota.monthly_limit}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedQuota(quota)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Tiers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tiers.map((tier) => (
                  <div key={tier.id} className="p-3 sm:p-4 border rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base">{tier.display_name}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">{tier.description}</p>
                      </div>
                      <Badge variant={tier.is_active ? "default" : "secondary"} className="self-start sm:self-center">
                        {tier.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create New Tier
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tier-name" className="text-sm">Tier Name</Label>
                  <Input
                    id="tier-name"
                    value={newTier.name}
                    onChange={(e) => setNewTier({...newTier, name: e.target.value})}
                    placeholder="e.g., pro, enterprise"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier-display" className="text-sm">Display Name</Label>
                  <Input
                    id="tier-display"
                    value={newTier.display_name}
                    onChange={(e) => setNewTier({...newTier, display_name: e.target.value})}
                    placeholder="e.g., Pro, Enterprise"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tier-description" className="text-sm">Description</Label>
                  <Textarea
                    id="tier-description"
                    value={newTier.description}
                    onChange={(e) => setNewTier({...newTier, description: e.target.value})}
                    placeholder="Describe this tier..."
                    className="text-sm resize-none"
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreateTier} disabled={saving} className="w-full sm:w-auto">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Create Tier
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  AI Models
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {models.map((model) => (
                  <div key={model.id} className="p-3 sm:p-4 border rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base">{model.display_name}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{model.model_id}</p>
                        <p className="text-xs text-muted-foreground mt-1">{model.description}</p>
                      </div>
                      <Badge variant={model.is_active ? "default" : "secondary"} className="self-start">
                        {model.provider}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add New Model
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model-id" className="text-sm">Model ID</Label>
                  <Input
                    id="model-id"
                    value={newModel.model_id}
                    onChange={(e) => setNewModel({...newModel, model_id: e.target.value})}
                    placeholder="e.g., fal-ai/flux/pro"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model-display" className="text-sm">Display Name</Label>
                  <Input
                    id="model-display"
                    value={newModel.display_name}
                    onChange={(e) => setNewModel({...newModel, display_name: e.target.value})}
                    placeholder="e.g., Flux Pro"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model-provider" className="text-sm">Provider</Label>
                  <Select
                    value={newModel.provider}
                    onValueChange={(value) => setNewModel({...newModel, provider: value})}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fal-ai">Fal AI</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="replicate">Replicate</SelectItem>
                      <SelectItem value="stability">Stability AI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model-description" className="text-sm">Description</Label>
                  <Textarea
                    id="model-description"
                    value={newModel.description}
                    onChange={(e) => setNewModel({...newModel, description: e.target.value})}
                    placeholder="Describe this model..."
                    className="text-sm resize-none"
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreateModel} disabled={saving} className="w-full sm:w-auto">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Model
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Model Sync Utility
              </CardTitle>
              <CardDescription>
                Automatically create missing access permissions and quota limits for existing models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">
                    If you notice that some models are missing from the Quota Management section, 
                    use this button to automatically create the missing access controls and quota limits.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This will scan all models and create default permissions based on model type and user tiers.
                  </p>
                </div>
                <Button 
                  onClick={handleSyncMissingQuotas} 
                  disabled={saving}
                  variant="outline"
                  className="shrink-0 bg-gradient-to-r from-green-500/10 to-blue-500/10 hover:from-green-500/20 hover:to-blue-500/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Sync Missing Records
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Usage Analytics
                  </CardTitle>
                  <CardDescription>
                    Monitor real-time usage across all users and models
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Label htmlFor="usage-timeframe" className="text-sm font-medium whitespace-nowrap">View:</Label>
                    <Select
                      value={usageTimeFrame}
                      onValueChange={(value: 'hourly' | 'daily' | 'monthly') => setUsageTimeFrame(value)}
                    >
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={refreshUsageData}
                    disabled={refreshingUsage}
                    variant="outline"
                    size="sm"
                    className="shrink-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200"
                  >
                    {refreshingUsage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span className="ml-2 hidden sm:inline">
                      {refreshingUsage ? "Refreshing..." : "Refresh"}
                    </span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {aggregatedUsage.slice(0, 50).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No usage data available
                  </div>
                ) : (
                  aggregatedUsage.slice(0, 50).map((item, index) => (
                    <Card key={`${item.user_id}-${item.model_id}-${item.date}-${index}`} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.profiles.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.profiles.email}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {item.images_generated} images
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Model</p>
                            <p className="font-medium">{item.image_models.display_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {usageTimeFrame === 'hourly' ? 'Date & Hour' : usageTimeFrame === 'daily' ? 'Date' : 'Month'}
                            </p>
                            <p className="font-medium">{item.dateLabel}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Images Generated</TableHead>
                      <TableHead>
                        {usageTimeFrame === 'hourly' ? 'Date & Hour' : usageTimeFrame === 'daily' ? 'Date' : 'Month'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aggregatedUsage.slice(0, 50).map((item, index) => (
                      <TableRow key={`${item.user_id}-${item.model_id}-${item.date}-${index}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.profiles.full_name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">{item.profiles.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.image_models.display_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.images_generated}</Badge>
                        </TableCell>
                        <TableCell>{item.dateLabel}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quota Edit Dialog */}
      <Dialog open={!!selectedQuota} onOpenChange={() => setSelectedQuota(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Quota Limits</DialogTitle>
            <DialogDescription>
              Update generation limits for this tier and model combination
            </DialogDescription>
          </DialogHeader>
          {selectedQuota && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hourly">Hourly Limit</Label>
                  <Input
                    id="hourly"
                    type="number"
                    value={selectedQuota.hourly_limit}
                    onChange={(e) => setSelectedQuota({
                      ...selectedQuota,
                      hourly_limit: parseInt(e.target.value)
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily">Daily Limit</Label>
                  <Input
                    id="daily"
                    type="number"
                    value={selectedQuota.daily_limit}
                    onChange={(e) => setSelectedQuota({
                      ...selectedQuota,
                      daily_limit: parseInt(e.target.value)
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly">Monthly Limit</Label>
                  <Input
                    id="monthly"
                    type="number"
                    value={selectedQuota.monthly_limit}
                    onChange={(e) => setSelectedQuota({
                      ...selectedQuota,
                      monthly_limit: parseInt(e.target.value)
                    })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedQuota(null)}>
              Cancel
            </Button>
            <Button onClick={() => selectedQuota && handleQuotaUpdate(selectedQuota)} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 