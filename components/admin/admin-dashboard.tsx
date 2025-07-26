"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { 
  Users, 
  Crown, 
  Search, 
  Calendar, 
  Image as ImageIcon,
  MoreHorizontal,
  Shield,
  TrendingUp,
  Clock,
  ArrowLeft,
  Settings
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccessControlPanel } from "./access-control-panel"
import { AnalyticsDashboard } from "./analytics-dashboard"

interface User {
  id: string
  full_name: string | null
  is_premium: boolean
  user_tier: string | null
  created_at: string
  updated_at: string
  totalImages: number
  recentImages: number
}

interface Tier {
  id: string
  name: string
  display_name: string
  description: string
  is_active: boolean
}

interface Model {
  id: string
  model_id: string
  display_name: string
  description: string
  provider: string
  is_active: boolean
}

interface AccessRecord {
  id: string
  tier_id: string
  model_id: string
  is_enabled: boolean
}

interface QuotaRecord {
  id: string
  tier_id: string
  model_id: string
  daily_limit: number
  monthly_limit: number
  hourly_limit: number
}

interface AdminData {
  tiers: Tier[]
  models: Model[]
  access: AccessRecord[]
  quotas: QuotaRecord[]
}

interface AdminDashboardProps {
  users: User[]
  currentAdminEmail: string
  adminData: AdminData
}

export function AdminDashboard({ users: initialUsers, currentAdminEmail, adminData }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    userId: string
    userName: string
    newStatus: boolean
  }>({
    isOpen: false,
    userId: "",
    userName: "",
    newStatus: false
  })
  
  const { toast } = useToast()
  const router = useRouter()

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate statistics
  const totalUsers = users.length
  const premiumUsers = users.filter(u => u.is_premium).length
  const totalImagesGenerated = users.reduce((sum, u) => sum + u.totalImages, 0)
  const imagesLast24h = users.reduce((sum, u) => sum + u.recentImages, 0)

  const handleTogglePremium = (user: User) => {
    setConfirmDialog({
      isOpen: true,
      userId: user.id,
      userName: user.full_name || user.id,
      newStatus: !user.is_premium
    })
  }

  const confirmTogglePremium = async () => {
    const { userId, newStatus } = confirmDialog
    setLoading(userId)
    
    try {
      const response = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          isPremium: newStatus,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user status')
      }

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, is_premium: newStatus }
          : user
      ))

      toast({
        title: "Success",
        description: data.message || `User ${newStatus ? "upgraded to" : "downgraded from"} premium status`,
      })
    } catch (error) {
      console.error("Error updating user:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user status",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
      setConfirmDialog({ isOpen: false, userId: "", userName: "", newStatus: false })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-purple-900">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </div>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            Logged in as: <span className="font-medium">{currentAdminEmail}</span>
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Users</CardTitle>
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="pt-1 sm:pt-2">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">{totalUsers}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {premiumUsers} premium
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Premium Users</CardTitle>
              <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
            </CardHeader>
            <CardContent className="pt-1 sm:pt-2">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600">{premiumUsers}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {totalUsers > 0 ? Math.round((premiumUsers / totalUsers) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Images</CardTitle>
              <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            </CardHeader>
            <CardContent className="pt-1 sm:pt-2">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{totalImagesGenerated}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                All time generated
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Recent Activity</CardTitle>
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
            </CardHeader>
            <CardContent className="pt-1 sm:pt-2">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600">{imagesLast24h}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Images in 24h
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs Interface */}
        <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
          <div className="relative">
            <div className="overflow-x-auto scrollbar-hide">
              <TabsList className="inline-flex h-12 sm:h-10 w-full min-w-max sm:grid sm:grid-cols-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-lg">
                <TabsTrigger value="users" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 whitespace-nowrap">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="text-xs sm:text-sm">User Management</span>
                </TabsTrigger>
                <TabsTrigger value="access" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 whitespace-nowrap">
                  <Settings className="w-4 h-4 shrink-0" />
                  <span className="text-xs sm:text-sm">Access & Configuration</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 whitespace-nowrap">
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  <span className="text-xs sm:text-sm">Analytics</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* User Management Tab */}
          <TabsContent value="users">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage user premium status and view user statistics
                </CardDescription>
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No users found matching your search.
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 sm:gap-3 mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {user.full_name || "Unknown User"}
                            </h3>
                                                    <Badge
                          variant={user.is_premium ? "default" : "secondary"}
                          className={user.is_premium ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white shrink-0" : "shrink-0"}
                        >
                          {user.user_tier ? (
                            <div className="flex items-center gap-1">
                              {user.user_tier === 'admin' && <Shield className="w-3 h-3" />}
                              {user.user_tier === 'premium' && <Crown className="w-3 h-3" />}
                              <span className="hidden sm:inline capitalize">{user.user_tier}</span>
                              <span className="sm:hidden capitalize">{user.user_tier}</span>
                            </div>
                          ) : (
                            "Free"
                          )}
                        </Badge>
                          </div>
                          
                          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div className="truncate">ID: {user.id}</div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                              <span className="flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                <span className="text-xs">{user.totalImages} total</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                <span className="text-xs">{user.recentImages} in 24h</span>
                              </span>
                              <span className="hidden sm:flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span className="text-xs">Joined {new Date(user.created_at).toLocaleDateString()}</span>
                              </span>
                            </div>
                            <div className="sm:hidden flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span className="text-xs">Joined {new Date(user.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              disabled={loading === user.id}
                              className="shrink-0 self-start sm:self-center"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleTogglePremium(user)}
                              className="flex items-center gap-2"
                            >
                              <Crown className="w-4 h-4" />
                              {user.is_premium ? "Remove Premium" : "Grant Premium"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Access & Configuration Tab */}
          <TabsContent value="access">
            <AccessControlPanel 
              initialData={{
                tiers: adminData.tiers.map(tier => ({
                  id: tier.id,
                  name: tier.name,
                  display_name: tier.display_name,
                  description: tier.description,
                  is_active: tier.is_active
                })),
                models: adminData.models.map(model => ({
                  id: model.id,
                  model_id: model.model_id,
                  display_name: model.display_name,
                  description: model.description,
                  provider: model.provider,
                  is_active: model.is_active
                })),
                access: adminData.access.map(access => ({
                  id: access.id,
                  tier_id: access.tier_id,
                  model_id: access.model_id,
                  is_enabled: access.is_enabled,
                  user_tiers: { 
                    name: adminData.tiers.find(t => t.id === access.tier_id)?.name || '',
                    display_name: adminData.tiers.find(t => t.id === access.tier_id)?.display_name || ''
                  },
                  image_models: { 
                    model_id: adminData.models.find(m => m.id === access.model_id)?.model_id || '',
                    display_name: adminData.models.find(m => m.id === access.model_id)?.display_name || ''
                  }
                })),
                quotas: adminData.quotas.map(quota => ({
                  id: quota.id,
                  tier_id: quota.tier_id,
                  model_id: quota.model_id,
                  daily_limit: quota.daily_limit,
                  monthly_limit: quota.monthly_limit || 0,
                  hourly_limit: quota.hourly_limit || 0,
                  user_tiers: { 
                    name: adminData.tiers.find(t => t.id === quota.tier_id)?.name || '',
                    display_name: adminData.tiers.find(t => t.id === quota.tier_id)?.display_name || ''
                  },
                  image_models: { 
                    model_id: adminData.models.find(m => m.id === quota.model_id)?.model_id || '',
                    display_name: adminData.models.find(m => m.id === quota.model_id)?.display_name || ''
                  }
                }))
              }} 
              defaultTab="models" 
            />
          </TabsContent>

          {/* Other tabs will be implemented in the AccessControlPanel */}
          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmDialog.isOpen} onOpenChange={(open) => 
          setConfirmDialog(prev => ({ ...prev, isOpen: open }))
        }>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog.newStatus ? "Grant Premium Access" : "Remove Premium Access"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {confirmDialog.newStatus ? "grant premium access to" : "remove premium access from"} {confirmDialog.userName}?
                {confirmDialog.newStatus && " This will give them unlimited image generation and access to all models."}
                {!confirmDialog.newStatus && " This will limit them to the free tier quotas and models."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmTogglePremium}
                className={confirmDialog.newStatus ? "bg-yellow-600 hover:bg-yellow-700" : "bg-red-600 hover:bg-red-700"}
              >
                {confirmDialog.newStatus ? "Grant Premium" : "Remove Premium"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
} 