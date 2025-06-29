"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  BarChart3,
  RefreshCw,
  Loader2,
  TrendingUp,
  Users,
  ImageIcon
} from "lucide-react"

interface UsageData {
  id: string
  user_id: string
  model_id: string
  images_generated: number
  date: string
  hour: number
  profiles: { full_name: string; email?: string }
  image_models: { model_id: string; display_name: string }
}

interface AnalyticsDashboardProps {
  initialData?: {
    usage?: UsageData[]
  }
}

export function AnalyticsDashboard({ initialData }: AnalyticsDashboardProps) {
  const [usage, setUsage] = useState<UsageData[]>(initialData?.usage || [])
  const [refreshingUsage, setRefreshingUsage] = useState(false)
  const [usageTimeFrame, setUsageTimeFrame] = useState<'hourly' | 'daily' | 'monthly'>('daily')
  
  const { toast } = useToast()

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

  // Calculate summary statistics
  const totalImages = aggregatedUsage.reduce((sum, item) => sum + item.images_generated, 0)
  const uniqueUsers = new Set(aggregatedUsage.map(item => item.user_id)).size
  const uniqueModels = new Set(aggregatedUsage.map(item => item.model_id)).size
  const recentActivity = aggregatedUsage.filter(item => {
    const itemDate = new Date(item.date)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return itemDate >= yesterday
  }).reduce((sum, item) => sum + item.images_generated, 0)

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
        setUsage([])
      }
    } catch (error) {
      console.error('Error loading usage data:', error)
      setUsage([])
    }
  }

  const refreshUsageData = async () => {
    setRefreshingUsage(true)
    try {
      await loadUsageData()
      toast({
        title: "Success",
        description: "Usage data refreshed successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh usage data",
        variant: "destructive",
      })
    } finally {
      setRefreshingUsage(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Usage Analytics</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Monitor real-time usage across all users and models
          </p>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Images</CardTitle>
            <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="pt-1 sm:pt-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">{totalImages}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              All time total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Active Users</CardTitle>
            <Users className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="pt-1 sm:pt-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{uniqueUsers}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              With usage data
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Models Used</CardTitle>
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
          </CardHeader>
          <CardContent className="pt-1 sm:pt-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600">{uniqueModels}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Different models
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Recent Activity</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="pt-1 sm:pt-2">
            <div className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">{recentActivity}</div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Usage Table */}
      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Detailed Usage Data
              </CardTitle>
              <CardDescription>
                Recent usage activity across all users and models
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
                {aggregatedUsage.slice(0, 50).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No usage data available
                    </TableCell>
                  </TableRow>
                ) : (
                  aggregatedUsage.slice(0, 50).map((item, index) => (
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 