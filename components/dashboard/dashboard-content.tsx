"use client"

import React, { useEffect, useState, lazy, Suspense, useCallback } from "react"
import NextImage from "next/image"
import { LazyOptimizedImage, OptimizedImage } from "@/components/ui/optimized-image"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { ADMIN_EMAILS, isAdminEmail } from "@/lib/admin-config"
import { Sparkles, History, User, LogOut, Plus, Square, RectangleHorizontal, RectangleVertical, Settings2, Zap, Image as ImageIcon, Rocket, PenTool, Palette, Brain, Bot, Folder, Menu, UserCircle, Trash2, Lock, Shield, RefreshCw, Wand2, Edit, Paintbrush, RotateCcw, Undo2, ChevronDown, ChevronUp, Lightbulb, Copy } from "lucide-react"
import { QuotaLimitDialog } from "@/components/ui/quota-limit-dialog"
import { AuroraText } from "@/components/ui/aurora-text"
import { useRouter } from "next/navigation"
import Image from "next/image"
import type { Database } from "@/lib/supabase/types"
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/components/providers/locale-provider"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { Slider } from "@/components/ui/slider"
import { Skeleton } from "@/components/ui/skeleton"

// Dynamic imports for heavy components to improve initial load
const SmartPromptBuilder = lazy(() => import("./smart-prompt-builder").then(module => ({ default: module.SmartPromptBuilder })))
const ObjectDetectionPanel = lazy(() => import("./object-detection-panel").then(module => ({ default: module.ObjectDetectionPanel })))
const SmartObjectEditor = lazy(() => import("./smart-object-editor").then(module => ({ default: module.SmartObjectEditor })))
const AutoLassoEditor = lazy(() => import("./auto-lasso-editor").then(module => ({ default: module.AutoLassoEditor })))

type GeneratedImage = Database["public"]["Tables"]["generated_images"]["Row"]

interface DashboardContentProps {
  initialImages: GeneratedImage[]
}

// --- Image Generation Quota Config ---
const IMAGE_GENERATION_QUOTA_PER_DAY = 3; // Keep in sync with API

// Add a type for available models
interface AvailableModel {
  id: string;
  name: string;
  description: string;
  icon: any;
  iconColor: string;
  bgColor: string;
  category: string;
  price?: string;
}

// Component loading fallback
const ComponentSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="h-10 w-32" />
  </div>
)

export function DashboardContent({ initialImages }: DashboardContentProps) {
  const { t } = useTranslation()
  
  // Admin state - declare FIRST to prevent any reference errors
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  
  // Ensure isAdmin is always defined
  const isAdminUser = isAdmin === true
  
  // Core state variables (loaded immediately)
  const [prompt, setPrompt] = useState("")
  const [model, setModel] = useState("fal-ai/fast-sdxl")
  const [aspectRatio, setAspectRatio] = useState("1:1")
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>(initialImages)
  const [activeTab, setActiveTab] = useState("generate")
  
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  
  // Delayed state variables (loaded after initial render)
  const [advancedSettings, setAdvancedSettings] = useState({
    customDialogOpen: false,
    customWidth: 1,
    customHeight: 1,
    renderingSpeed: 'BALANCED',
    style: 'AUTO',
    expandPrompt: true,
    imageSize: 'square_hd',
    numImages: 1,
    guidanceScale: 7.5,
    numSteps: 25,
    expandPromptFast: false,
    enableSafetyChecker: true,
    negativePrompt: '',
    format: 'jpeg',
    seed: '',
    styleCodes: '',
    colorPalette: '',
    customPalette: '',
    showAdvancedSettings: false,
  })
  
  const [uiState, setUiState] = useState({
    expandedImage: null as GeneratedImage | null,
    showFullPrompt: false,
    promptDialogOpen: false,
    promptDialogText: "",
    copied: false,
    improvingPrompt: false,
    userMenuOpen: false,
    deleteDialogOpen: false,
    pendingDeleteImageId: null as string | null,
    currentModelIndex: 0,
    modelPanelOpen: false,
    showSmartPromptBuilder: false,
  })
  
  const [editingState, setEditingState] = useState({
    editMode: false,
    editPrompt: "",
    editGuidanceScale: 0.1,
    inpaintStrength: 0.85,
    editLoading: false,
    editedImageUrl: null as string | null,
    showBeforeAfter: false,
    editHistory: [] as Array<{id: string, prompt: string, imageUrl: string}>,
    sliderPosition: 50,
    inpaintMode: false,
    brushSize: 20,
    isDrawing: false,
    maskCanvas: null as HTMLCanvasElement | null,
    maskContext: null as CanvasRenderingContext2D | null,
    imageRef: null as HTMLImageElement | null,
    lastInpaintResult: null as {imageId: string, imageUrl: string, editHistoryEntry: {id: string, prompt: string, imageUrl: string}} | null,
    showUndoButton: false,
  })
  
  const [albums, setAlbums] = useState<any[]>([])
  const [selectedAlbum, setSelectedAlbum] = useState<any | null>(null)
  const [albumImages, setAlbumImages] = useState<GeneratedImage[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null)
  const [editingAlbumName, setEditingAlbumName] = useState<string>('')
  
  // User and quota state
  const [userState, setUserState] = useState({
    quotaUsed: null as number | null,
    quotaLimit: 3,
    quotaLeft: null as number | null,
    userName: null as string | null,
    isFreeUser: false,
    profileLoading: true,
    userEmail: null as string | null,
    userAccessibleModels: [] as string[],
    refreshingPermissions: false,
  })



  // Quota limit dialog state
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false)
  const [quotaDialogData, setQuotaDialogData] = useState<{
    title: string
    message: string
    quotaInfo?: { used: number; limit: number; period: "hourly" | "daily" | "monthly" }
  }>({ title: "", message: "" })
  
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [pinError, setPinError] = useState("")
  const categories = ["Text to Image"]
  
  // SeedEdit model state (lazy loaded)
  const [seedEditState, setSeedEditState] = useState({
    imageUrl: '',
    referenceMethod: 'upload' as 'url' | 'upload',
    uploadedFile: null as File | null,
    uploadedFilePreview: null as string | null,
  })

  // Extract current values for easier access
  const { 
    customDialogOpen, customWidth, customHeight, renderingSpeed, style, expandPrompt,
    imageSize, numImages, guidanceScale, numSteps, expandPromptFast, enableSafetyChecker,
    negativePrompt, format, seed, styleCodes, colorPalette, customPalette
  } = advancedSettings

  const {
    expandedImage, showFullPrompt, promptDialogOpen, promptDialogText, copied, improvingPrompt,
    userMenuOpen, deleteDialogOpen, pendingDeleteImageId, currentModelIndex, modelPanelOpen,
    showSmartPromptBuilder
  } = uiState

  const {
    editMode, editPrompt, editGuidanceScale, inpaintStrength, editLoading, editedImageUrl,
    showBeforeAfter, editHistory, sliderPosition, inpaintMode, brushSize, isDrawing,
    maskCanvas, maskContext, imageRef, lastInpaintResult, showUndoButton
  } = editingState

  const {
    quotaUsed, quotaLimit, quotaLeft, userName, isFreeUser, profileLoading,
    userEmail, userAccessibleModels, refreshingPermissions
  } = userState

  const { imageUrl, referenceMethod, uploadedFile, uploadedFilePreview } = seedEditState

  // Convenience update functions
  const updateAdvancedSettings = useCallback((updates: Partial<typeof advancedSettings>) => {
    setAdvancedSettings(prev => ({ ...prev, ...updates }))
  }, [])

  const updateUiState = useCallback((updates: Partial<typeof uiState>) => {
    setUiState(prev => ({ ...prev, ...updates }))
  }, [])

  const updateEditingState = useCallback((updates: Partial<typeof editingState>) => {
    setEditingState(prev => ({ ...prev, ...updates }))
  }, [])

  const updateUserState = useCallback((updates: Partial<typeof userState>) => {
    setUserState(prev => ({ ...prev, ...updates }))
  }, [])

  const updateSeedEditState = useCallback((updates: Partial<typeof seedEditState>) => {
    setSeedEditState(prev => ({ ...prev, ...updates }))
  }, [])

  // Convenience function for userMenuOpen
  const setUserMenuOpen = useCallback((open: boolean | ((prev: boolean) => boolean)) => {
    if (typeof open === 'function') {
      updateUiState({ userMenuOpen: open(userMenuOpen) })
    } else {
      updateUiState({ userMenuOpen: open })
    }
  }, [updateUiState, userMenuOpen])

  // Load user data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('🔍 Loading user data...')
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          console.log('✅ User loaded successfully:', user.email)
          updateUserState({
            userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            userEmail: user.email || null,
            profileLoading: false
          })
        } else {
          console.log('⚠️ No user found')
        }
      } catch (error) {
        console.error('❌ Error loading user data:', error)
        updateUserState({ profileLoading: false })
      }
    }

    loadUserData()
  }, [supabase])

  // Check admin status when user email is loaded
  useEffect(() => {
    if (userEmail) {
      console.log('Setting admin status for email:', userEmail)
      const adminStatus = isAdminEmail(userEmail)
      console.log('Admin status:', adminStatus)
      setIsAdmin(adminStatus)
    } else {
      setIsAdmin(false)
    }
  }, [userEmail])

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/auth/signin')
    } catch (error) {
      console.error('Error signing out:', error)
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Refresh model permissions
  const refreshModelPermissions = async () => {
    updateUserState({ refreshingPermissions: true })
    try {
      // This would typically fetch updated model permissions from the API
      console.log('Refreshing model permissions...')
      // For now, just simulate a refresh
      setTimeout(() => {
        updateUserState({ refreshingPermissions: false })
        toast({
          title: "Success",
          description: "Model permissions refreshed.",
        })
      }, 1000)
    } catch (error) {
      updateUserState({ refreshingPermissions: false })
      toast({
        title: "Error",
        description: "Failed to refresh permissions.",
        variant: "destructive",
      })
    }
  }

  // Available models array (placeholder)
  const availableModels = [
    { 
      id: 'fal-ai/fast-sdxl', 
      name: 'Fast SDXL', 
      description: 'Fast SDXL model for image generation',
      icon: Sparkles,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      category: 'Text to Image',
      price: 'Free'
    }
  ]

  // Check if model is accessible
  const isModelAccessible = (modelId: string) => {
    return userAccessibleModels.includes(modelId) || !isFreeUser
  }

  // Check if model is new
  const isModelNew = (modelId: string) => {
    return false // Placeholder
  }

  // Set model panel open
  const setModelPanelOpen = (open: boolean) => {
    updateUiState({ modelPanelOpen: open })
  }

  // Convenience functions for advanced settings
  const setCustomDialogOpen = (open: boolean) => {
    updateAdvancedSettings({ customDialogOpen: open })
  }

  const setCustomWidth = (width: number) => {
    updateAdvancedSettings({ customWidth: width })
  }

  const setCustomHeight = (height: number) => {
    updateAdvancedSettings({ customHeight: height })
  }

  // Convenience functions for UI state
  const setShowSmartPromptBuilder = (show: boolean) => {
    updateUiState({ showSmartPromptBuilder: show })
  }

  const setPromptDialogOpen = (open: boolean) => {
    updateUiState({ promptDialogOpen: open })
  }

  const setPromptDialogText = (text: string) => {
    updateUiState({ promptDialogText: text })
  }

  const setImprovingPrompt = (improving: boolean) => {
    updateUiState({ improvingPrompt: improving })
  }

  // Missing setter functions
  const setExpandedImage = (image: GeneratedImage | null) => {
    updateUiState({ expandedImage: image })
  }

  const setShowFullPrompt = (show: boolean) => {
    updateUiState({ showFullPrompt: show })
  }

  const setPendingDeleteImageId = (id: string | null) => {
    updateUiState({ pendingDeleteImageId: id })
  }

  // Album editing functions
  const startEditingAlbum = (album: any) => {
    setEditingAlbumId(album.id)
    setEditingAlbumName(album.name)
  }

  const saveAlbumName = async () => {
    // Placeholder for album name saving
    console.log('Saving album name:', editingAlbumName)
    setEditingAlbumId(null)
    setEditingAlbumName('')
  }

  const cancelEditingAlbum = () => {
    setEditingAlbumId(null)
    setEditingAlbumName('')
  }

  // Editing mode functions
  const resetEditMode = () => {
    updateEditingState({
      editMode: false,
      editPrompt: '',
      editGuidanceScale: 0.1,
      inpaintStrength: 0.85,
      editLoading: false,
      editedImageUrl: null,
      showBeforeAfter: false,
      editHistory: [],
      sliderPosition: 50,
      inpaintMode: false,
      brushSize: 20,
      isDrawing: false,
      maskCanvas: null,
      maskContext: null,
      imageRef: null,
      lastInpaintResult: null,
      showUndoButton: false,
    })
  }

  const setShowBeforeAfter = (show: boolean) => {
    updateEditingState({ showBeforeAfter: show })
  }

  const setEditMode = (mode: boolean) => {
    updateEditingState({ editMode: mode })
  }

  const setEditPrompt = (prompt: string) => {
    updateEditingState({ editPrompt: prompt })
  }

  const setSliderPosition = (position: number) => {
    updateEditingState({ sliderPosition: position })
  }

  // Placeholder functions for missing functionality
  const generateImage = async () => {
    console.log('Generate image function placeholder')
  }

  const handleAspectRatioChange = (value: string) => {
    setAspectRatio(value)
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Custom submit placeholder')
    setCustomDialogOpen(false)
  }

  // Advanced settings setters
  const setImageSize = (size: string) => {
    updateAdvancedSettings({ imageSize: size })
  }

  const setNumImages = (num: number) => {
    updateAdvancedSettings({ numImages: num })
  }

  const setGuidanceScale = (scale: number) => {
    updateAdvancedSettings({ guidanceScale: scale })
  }

  const setNumSteps = (steps: number) => {
    updateAdvancedSettings({ numSteps: steps })
  }

  const setExpandPromptFast = (expand: boolean) => {
    updateAdvancedSettings({ expandPromptFast: expand })
  }

  const setEnableSafetyChecker = (enable: boolean) => {
    updateAdvancedSettings({ enableSafetyChecker: enable })
  }

  const setNegativePrompt = (prompt: string) => {
    updateAdvancedSettings({ negativePrompt: prompt })
  }

  const setFormat = (format: string) => {
    updateAdvancedSettings({ format })
  }

  const setSeed = (seed: string) => {
    updateAdvancedSettings({ seed })
  }

  // Essential UI state setter
  const setDeleteDialogOpen = (open: boolean) => {
    updateUiState({ deleteDialogOpen: open })
  }

  // Additional required setters
  const setStyle = (style: string) => {
    updateAdvancedSettings({ style })
  }

  const setRenderingSpeed = (speed: string) => {
    updateAdvancedSettings({ renderingSpeed: speed })
  }

  const setExpandPrompt = (expand: boolean) => {
    updateAdvancedSettings({ expandPrompt: expand })
  }

  const setStyleCodes = (codes: string) => {
    updateAdvancedSettings({ styleCodes: codes })
  }

  const setColorPalette = (palette: string) => {
    updateAdvancedSettings({ colorPalette: palette })
  }

  const setCustomPalette = (palette: string) => {
    updateAdvancedSettings({ customPalette: palette })
  }

  const setReferenceMethod = (method: 'url' | 'upload') => {
    updateSeedEditState({ referenceMethod: method })
  }

  const setImageUrl = (url: string) => {
    updateSeedEditState({ imageUrl: url })
  }

  const handleFileUpload = (file: File | null) => {
    updateSeedEditState({ uploadedFile: file })
  }

  const setUploadedFile = (file: File | null) => {
    updateSeedEditState({ uploadedFile: file })
  }

  const setUploadedFilePreview = (preview: string | null) => {
    updateSeedEditState({ uploadedFilePreview: preview })
  }

  // Kontext state variables (minimal implementation)
  const [referenceMethodKontext, setReferenceMethodKontext] = useState<'url' | 'upload'>('upload')
  const [imageUrlKontext, setImageUrlKontext] = useState('')
  const [uploadingKontext] = useState(false)
  const [uploadedFileKontext, setUploadedFileKontext] = useState<File | null>(null)
  const [uploadedFilePreviewKontext, setUploadedFilePreviewKontext] = useState<string | null>(null)

  // Kontext Max state variables
  const [referenceMethodKontextMax, setReferenceMethodKontextMax] = useState<'url' | 'upload'>('upload')
  const [imageUrlKontextMax, setImageUrlKontextMax] = useState('')
  const [uploadingKontextMax] = useState(false)
  const [uploadedFileKontextMax, setUploadedFileKontextMax] = useState<File | null>(null)
  const [uploadedFilePreviewKontextMax, setUploadedFilePreviewKontextMax] = useState<string | null>(null)

  const handleFileUploadKontext = (file: File | null) => {
    // Minimal implementation for Kontext file upload
    console.log('Kontext file upload:', file)
  }

  const handleFileUploadKontextMax = (file: File | null) => {
    // Minimal implementation for Kontext Max file upload
    console.log('Kontext Max file upload:', file)
  }

  // Additional missing state variables
  const [safetyTolerance, setSafetyTolerance] = useState('medium')
  const [outputFormat, setOutputFormat] = useState('jpeg')

  // Continue with the rest of the component...

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-safe-top pb-safe-bottom">
      <div className="relative z-10">
        {/* Header - Mobile Optimized */}
        <header className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-sm sticky top-0 z-50 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-2">
            {/* Mobile Header Layout */}
            <div className="flex items-center justify-between w-full">
              {/* Logo */}
              <button 
                onClick={() => {
                  setActiveTab("generate")
                  setUserMenuOpen(false)
                }}
                className="flex items-center space-x-2 group cursor-pointer hover:scale-105 transition-transform duration-200 touch-manipulation"
                title="Generate AI Image"
              >
                <AuroraText className="text-xl sm:text-2xl group-hover:scale-105 transition-transform duration-200">
                  AI Image Studio
                </AuroraText>
              </button>
              
              {/* Mobile Menu Button */}
              <button 
                className="sm:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-manipulation" 
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-label="Toggle menu"
              >
                <Menu className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </button>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden sm:flex items-center gap-2 md:gap-3 mt-3 sm:mt-0">
              <Button
                variant={activeTab === "generate" ? "default" : "ghost"}
                onClick={() => setActiveTab("generate")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm touch-manipulation ${activeTab === "generate" ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">{t('dashboard.tabs.generate')}</span>
              </Button>
              <Button
                variant={activeTab === "history" ? "default" : "ghost"}
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm touch-manipulation ${activeTab === "history" ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
              >
                <History className="w-4 h-4" />
                <span className="hidden md:inline">{t('dashboard.tabs.history')}</span>
              </Button>
              <Button
                variant={activeTab === "albums" ? "default" : "ghost"}
                onClick={() => setActiveTab("albums")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm touch-manipulation ${activeTab === "albums" ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
              >
                <Folder className="w-4 h-4" />
                <span className="hidden md:inline">{t('dashboard.tabs.albums')}</span>
              </Button>
              <Button
                variant={activeTab === "profile" ? "default" : "ghost"}
                onClick={() => setActiveTab("profile")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm touch-manipulation ${activeTab === "profile" ? "bg-purple-600 hover:bg-purple-700 text-white shadow-sm" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
              >
                <UserCircle className="w-4 h-4" />
                <span className="hidden lg:inline">
                  {userName ? `Welcome, ${userName}` : t('dashboard.tabs.profile')}
                </span>
                <span className="lg:hidden">{t('dashboard.tabs.profile')}</span>
              </Button>
              {isAdminUser && (
                <Button
                  variant="outline"
                  onClick={() => router.push('/admin')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-700 dark:text-red-400 text-sm touch-manipulation"
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden md:inline">{t('dashboard.tabs.admin')}</span>
                </Button>
              )}
              {/* Language Switcher */}
              <LanguageSwitcher variant="ghost" size="sm" />
            </nav>
            
            {/* Mobile Navigation Dropdown */}
            {userMenuOpen && (
              <div className="sm:hidden border-t border-gray-200/50 dark:border-gray-700/50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
                <nav className="container mx-auto px-3 py-3 space-y-2">
                <Button
                  variant={activeTab === "generate" ? "default" : "ghost"}
                  onClick={() => {
                    setActiveTab("generate")
                    setUserMenuOpen(false)
                  }}
                  className={`w-full justify-start gap-3 h-12 text-base touch-manipulation ${activeTab === "generate" ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
                >
                  <Plus className="w-5 h-5" />
                  <span>{t('dashboard.tabs.generate')}</span>
                </Button>
                <Button
                  variant={activeTab === "history" ? "default" : "ghost"}
                  onClick={() => {
                    setActiveTab("history")
                    setUserMenuOpen(false)
                  }}
                  className={`w-full justify-start gap-3 h-12 text-base touch-manipulation ${activeTab === "history" ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
                >
                  <History className="w-5 h-5" />
                  <span>{t('dashboard.tabs.history')}</span>
                </Button>
                <Button
                  variant={activeTab === "albums" ? "default" : "ghost"}
                  onClick={() => {
                    setActiveTab("albums")
                    setUserMenuOpen(false)
                  }}
                  className={`w-full justify-start gap-3 h-12 text-base touch-manipulation ${activeTab === "albums" ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
                >
                  <Folder className="w-5 h-5" />
                  <span>{t('dashboard.tabs.albums')}</span>
                </Button>
                <Button
                  variant={activeTab === "profile" ? "default" : "ghost"}
                  onClick={() => {
                    setActiveTab("profile")
                    setUserMenuOpen(false)
                  }}
                  className={`w-full justify-start gap-3 h-12 text-base touch-manipulation ${activeTab === "profile" ? "bg-purple-600 hover:bg-purple-700 text-white shadow-sm" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
                >
                  <UserCircle className="w-5 h-5" />
                  <span>
                    {userName ? `Welcome, ${userName}` : t('dashboard.tabs.profile')}
                  </span>
                </Button>
                {isAdminUser && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      router.push('/admin')
                      setUserMenuOpen(false)
                    }}
                    className="w-full justify-start gap-3 h-12 text-base border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-700 dark:text-red-400 touch-manipulation"
                  >
                    <Shield className="w-5 h-5" />
                    <span>{t('dashboard.tabs.admin')}</span>
                  </Button>
                )}
                
                {/* Bottom Actions */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                  <LanguageSwitcher variant="ghost" size="sm" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 h-10 px-3 touch-manipulation"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('dashboard.actions.logOut')}</span>
                  </Button>
                </div>
              </nav>
            </div>
          )}
        </div>
        </header>

        <div className="container mx-auto px-3 sm:px-4 py-4 pb-20 sm:pb-4">
          <div className="flex gap-4">
            {/* Model Selection Side Panel - only show on Generate tab */}
            {activeTab === "generate" && (
              <>
                {/* Desktop Side Panel - Simplified */}
                <div className="hidden lg:block w-80 xl:w-96 flex-shrink-0">
                  <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg sticky top-20 max-h-[calc(100vh-6rem)] rounded-xl overflow-hidden flex flex-col">
                    <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <span className="text-gray-900 dark:text-gray-100">
                            {t('dashboard.generate.aiModels')}
                          </span>
                        </CardTitle>
                        {isFreeUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={refreshModelPermissions}
                            disabled={refreshingPermissions}
                            className="h-8 px-3 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            {refreshingPermissions ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                          </Button>
                        )}
                      </div>
                      
                      {/* Simplified Stats */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {Math.min(userAccessibleModels.length, availableModels.length)} of {availableModels.length} models
                          </span>
                        </div>
                        <Button 
                          size="sm" 
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 h-auto rounded-md"
                        >
                          Upgrade
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-4 px-4 flex-1 overflow-y-auto">
                      {!profileLoading ? (
                        <div className="space-y-3 pb-4">
                          {/* Simplified Model List */}
                          {availableModels.map((modelOption: AvailableModel) => {
                            const isAccessible = isModelAccessible(modelOption.id);
                            const isSelected = model === modelOption.id;
                            
                            return (
                              <div
                                key={modelOption.id}
                                className={`relative p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                  isAccessible
                                    ? isSelected
                                      ? 'border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-700'
                                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50'
                                }`}
                                onClick={() => {
                                  if (isAccessible) {
                                    setModel(modelOption.id)
                                    setActiveTab("generate")
                                    if (!selectedCategories.includes("Text to Image")) {
                                      setSelectedCategories(["Text to Image"])
                                    }
                                  } else {
                                    toast({
                                      title: t('dashboard.generate.premiumModel'),
                                      description: t('dashboard.generate.upgradeToUnlock', { modelName: modelOption.name }),
                                      variant: "destructive",
                                    })
                                  }
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  {/* Simplified Icon */}
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    isAccessible ? modelOption.bgColor : 'bg-gray-100 dark:bg-gray-700'
                                  }`}>
                                    <modelOption.icon className={`w-5 h-5 ${
                                      isAccessible ? modelOption.iconColor : 'text-gray-500 dark:text-gray-400'
                                    }`} />
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                                        {modelOption.name}
                                      </h3>
                                      
                                      <div className="flex items-center gap-2">
                                        {/* NEW Badge - Simplified */}
                                        {isModelNew(modelOption.id) && (
                                          <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 rounded">
                                            NEW
                                          </span>
                                        )}
                                        
                                        {/* Access Badge - Simplified */}
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                          isAccessible 
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                        }`}>
                                          {isAccessible ? 'FREE' : 'PRO'}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                      {modelOption.description}
                                    </p>
                                    
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {modelOption.category}
                                      </span>
                                      
                                      {isAccessible && modelOption.price && (
                                        <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                          {modelOption.price}
                                        </span>
                                      )}
                                      
                                      {!isAccessible && (
                                        <Lock className="w-3 h-3 text-gray-400" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          
                          {/* Simplified Upgrade Banner */}
                          {userAccessibleModels.length < availableModels.length && (
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 text-center mt-4">
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                <span className="font-medium text-sm text-purple-900 dark:text-purple-100">
                                  Unlock {availableModels.length - userAccessibleModels.length} More Models
                                </span>
                              </div>
                              <p className="text-xs text-purple-700 dark:text-purple-300 mb-3">
                                Access premium AI models and advanced features
                              </p>
                              <Button className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 h-auto rounded-md w-full">
                                {t('dashboard.generate.upgradeNow')}
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
                          <span className="text-gray-500 text-sm">{t('dashboard.generate.loadingModels')}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Mobile Model Panel Toggle */}
                <div className="lg:hidden fixed bottom-4 right-4 z-50">
                  <Button
                    onClick={() => setModelPanelOpen(true)}
                    className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
                  >
                    <Bot className="w-6 h-6" />
                  </Button>
                </div>

                {/* Mobile Model Panel Dialog */}
                <Dialog open={modelPanelOpen} onOpenChange={setModelPanelOpen}>
                  <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col p-0">
                    <DialogHeader className="p-4 pb-0">
                      <DialogTitle className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-purple-600" />
                        {t('dashboard.generate.aiModels')}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 mx-4 rounded-lg">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {Math.min(userAccessibleModels.length, availableModels.length)} of {availableModels.length} models
                      </span>
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white border-0 text-xs px-2 py-1 h-6">
                        {t('dashboard.generate.unlockAll')}
                      </Button>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto">
                      {!profileLoading ? (
                        <div className="space-y-3">
                          {/* Mobile Model List */}
                          {availableModels.map((modelOption: AvailableModel) => {
                            const isAccessible = isModelAccessible(modelOption.id);
                            const isSelected = model === modelOption.id;
                            
                            return (
                              <div
                                key={modelOption.id}
                                className={`relative p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                  isAccessible
                                    ? isSelected
                                      ? 'border-primary bg-primary/5 shadow-md'
                                      : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:shadow-sm'
                                    : 'border-purple-300 bg-purple-50 dark:bg-purple-900/30 hover:shadow-md'
                                }`}
                                onClick={() => {
                                  if (isAccessible) {
                                    setModel(modelOption.id)
                                    setModelPanelOpen(false)
                                    setActiveTab("generate")
                                    if (!selectedCategories.includes("Text to Image")) {
                                      setSelectedCategories(["Text to Image"])
                                    }
                                  } else {
                                    toast({
                                      title: t('dashboard.generate.premiumModel'),
                                      description: t('dashboard.generate.upgradeToUnlock', { modelName: modelOption.name }),
                                      variant: "destructive",
                                    })
                                  }
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    isAccessible ? modelOption.bgColor : 'bg-purple-100 dark:bg-purple-800'
                                  }`}>
                                    <modelOption.icon className={`w-5 h-5 ${
                                      isAccessible ? modelOption.iconColor : 'text-purple-600 dark:text-purple-300'
                                    }`} />
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <h3 className={`font-semibold text-sm truncate ${
                                          isAccessible ? 'text-gray-900 dark:text-gray-100' : 'text-purple-900 dark:text-purple-100'
                                        }`}>
                                          {modelOption.name}
                                        </h3>
                                        
                                        {/* NEW Badge */}
                                        {isModelNew(modelOption.id) && (
                                          <div className="px-1.5 py-0.5 rounded text-xs font-bold bg-orange-500 text-white animate-pulse flex-shrink-0">
                                            NEW
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className={`px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 ml-2 ${
                                        isAccessible 
                                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                          : 'bg-purple-500 text-white'
                                      }`}>
                                        {isAccessible ? 'FREE' : 'PRO'}
                                      </div>
                                    </div>
                                    
                                    <p className={`text-xs mt-1 ${
                                      isAccessible ? 'text-gray-600 dark:text-gray-400' : 'text-purple-700 dark:text-purple-300'
                                    }`}>
                                      {modelOption.description}
                                    </p>
                                    
                                    <div className="flex items-center justify-between mt-2">
                                      <span className={`text-xs font-medium ${
                                        isAccessible ? 'text-primary' : 'text-purple-600 dark:text-purple-400'
                                      }`}>
                                        {modelOption.category}
                                      </span>
                                      
                                      {isAccessible && modelOption.price && (
                                        <span className="text-xs font-medium text-green-600">{modelOption.price}</span>
                                      )}
                                    
                                      {!isAccessible && (
                                        <Lock className="w-3 h-3 text-purple-600" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          
                          {/* Bottom FOMO Banner Mobile */}
                          <div className="p-3 bg-purple-600 rounded-lg text-white text-center mt-4">
                            <div className="flex items-center justify-center gap-1 mb-2">
                              <Sparkles className="w-4 h-4" />
                              <span className="font-bold text-sm">{t('dashboard.generate.missingModels', { count: availableModels.length - userAccessibleModels.length })}</span>
                            </div>
                            <Button className="bg-white text-purple-600 hover:bg-gray-100 font-bold text-xs px-3 py-1 h-7">
                              {t('dashboard.generate.upgradeNow')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse flex items-center justify-center">
                          <span className="text-gray-500 text-sm">{t('dashboard.generate.loadingModels')}</span>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
            {/* Main Content */}
            <div className="flex-1 w-full">
              {activeTab === "generate" && (
                <div className="space-y-6">
                  {/* Smart Prompt Builder - Full width above the grid */}
                  {showSmartPromptBuilder && selectedCategories.includes("Text to Image") && (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6">
                      <Suspense fallback={<ComponentSkeleton />}>
                        <SmartPromptBuilder
                          initialPrompt={prompt}
                          onPromptChange={(newPrompt) => setPrompt(newPrompt)}
                          onClose={() => setShowSmartPromptBuilder(false)}
                        />
                      </Suspense>
                    </div>
                  )}
                  
                  {/* Mobile-optimized layout */}
                  <div className="w-full max-w-none">
                    {selectedCategories.length === 0 ? (
                      images.length > 0 && (
                        <div className="mb-6">
                          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
                            <CardHeader>
                              <CardTitle>{t('dashboard.generate.latestCreation')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                <div className="relative aspect-square rounded-lg overflow-hidden">
                                  <Image
                                    src={images[0].image_url || "/placeholder.svg"}
                                    alt={images[0].prompt}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    priority
                                  />
                                </div>
                                <div>
                                  <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                                    <span>{images[0].model}</span>
                                    <span>{new Date(images[0].created_at).toLocaleDateString()}</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full mt-2"
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setPromptDialogText(images[0].prompt);
                                      setPromptDialogOpen(true);
                                    }}
                                  >
                                    {t('dashboard.generate.showPrompt')}
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )
                    ) : selectedCategories.includes("Text to Image") && (
                      <>
                        {/* Generation Form - Mobile Optimized */}
                        <div className="w-full">
                        <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-2xl rounded-xl sm:rounded-2xl lg:rounded-3xl">
                          <CardHeader className="text-center pb-6 px-6">
                            <div className="relative">
                              {/* Animated background elements */}
                              <div className="absolute inset-0 -z-10">
                                <div className="absolute top-4 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-pulse opacity-60"></div>
                                <div className="absolute top-8 right-1/3 w-1 h-1 bg-blue-400 rounded-full animate-bounce opacity-40"></div>
                                <div className="absolute bottom-6 left-1/3 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping opacity-50"></div>
                              </div>
                              
                              {/* Main icon */}
                              <div className="relative mx-auto w-16 h-16 mb-4">
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 rounded-2xl animate-pulse opacity-20"></div>
                                <div className="relative w-full h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                                  <Sparkles className="w-8 h-8 text-white animate-pulse" />
                                </div>
                              </div>
                              
                              {/* Title */}
                              <CardTitle className="text-3xl font-bold mb-2">
                                <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                  Create Magic
                                </span>
                              </CardTitle>
                              
                              {/* Subtitle */}
                              <CardDescription className="text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                                Transform your imagination into stunning visuals with AI
                              </CardDescription>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4 sm:space-y-6 lg:space-y-8 px-3 sm:px-6">
                            <form onSubmit={generateImage} className="space-y-4 sm:space-y-6 lg:space-y-8">
                              {/* Enhanced Prompt Input Area */}
                              <div className="space-y-6">




                                {/* Premium Prompt Input Container */}
                                <div className="relative">
                                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-indigo-500/10 rounded-2xl blur-xl"></div>
                                  <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                                    <div className="space-y-4">
                                      <div className="relative">
                                        <Textarea
                                          id="prompt"
                                          placeholder={t('dashboard.generate.promptPlaceholderInspiring')}
                                          value={prompt}
                                          onChange={e => {
                                            const value = e.target.value
                                            if (value.length <= 2000) {
                                              setPrompt(value)
                                            }
                                          }}
                                          required
                                          maxLength={2000}
                                          className="min-h-[160px] text-base leading-relaxed resize-none border-0 bg-transparent focus:ring-0 p-0 placeholder:text-gray-400 dark:placeholder:text-gray-500 touch-manipulation"
                                        />
                                        
                                        {/* Enhanced Character Counter with Progress */}
                                        <div className="absolute bottom-2 right-2 flex items-center gap-2">
                                          <div className={`text-xs backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border transition-all duration-200 ${
                                            prompt.length > 1800 
                                              ? 'bg-red-50/90 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400'
                                              : prompt.length > 1500
                                              ? 'bg-yellow-50/90 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700 text-yellow-600 dark:text-yellow-400'
                                              : 'bg-white/90 dark:bg-gray-800/90 border-gray-200/50 dark:border-gray-700/50 text-gray-500 dark:text-gray-400'
                                          }`}>
                                            {prompt.length}/2000
                                          </div>
                                          
                                          {/* Progress Ring */}
                                          <div className="relative w-6 h-6">
                                            <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 24 24">
                                              <circle
                                                cx="12"
                                                cy="12"
                                                r="8"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                className="text-gray-200 dark:text-gray-700"
                                              />
                                              <circle
                                                cx="12"
                                                cy="12"
                                                r="8"
                                                fill="none"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                className={`transition-all duration-300 ${
                                                  prompt.length > 1800 
                                                    ? 'stroke-red-500'
                                                    : prompt.length > 1500
                                                    ? 'stroke-yellow-500'
                                                    : prompt.length > 1000
                                                    ? 'stroke-blue-500'
                                                    : 'stroke-green-500'
                                                }`}
                                                strokeDasharray={`${(prompt.length / 2000) * 50.27} 50.27`}
                                              />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                                prompt.length > 1800 
                                                  ? 'bg-red-500'
                                                  : prompt.length > 1500
                                                  ? 'bg-yellow-500'
                                                  : prompt.length > 1000
                                                  ? 'bg-blue-500'
                                                  : 'bg-green-500'
                                              }`} />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                                                            {/* AI Enhancement Button */}
                                      <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          disabled={improvingPrompt || !prompt.trim()}
                                          title="Improve prompt with AI"
                                          className="w-full h-12 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 dark:hover:from-yellow-900/20 dark:hover:to-orange-900/20 border border-transparent hover:border-yellow-200 dark:hover:border-yellow-700 rounded-xl transition-all duration-200 touch-manipulation"
                                          onClick={async () => {
                                            setImprovingPrompt(true)
                                            try {
                                              const res = await fetch("/api/improve-prompt", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ prompt }),
                                              })
                                              const data = await res.json()
                                              if (!res.ok) throw new Error(data.error || "Failed to improve prompt")
                                              setPrompt(data.improved)
                                              toast({ 
                                                title: "Prompt Enhanced!", 
                                                description: "Your prompt has been improved with AI suggestions",
                                                duration: 3000
                                              })
                                            } catch (err: any) {
                                              toast({ title: "Error", description: err.message, variant: "destructive" })
                                            } finally {
                                              setImprovingPrompt(false)
                                            }
                                          }}
                                        >
                                          {improvingPrompt ? (
                                            <div className="flex items-center gap-2">
                                              <div className="animate-spin">
                                                <Sparkles className="w-5 h-5 text-yellow-500" />
                                              </div>
                                              <span className="text-sm font-medium">Enhancing...</span>
                                            </div>
                                          ) : (
                                            <div className="flex items-center justify-center gap-2">
                                              <Sparkles className="w-5 h-5 text-yellow-500" />
                                              <span className="text-yellow-600 font-bold text-sm">AI</span>
                                              <span className="text-sm text-gray-600 font-medium">{t('dashboard.generate.enhance')}</span>
                                            </div>
                                          )}
                                        </Button>
                                        
                                        {/* Smart Helper Messages */}
                                        <div className="mt-3">
                                          <div className={`text-xs text-center transition-all duration-300 ${
                                            prompt.length > 1800 
                                              ? 'text-red-500 dark:text-red-400'
                                              : prompt.length > 1500
                                              ? 'text-amber-500 dark:text-amber-400'
                                              : prompt.length > 500
                                              ? 'text-green-500 dark:text-green-400'
                                              : 'text-gray-400 dark:text-gray-500'
                                          }`}>
                                            {prompt.length > 1800 ? (
                                              <span className="flex items-center justify-center gap-1 font-medium">
                                                ⚠️ {2000 - prompt.length} characters remaining
                                              </span>
                                            ) : prompt.length > 1500 ? (
                                              <span className="flex items-center justify-center gap-1">
                                                ✨ Perfect length - consider finalizing your prompt
                                              </span>
                                            ) : prompt.length > 500 ? (
                                              <span className="flex items-center justify-center gap-1">
                                                🎯 Excellent detail! Add more if needed
                                              </span>
                                            ) : prompt.length > 100 ? (
                                              <span>💡 Great start! Add style, mood, and composition details</span>
                                            ) : null}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Compact Model Selector */}
                              <div className="bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/20 rounded-xl p-3 border border-gray-200/50 dark:border-gray-700/50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {(() => {
                                      const currentModel = availableModels.find(m => m.id === model);
                                      if (!currentModel) return (
                                        <div className="flex items-center gap-2 text-gray-500">
                                          <Bot className="w-4 h-4" />
                                          <span className="text-sm">Loading model...</span>
                                        </div>
                                      );
                                      return (
                                        <>
                                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentModel.bgColor} shrink-0`}>
                                            <currentModel.icon className={`w-4 h-4 ${currentModel.iconColor}`} />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                                {currentModel.name}
                                              </span>
                                              {currentModel.price && (
                                                <span className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                                                  {currentModel.price}
                                                </span>
                                              )}
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                                              {currentModel.category}
                                            </span>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                  <Button 
                                    type="button"
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 px-3 text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-transparent hover:border-blue-200 dark:hover:border-blue-700"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      setModelPanelOpen(true)
                                    }}
                                  >
                                    <Settings2 className="w-3 h-3 mr-1" />
                                    Change
                                  </Button>
                                </div>
                              </div>

                              {/* Essential Settings - Always Visible */}
                              <div className="space-y-4 sm:space-y-6">


                                <div className="space-y-3">
                                  <Label htmlFor="aspectRatio" className="text-sm sm:text-base font-semibold">{t('dashboard.generate.aspectRatio')}</Label>
                                  <Select value={aspectRatio} onValueChange={handleAspectRatioChange}>
                                    <SelectTrigger className="h-11 touch-manipulation">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="1:1">
                                        <span className="inline-flex items-center gap-2">
                                          <Square className="w-4 h-4" /> 
                                          <span className="hidden sm:inline">{t('dashboard.generate.squareIcon')}</span>
                                          <span className="sm:hidden">Square</span>
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="1:1_hd">
                                        <span className="inline-flex items-center gap-2">
                                          <Square className="w-4 h-4" /> 
                                          <span className="hidden sm:inline">{t('dashboard.generate.squareHdIcon')}</span>
                                          <span className="sm:hidden">Square HD</span>
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="3:4">
                                        <span className="inline-flex items-center gap-2">
                                          <RectangleVertical className="w-4 h-4" /> 
                                          <span className="hidden sm:inline">{t('dashboard.generate.portraitSmallIcon')}</span>
                                          <span className="sm:hidden">Portrait 4:3</span>
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="9:16">
                                        <span className="inline-flex items-center gap-2">
                                          <RectangleVertical className="w-4 h-4" /> 
                                          <span className="hidden sm:inline">{t('dashboard.generate.portraitLargeIcon')}</span>
                                          <span className="sm:hidden">Portrait 16:9</span>
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="4:3">
                                        <span className="inline-flex items-center gap-2">
                                          <RectangleHorizontal className="w-4 h-4" /> 
                                          <span className="hidden sm:inline">{t('dashboard.generate.landscapeSmallIcon')}</span>
                                          <span className="sm:hidden">Landscape 4:3</span>
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="16:9">
                                        <span className="inline-flex items-center gap-2">
                                          <RectangleHorizontal className="w-4 h-4" /> 
                                          <span className="hidden sm:inline">{t('dashboard.generate.landscapeLargeIcon')}</span>
                                          <span className="sm:hidden">Landscape 16:9</span>
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="custom">
                                        <span className="inline-flex items-center gap-2">
                                          <Settings2 className="w-4 h-4" /> 
                                          <span className="hidden sm:inline">{t('dashboard.generate.customIcon')}</span>
                                          <span className="sm:hidden">Custom</span>
                                        </span>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Progressive Disclosure for Advanced Settings */}
                                <div className="border-t pt-4 sm:pt-6">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setAdvancedSettings(prev => ({ ...prev, showAdvancedSettings: !prev.showAdvancedSettings }))}
                                    className="w-full flex items-center justify-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors h-12 touch-manipulation"
                                  >
                                    <Settings2 className="w-5 h-5" />
                                    <span className="font-medium text-base">
                                      {advancedSettings.showAdvancedSettings ? t('dashboard.generate.hideAdvanced') : t('dashboard.generate.showAdvanced')}
                                    </span>
                                    {advancedSettings.showAdvancedSettings ? (
                                      <ChevronUp className="w-5 h-5" />
                                    ) : (
                                      <ChevronDown className="w-5 h-5" />
                                    )}
                                  </Button>
                                </div>

                              {/* Advanced Settings - Collapsible */}
                              {advancedSettings.showAdvancedSettings && (
                                <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                  <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                    {t('dashboard.generate.advancedSettings')}
                                  </h3>
                                  {model === 'fal-ai/fast-sdxl' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <Label htmlFor="image-size">{t('dashboard.generate.imageSize')}</Label>
                                        <Select value={imageSize} onValueChange={setImageSize}>
                                          <SelectTrigger id="image-size"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="square_hd">{t('dashboard.generate.squareHd')}</SelectItem>
                                            <SelectItem value="square">{t('dashboard.generate.square')}</SelectItem>
                                            <SelectItem value="portrait_4_3">{t('dashboard.generate.portrait43')}</SelectItem>
                                            <SelectItem value="portrait_16_9">{t('dashboard.generate.portrait169')}</SelectItem>
                                            <SelectItem value="landscape_4_3">{t('dashboard.generate.landscape43')}</SelectItem>
                                            <SelectItem value="landscape_16_9">{t('dashboard.generate.landscape169')}</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label htmlFor="num-images">{t('dashboard.generate.numImages')}</Label>
                                        <input type="number" min={1} max={8} value={numImages} onChange={e => setNumImages(Number(e.target.value))} className="w-full border rounded px-3 py-2" />
                                      </div>
                                      <div>
                                        <Label htmlFor="guidance-scale">{t('dashboard.generate.guidanceScale')}</Label>
                                        <div className="flex items-center gap-2">
                                          <input type="range" min={0} max={20} step={0.1} value={guidanceScale} onChange={e => setGuidanceScale(Number(e.target.value))} className="flex-1" />
                                          <span className="text-sm font-medium w-12">{guidanceScale}</span>
                                        </div>
                                      </div>
                                      <div>
                                        <Label htmlFor="num-steps">{t('dashboard.generate.inferenceSteps')}</Label>
                                        <input type="number" min={1} max={50} value={numSteps} onChange={e => setNumSteps(Number(e.target.value))} className="w-full border rounded px-3 py-2" />
                                      </div>
                                      <div className="col-span-full space-y-3">
                                        <div className="flex items-center gap-2">
                                          <input type="checkbox" checked={expandPromptFast} onChange={e => setExpandPromptFast(e.target.checked)} id="expand-prompt-fast" className="accent-blue-600" />
                                          <Label htmlFor="expand-prompt-fast">{t('dashboard.generate.expandPrompt')}</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <input type="checkbox" checked={enableSafetyChecker} onChange={e => setEnableSafetyChecker(e.target.checked)} id="enable-safety-checker" className="accent-blue-600" />
                                          <Label htmlFor="enable-safety-checker">{t('dashboard.generate.enableSafetyChecker')}</Label>
                                        </div>
                                      </div>
                                      <div>
                                        <Label htmlFor="negative-prompt">{t('dashboard.generate.negativePrompt')}</Label>
                                        <input type="text" value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} id="negative-prompt" className="w-full border rounded px-3 py-2" />
                                      </div>
                                      <div>
                                        <Label htmlFor="format">{t('dashboard.generate.format')}</Label>
                                        <Select value={format} onValueChange={setFormat}>
                                          <SelectTrigger id="format"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="jpeg">JPEG</SelectItem>
                                            <SelectItem value="png">PNG</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label htmlFor="seed">{t('dashboard.generate.seed')}</Label>
                                        <input type="number" value={seed} onChange={e => setSeed(e.target.value)} id="seed" className="w-full border rounded px-3 py-2" />
                                      </div>
                                    </div>
                                  )}
                                  {model === 'fal-ai/ideogram/v3' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <Label htmlFor="num-images-ideo">{t('dashboard.generate.numImages')}</Label>
                                        <input
                                          id="num-images-ideo"
                                          type="number"
                                          min={1}
                                          max={8}
                                          value={numImages}
                                          onChange={e => setNumImages(Number(e.target.value))}
                                          className="w-full border rounded px-3 py-2"
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="image-size-ideo">{t('dashboard.generate.imageSize')}</Label>
                                        <Select value={imageSize} onValueChange={setImageSize}>
                                          <SelectTrigger id="image-size-ideo"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="square_hd">{t('dashboard.generate.squareHd')}</SelectItem>
                                            <SelectItem value="square">{t('dashboard.generate.square')}</SelectItem>
                                            <SelectItem value="portrait_4_3">{t('dashboard.generate.portrait43')}</SelectItem>
                                            <SelectItem value="portrait_16_9">{t('dashboard.generate.portrait169')}</SelectItem>
                                            <SelectItem value="landscape_4_3">{t('dashboard.generate.landscape43')}</SelectItem>
                                            <SelectItem value="landscape_16_9">{t('dashboard.generate.landscape169')}</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label htmlFor="style-ideo">{t('dashboard.generate.style')}</Label>
                                        <Select value={style} onValueChange={setStyle}>
                                          <SelectTrigger id="style-ideo"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="AUTO">{t('dashboard.generate.auto')}</SelectItem>
                                            <SelectItem value="GENERAL">{t('dashboard.generate.general')}</SelectItem>
                                            <SelectItem value="REALISTIC">{t('dashboard.generate.realistic')}</SelectItem>
                                            <SelectItem value="DESIGN">{t('dashboard.generate.design')}</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label htmlFor="rendering-speed-ideo">{t('dashboard.generate.renderingSpeed')}</Label>
                                        <Select value={renderingSpeed} onValueChange={setRenderingSpeed}>
                                          <SelectTrigger id="rendering-speed-ideo"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="TURBO">{t('dashboard.generate.turbo')}</SelectItem>
                                            <SelectItem value="BALANCED">{t('dashboard.generate.balanced')}</SelectItem>
                                            <SelectItem value="QUALITY">{t('dashboard.generate.quality')}</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <input
                                          id="expand-prompt-ideo"
                                          type="checkbox"
                                          checked={expandPrompt}
                                          onChange={e => setExpandPrompt(e.target.checked)}
                                          className="accent-blue-600"
                                        />
                                        <Label htmlFor="expand-prompt-ideo">{t('dashboard.generate.expandPrompt')}</Label>
                                      </div>
                                      <div>
                                        <Label htmlFor="seed-ideo">{t('dashboard.generate.seed')}</Label>
                                        <input
                                          id="seed-ideo"
                                          type="number"
                                          value={seed}
                                          onChange={e => setSeed(e.target.value)}
                                          className="w-full border rounded px-3 py-2"
                                          placeholder={t('dashboard.generate.seedPlaceholder')}
                                        />
                                      </div>
                                      <div className="col-span-full">
                                        <Label htmlFor="negative-prompt-ideo">{t('dashboard.generate.negativePrompt')}</Label>
                                        <input
                                          id="negative-prompt-ideo"
                                          type="text"
                                          value={negativePrompt}
                                          onChange={e => setNegativePrompt(e.target.value)}
                                          className="w-full border rounded px-3 py-2"
                                          placeholder={t('dashboard.generate.negativePromptPlaceholder')}
                                        />
                                      </div>
                                      <div className="col-span-full">
                                        <Label htmlFor="style-codes-ideo">{t('dashboard.generate.styleCodes')}</Label>
                                        <input
                                          id="style-codes-ideo"
                                          type="text"
                                          value={styleCodes || ''}
                                          onChange={e => setStyleCodes(e.target.value)}
                                          className="w-full border rounded px-3 py-2"
                                          placeholder={t('dashboard.generate.styleCodesPlaceholder')}
                                        />
                                        <span className="text-xs text-gray-500 mt-1 block">{t('dashboard.generate.styleCodesHelper')}</span>
                                      </div>
                                      <div className="col-span-full">
                                        <Label htmlFor="color-palette-ideo">{t('dashboard.generate.colorPalette')}</Label>
                                        <Select value={colorPalette} onValueChange={setColorPalette}>
                                          <SelectTrigger id="color-palette-ideo"><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">{t('dashboard.generate.none')}</SelectItem>
                                            <SelectItem value="EMBER">{t('dashboard.generate.ember')}</SelectItem>
                                            <SelectItem value="FRESH">{t('dashboard.generate.fresh')}</SelectItem>
                                            <SelectItem value="JUNGLE">{t('dashboard.generate.jungle')}</SelectItem>
                                            <SelectItem value="MAGIC">{t('dashboard.generate.magic')}</SelectItem>
                                            <SelectItem value="MELON">{t('dashboard.generate.melon')}</SelectItem>
                                            <SelectItem value="MOSAIC">{t('dashboard.generate.mosaic')}</SelectItem>
                                            <SelectItem value="PASTEL">{t('dashboard.generate.pastel')}</SelectItem>
                                            <SelectItem value="ULTRAMARINE">{t('dashboard.generate.ultramarine')}</SelectItem>
                                            <SelectItem value="custom">{t('dashboard.generate.customPaletteLabel')}</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        {colorPalette === 'custom' && (
                                          <input
                                            type="text"
                                            value={customPalette}
                                            onChange={e => setCustomPalette(e.target.value)}
                                            className="w-full border rounded px-3 py-2 mt-2"
                                            placeholder={t('dashboard.generate.customPaletteHelper')}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {model === 'fal-ai/bytedance/seededit/v3/edit-image' && (
                                    <div className="space-y-4">
                                      <div>
                                        <Label htmlFor="reference-method">{t('dashboard.generate.referenceImage')}</Label>
                                        <div className="flex gap-2 mt-2 hidden">
                                          <Button
                                            type="button"
                                            variant={referenceMethod === 'url' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setReferenceMethod('url')}
                                          >
                                            {t('dashboard.generate.urlMethod')}
                                          </Button>
                                          <Button
                                            type="button"
                                            variant={referenceMethod === 'upload' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setReferenceMethod('upload')}
                                          >
                                            {t('dashboard.generate.uploadMethod')}
                                          </Button>
                                        </div>
                                      </div>
                                      
                                      {referenceMethod === 'url' ? (
                                        <div>
                                          <Label htmlFor="image-url">{t('dashboard.generate.imageUrl')}</Label>
                                          <Input
                                            id="image-url"
                                            type="url"
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value)}
                                            placeholder={t('dashboard.generate.imageUrlPlaceholder')}
                                            className="mt-1"
                                          />
                                        </div>
                                      ) : (
                                        <div>
                                          <Label>{t('dashboard.generate.uploadImage')}</Label>
                                          <label 
                                            htmlFor="image-upload"
                                            className="mt-1 border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 relative block cursor-pointer border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                            onDragOver={(e) => {
                                              e.preventDefault()
                                              e.currentTarget.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30')
                                            }}
                                            onDragLeave={(e) => {
                                              e.preventDefault()
                                              e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30')
                                            }}
                                            onDrop={(e) => {
                                              e.preventDefault()
                                              e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30')
                                              const file = e.dataTransfer.files[0]
                                              if (file && file.type.startsWith('image/')) {
                                                handleFileUpload(file)
                                              }
                                            }}
                                          >
                                            <input
                                            id="image-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0]
                                              if (file) {
                                                handleFileUpload(file)
                                              }
                                            }}
                                              className="hidden"
                                            />
                                            <div className="space-y-3 pointer-events-none">
                                              <div className="flex justify-center">
                                                <ImageIcon className="w-12 h-12 text-gray-400" />
                                              </div>
                                              <div>
                                                <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                                                  Drop image here
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                  or click to browse files
                                                </p>
                                              </div>
                                              <p className="text-xs text-gray-400">
                                                Supports: JPG, PNG, WebP, GIF (up to 20MB)
                                              </p>
                                            </div>
                                          </label>
                                          {uploadedFile && uploadedFilePreview && (
                                            <div className="mt-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 h-20 max-h-24 overflow-hidden flex items-center">
                                              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                                <Image
                                                  src={uploadedFilePreview}
                                                  alt="Uploaded reference image"
                                                  fill
                                                  className="object-cover"
                                                  sizes="64px"
                                                />
                                              </div>
                                              <div className="flex-1 min-w-0 ml-3">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px] block whitespace-nowrap overflow-hidden">
                                                  {uploadedFile.name}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                  ✓ {t('dashboard.generate.readyForEditing')}
                                                </p>
                                              </div>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  setUploadedFile(null)
                                                  if (uploadedFilePreview) {
                                                    URL.revokeObjectURL(uploadedFilePreview)
                                                  }
                                                  setUploadedFilePreview(null)
                                                  const fileInput = document.getElementById('image-upload') as HTMLInputElement
                                                  if (fileInput) fileInput.value = ''
                                                }}
                                                className="text-gray-400 hover:text-gray-600 ml-2"
                                              >
                                                ×
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      
                                      <div>
                                        <Label htmlFor="guidance-scale-seededit">{t('dashboard.generate.guidanceScale')}</Label>
                                        <div className="flex items-center gap-2">
                                          <input
                                            id="guidance-scale-seededit"
                                            type="range"
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            value={guidanceScale}
                                            onChange={e => setGuidanceScale(Number(e.target.value))}
                                            className="flex-1"
                                          />
                                          <span className="text-sm font-medium w-12">{guidanceScale}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{t('dashboard.generate.guidanceScaleHelper')}</p>
                                      </div>
                                      
                                      <div>
                                        <Label htmlFor="seed-seededit">{t('dashboard.generate.seed')}</Label>
                                        <input
                                          id="seed-seededit"
                                          type="number"
                                          value={seed}
                                          onChange={e => setSeed(e.target.value)}
                                          className="w-full border rounded px-3 py-2"
                                          placeholder={t('dashboard.generate.seedPlaceholder')}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  {model === 'fal-ai/flux-pro/kontext' && (
                                    <div className="space-y-4">
                                      <div>
                                        <Label htmlFor="reference-method-kontext">{t('dashboard.generate.referenceImage')}</Label>
                                        <div className="flex gap-2 mt-2 hidden">
                                          <Button
                                            type="button"
                                            variant={referenceMethodKontext === 'url' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setReferenceMethodKontext('url')}
                                          >
                                            {t('dashboard.generate.urlMethod')}
                                          </Button>
                                          <Button
                                            type="button"
                                            variant={referenceMethodKontext === 'upload' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setReferenceMethodKontext('upload')}
                                          >
                                            {t('dashboard.generate.uploadMethod')}
                                          </Button>
                                        </div>
                                      </div>
                                      {referenceMethodKontext === 'url' ? (
                                        <div>
                                          <Label htmlFor="image-url-kontext">{t('dashboard.generate.imageUrl')}</Label>
                                          <Input
                                            id="image-url-kontext"
                                            type="url"
                                            value={imageUrlKontext}
                                            onChange={(e) => setImageUrlKontext(e.target.value)}
                                            placeholder={t('dashboard.generate.imageUrlPlaceholder')}
                                            className="mt-1"
                                          />
                                        </div>
                                      ) : (
                                        <div>
                                          <Label>{t('dashboard.generate.uploadImage')}</Label>
                                          <label 
                                            htmlFor="image-upload-kontext"
                                            className={`mt-1 border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 relative block ${
                                              uploadingKontext 
                                                ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-50' 
                                                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                                            }`}
                                            onDragOver={(e) => {
                                              e.preventDefault()
                                              if (!uploadingKontext) {
                                                e.currentTarget.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30')
                                              }
                                            }}
                                            onDragLeave={(e) => {
                                              e.preventDefault()
                                              e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30')
                                            }}
                                            onDrop={(e) => {
                                              e.preventDefault()
                                              e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30')
                                              if (!uploadingKontext) {
                                                const file = e.dataTransfer.files[0]
                                                if (file && file.type.startsWith('image/')) {
                                                  handleFileUploadKontext(file)
                                                }
                                              }
                                            }}
                                          >
                                            <input
                                            id="image-upload-kontext"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                handleFileUploadKontext(file);
                                              }
                                            }}
                                              className="hidden"
                                            disabled={uploadingKontext}
                                          />
                                            <div className="space-y-3 pointer-events-none">
                                              <div className="flex justify-center">
                                                {uploadingKontext ? (
                                                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                  <ImageIcon className="w-12 h-12 text-gray-400" />
                                                )}
                                              </div>
                                              <div>
                                                <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                                                  {uploadingKontext ? 'Uploading...' : 'Drop image here'}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                  {uploadingKontext ? 'Please wait' : 'or click to browse files'}
                                                </p>
                                              </div>
                                              <p className="text-xs text-gray-400">
                                                Supports: JPG, PNG, WebP, GIF (up to 20MB)
                                              </p>
                                            </div>
                                          </label>
                                          {uploadedFileKontext && uploadedFilePreviewKontext && (
                                            <div className="mt-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 h-20 max-h-24 overflow-hidden flex items-center">
                                              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                                <Image
                                                  src={uploadedFilePreviewKontext}
                                                  alt="Uploaded reference image"
                                                  fill
                                                  className="object-cover"
                                                  sizes="64px"
                                                />
                                              </div>
                                              <div className="flex-1 min-w-0 ml-3">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px] block whitespace-nowrap overflow-hidden">
                                                  {uploadedFileKontext.name}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                  {(uploadedFileKontext.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                  ✓ {t('dashboard.generate.readyForEditing')}
                                                </p>
                                              </div>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  setUploadedFileKontext(null);
                                                  if (uploadedFilePreviewKontext) {
                                                    URL.revokeObjectURL(uploadedFilePreviewKontext);
                                                  }
                                                  setUploadedFilePreviewKontext(null);
                                                  setImageUrlKontext('');
                                                  const fileInput = document.getElementById('image-upload-kontext') as HTMLInputElement;
                                                  if (fileInput) fileInput.value = '';
                                                }}
                                                className="text-gray-400 hover:text-gray-600 ml-2"
                                              >
                                                ×
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {model === 'fal-ai/flux-pro/kontext/max' && (
                                    <div className="space-y-4">
                                      <div>
                                        <Label htmlFor="reference-method-kontext-max">{t('dashboard.generate.referenceImage')}</Label>
                                        <div className="flex gap-2 mt-2 hidden">
                                          <Button
                                            type="button"
                                            variant={referenceMethodKontextMax === 'url' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setReferenceMethodKontextMax('url')}
                                          >
                                            {t('dashboard.generate.urlMethod')}
                                          </Button>
                                          <Button
                                            type="button"
                                            variant={referenceMethodKontextMax === 'upload' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setReferenceMethodKontextMax('upload')}
                                          >
                                            {t('dashboard.generate.uploadMethod')}
                                          </Button>
                                </div>
                                      </div>
                                      {referenceMethodKontextMax === 'url' ? (
                                        <div>
                                          <Label htmlFor="image-url-kontext-max">{t('dashboard.generate.imageUrl')}</Label>
                                          <Input
                                            id="image-url-kontext-max"
                                            type="url"
                                            value={imageUrlKontextMax}
                                            onChange={(e) => setImageUrlKontextMax(e.target.value)}
                                            placeholder={t('dashboard.generate.imageUrlPlaceholder')}
                                            className="mt-1"
                                          />
                                        </div>
                                      ) : (
                                        <div>
                                          <Label>{t('dashboard.generate.uploadImage')}</Label>
                                          <label 
                                            htmlFor="image-upload-kontext-max"
                                            className={`mt-1 border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 relative block ${
                                              uploadingKontextMax 
                                                ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-50' 
                                                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                                            }`}
                                            onDragOver={(e) => {
                                              e.preventDefault()
                                              if (!uploadingKontextMax) {
                                                e.currentTarget.classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30')
                                              }
                                            }}
                                            onDragLeave={(e) => {
                                              e.preventDefault()
                                              e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30')
                                            }}
                                            onDrop={(e) => {
                                              e.preventDefault()
                                              e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-blue-900/30')
                                              if (!uploadingKontextMax) {
                                                const file = e.dataTransfer.files[0]
                                                if (file && file.type.startsWith('image/')) {
                                                  handleFileUploadKontextMax(file)
                                                }
                                              }
                                            }}
                                          >
                                            <input
                                              id="image-upload-kontext-max"
                                              type="file"
                                              accept="image/*"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                  handleFileUploadKontextMax(file);
                                                }
                                              }}
                                              className="hidden"
                                              disabled={uploadingKontextMax}
                                            />
                                            <div className="space-y-3 pointer-events-none">
                                              <div className="flex justify-center">
                                                {uploadingKontextMax ? (
                                                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                                ) : (
                                                  <ImageIcon className="w-12 h-12 text-gray-400" />
                                                )}
                                              </div>
                                              <div>
                                                <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                                                  {uploadingKontextMax ? 'Uploading...' : 'Drop image here'}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                  {uploadingKontextMax ? 'Please wait' : 'or click to browse files'}
                                                </p>
                                              </div>
                                              <p className="text-xs text-gray-400">
                                                Supports: JPG, PNG, WebP, GIF (up to 20MB)
                                              </p>
                                            </div>
                                          </label>
                                          {uploadedFileKontextMax && uploadedFilePreviewKontextMax && (
                                            <div className="mt-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 h-20 max-h-24 overflow-hidden flex items-center">
                                              <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                                <NextImage
                                                  src={uploadedFilePreviewKontextMax}
                                                  alt="Uploaded reference image"
                                                  fill
                                                  className="object-cover"
                                                  sizes="64px"
                                                />
                                              </div>
                                              <div className="flex-1 min-w-0 ml-3">
                                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px] block whitespace-nowrap overflow-hidden">
                                                  {uploadedFileKontextMax.name}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-1">
                                                  {(uploadedFileKontextMax.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                  ✓ {t('dashboard.generate.readyForEditing')}
                                                </p>
                                              </div>
                                  <Button 
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  setUploadedFileKontextMax(null);
                                                  if (uploadedFilePreviewKontextMax) {
                                                    URL.revokeObjectURL(uploadedFilePreviewKontextMax);
                                                  }
                                                  setUploadedFilePreviewKontextMax(null);
                                                  setImageUrlKontextMax('');
                                                  const fileInput = document.getElementById('image-upload-kontext-max') as HTMLInputElement;
                                                  if (fileInput) fileInput.value = '';
                                                }}
                                                className="text-gray-400 hover:text-gray-600 ml-2"
                                              >
                                                ×
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* FLUX Kontext Max specific settings */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <Label htmlFor="guidance-scale-kontext-max">{t('dashboard.generate.guidanceScale')}</Label>
                                          <div className="flex items-center gap-2">
                                            <input
                                              id="guidance-scale-kontext-max"
                                              type="range"
                                              min={1}
                                              max={20}
                                              step={0.1}
                                              value={guidanceScale}
                                              onChange={e => setGuidanceScale(Number(e.target.value))}
                                              className="flex-1"
                                            />
                                            <span className="text-sm font-medium w-12">{guidanceScale}</span>
                                          </div>
                                          </div>
                                        
                                        <div>
                                          <Label htmlFor="num-images-kontext-max">{t('dashboard.generate.numImages')}</Label>
                                          <input
                                            id="num-images-kontext-max"
                                            type="number"
                                            min={1}
                                            max={4}
                                            value={numImages}
                                            onChange={e => setNumImages(Number(e.target.value))}
                                            className="w-full border rounded px-3 py-2"
                                          />
                                            </div>

                                        <div>
                                          <Label htmlFor="safety-tolerance">{t('dashboard.generate.safetyTolerance')}</Label>
                                          <Select value={safetyTolerance} onValueChange={setSafetyTolerance}>
                                            <SelectTrigger id="safety-tolerance">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="1">1 - Most Strict</SelectItem>
                                              <SelectItem value="2">2 - Default</SelectItem>
                                              <SelectItem value="3">3 - Moderate</SelectItem>
                                              <SelectItem value="4">4 - Permissive</SelectItem>
                                              <SelectItem value="5">5 - Most Permissive</SelectItem>
                                              <SelectItem value="6">6 - No Filtering</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          </div>
                                          
                                        <div>
                                          <Label htmlFor="output-format">{t('dashboard.generate.outputFormat')}</Label>
                                          <Select value={outputFormat} onValueChange={setOutputFormat}>
                                            <SelectTrigger id="output-format">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="jpeg">JPEG</SelectItem>
                                              <SelectItem value="png">PNG</SelectItem>
                                            </SelectContent>
                                          </Select>
                                            </div>

                                        <div className="col-span-full">
                                          <Label htmlFor="seed-kontext-max">{t('dashboard.generate.seed')}</Label>
                                          <input
                                            id="seed-kontext-max"
                                            type="number"
                                            value={seed}
                                            onChange={e => setSeed(e.target.value)}
                                            placeholder={t('dashboard.generate.seedPlaceholder')}
                                            className="w-full border rounded px-3 py-2"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                      )}
                                    </div>
                              )}

                              {/* Generate Button - Mobile Optimized */}
                              <div className="pt-6">
                                <Button 
                                  type="submit" 
                                  className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 touch-manipulation" 
                                  disabled={loading}
                                >
                                  {loading 
                                    ? (model === 'fal-ai/bytedance/seededit/v3/edit-image' 
                                        ? t('dashboard.generate.editingButton') 
                                        : t('dashboard.generate.generatingButton'))
                                    : (model === 'fal-ai/bytedance/seededit/v3/edit-image' 
                                        ? t('dashboard.generate.editButton') 
                                        : t('dashboard.generate.generateButton'))
                                  }
                                  </Button>
                              </div>
                            </form>
                          </CardContent>
                        </Card>
                      </div>


                      {/* Latest 3 Creations - Mobile Optimized */}
                      {images.length > 0 && (
                        <div className="w-full mt-6 sm:mt-8">
                          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-lg rounded-xl sm:rounded-2xl">
                            <CardHeader className="pb-3 px-3 sm:px-6">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <ImageIcon className="w-5 h-5" />
                                {t('dashboard.generate.latestCreations')}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 sm:px-6">
                              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 hide-scrollbar -mx-1 px-1">
                                {images.slice(0, 3).map((image, index) => (
                                  <div key={image.id} className="group cursor-pointer min-w-[200px] sm:min-w-[220px] max-w-[220px] sm:max-w-[240px] flex-shrink-0 touch-manipulation" onClick={() => { setExpandedImage(image); setShowFullPrompt(false); }}>
                                    <div className="relative aspect-square rounded-xl overflow-hidden shadow-md mb-3 group-hover:shadow-lg transition-shadow">
                                      <Image
                                        src={image.image_url || "/placeholder.svg"}
                                        alt={image.prompt}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        priority={index === 0}
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = "/placeholder.svg"
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 leading-relaxed">
                                        {image.prompt}
                                      </p>
                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-xs text-gray-500">
                                        <span className="truncate">{image.model}</span>
                                        <span className="text-xs">{new Date(image.created_at).toLocaleDateString()}</span>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        type="button"
                                        className="w-full h-9 touch-manipulation"
                                        onClick={e => {
                                          e.stopPropagation();
                                          setPromptDialogText(image.prompt);
                                          setPromptDialogOpen(true);
                                        }}
                                      >
                                        {t('dashboard.generate.showPrompt')}
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </>
                  )}
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">{t('dashboard.history.title')}</h2>
                  {images.length === 0 ? (
                    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
                                              <CardContent className="text-center py-12">
                          <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-600 dark:text-gray-400">
                            {t('dashboard.history.noImages')}
                          </p>
                          <Button className="mt-4" onClick={() => setActiveTab("generate")}>
                            {t('dashboard.history.generateImage')}
                          </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {images.map((image) => (
                        <Card
                          key={image.id}
                          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden cursor-pointer"
                          onClick={() => { setExpandedImage(image); setShowFullPrompt(false); }}
                        >
                          <div className="relative aspect-square group">
                            <Image
                              src={image.image_url || "/placeholder.svg"}
                              alt={image.prompt}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.svg"
                              }}
                            />
                            {/* Delete icon button in top right */}
                              <button
                                type="button"
                                className="absolute top-2 right-2 z-10 p-1 rounded-full bg-white/80 dark:bg-gray-900/80 shadow hover:bg-red-100 dark:hover:bg-red-900 transition group-hover:opacity-100 opacity-0 group-focus-within:opacity-100 md:opacity-100"
                                title="Delete image"
                                onClick={e => {
                                  e.stopPropagation();
                                  setPendingDeleteImageId(image.id)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="w-5 h-5 text-red-600" />
                              </button>
                          </div>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                              <span>{image.model}</span>
                              <span>{new Date(image.created_at).toLocaleDateString()}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-2"
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setPromptDialogText(image.prompt);
                                setPromptDialogOpen(true);
                              }}
                            >
                              {t('dashboard.generate.showPrompt')}
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "profile" && (
                <div className="max-w-4xl mx-auto">
                  <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden">
                    <CardHeader className="text-center bg-gray-50 dark:bg-gray-800">
                      <CardTitle className="text-3xl">{t('dashboard.profile.title')}</CardTitle>
                      <CardDescription className="text-lg">{t('dashboard.profile.subtitle')}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="space-y-8">
                        <div className="text-center">
                          <div className="relative group cursor-pointer">
                            <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-105 transition-transform duration-300">
                              <User className="w-12 h-12 text-white" />
                            </div>
                            <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                              <span className="text-white text-xs font-medium">{t('dashboard.profile.editAvatar')}</span>
                            </div>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {userName ? t('dashboard.profile.welcome', { name: userName }) : t('dashboard.profile.welcomeGeneric')}
                          </h3>
                          <p className="text-gray-500 mt-1">{t('dashboard.profile.creativeArtist')}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="group p-6 bg-purple-50 dark:bg-purple-900/20 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-purple-200/50 dark:border-purple-700/50">
                            <div className="flex items-center justify-between mb-3">
                              <ImageIcon className="w-8 h-8 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                            </div>
                            <div className="text-3xl font-bold text-purple-600 mb-1 group-hover:scale-105 transition-transform duration-300">
                              {isFreeUser && quotaUsed !== null && quotaLimit !== null ? (
                                <span>{quotaUsed} of {quotaLimit}</span>
                              ) : (
                                images.length
                              )}
                            </div>
                            <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
                              {isFreeUser && quotaUsed !== null && quotaLimit !== null ? t('dashboard.profile.dailyUsage') : t('dashboard.profile.imagesGenerated')}
                            </div>
                            <div className="text-xs text-purple-500 mt-1">
                              {isFreeUser && quotaUsed !== null && quotaLimit !== null ? (
                                t('dashboard.profile.remaining', { count: quotaLimit - quotaUsed })
                              ) : (
                                t('dashboard.profile.thisWeek', { count: images.filter(img => new Date(img.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length })
                              )}
                            </div>
                          </div>

                          <div className="group p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-blue-200/50 dark:border-blue-700/50">
                            <div className="flex items-center justify-between mb-3">
                              <Bot className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            </div>
                            <div className="text-3xl font-bold text-blue-600 mb-1 group-hover:scale-105 transition-transform duration-300">{Math.min(userAccessibleModels.length, availableModels.length)}</div>
                            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">{t('dashboard.profile.modelsUsed')}</div>
                            <div className="text-xs text-blue-500 mt-1">{t('dashboard.profile.exploreMore')}</div>
                          </div>

                          <div className="group p-6 bg-green-50 dark:bg-green-900/20 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-green-200/50 dark:border-green-700/50">
                            <div className="flex items-center justify-between mb-3">
                              <History className="w-8 h-8 text-green-600 group-hover:scale-110 transition-transform duration-300" />
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            </div>
                            <div className="text-3xl font-bold text-green-600 mb-1 group-hover:scale-105 transition-transform duration-300">{images.length > 0 ? Math.ceil((Date.now() - new Date(images[images.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}</div>
                            <div className="text-sm font-medium text-green-700 dark:text-green-300">{t('dashboard.profile.daysActive')}</div>
                            <div className="text-xs text-green-500 mt-1">{t('dashboard.profile.keepCreating')}</div>
                          </div>

                          {!profileLoading && (
                            <div className="group p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-yellow-200/50 dark:border-yellow-700/50 min-w-0">
                              {isFreeUser ? (
                                <>
                                  <div className="flex items-center justify-between mb-3">
                                    <Zap className="w-8 h-8 text-yellow-600 group-hover:scale-110 transition-transform duration-300" />
                                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                  </div>
                                  <div className="text-3xl font-bold text-yellow-600 mb-1 group-hover:scale-105 transition-transform duration-300">{quotaLeft !== null && quotaLeft !== undefined ? quotaLeft : 0}</div>
                                  <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Images Left (24h)</div>
                                  <div className="text-xs text-yellow-500 mt-1">Daily Quota: {quotaLimit}, Used: {quotaUsed !== null ? quotaUsed : 0}</div>
                                </>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between mb-3">
                                    <Rocket className="w-8 h-8 text-yellow-600 group-hover:scale-110 transition-transform duration-300" />
                                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                  </div>
                                  <div className="text-2xl font-black text-yellow-600 mb-1 group-hover:scale-105 transition-transform duration-300 leading-tight">
                                    {t('dashboard.profile.unlimited')}
                                  </div>
                                  <div className="text-sm font-bold text-yellow-700 dark:text-yellow-300">
                                    {t('dashboard.profile.enjoyUnlimited')}
                                  </div>
                                  <div className="text-xs text-yellow-600 mt-1">{t('dashboard.profile.premiumMember')}</div>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
                          <Button
                            variant="outline"
                            className="h-16 flex flex-col gap-2 hover:bg-purple-50 hover:border-purple-300 transition-all duration-300"
                            onClick={() => setActiveTab("generate")}
                          >
                            <Plus className="w-5 h-5 text-purple-600" />
                            <span className="text-sm">{t('dashboard.actions.createImage')}</span>
                          </Button>
                          <Button
                            variant="outline"
                            className="h-16 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"
                            onClick={() => setActiveTab("history")}
                          >
                            <History className="w-5 h-5 text-blue-600" />
                            <span className="text-sm">{t('dashboard.actions.viewGallery')}</span>
                          </Button>
                          <Button
                            variant="outline"
                            className="h-16 flex flex-col gap-2 hover:bg-green-50 hover:border-green-300 transition-all duration-300"
                            onClick={() => setActiveTab("albums")}
                          >
                            <Folder className="w-5 h-5 text-green-600" />
                            <span className="text-sm">{t('dashboard.actions.albums')}</span>
                          </Button>
                        </div>
                      </div>

                      <div className="flex justify-center mt-12 mb-4">
                        <Button
                          onClick={handleSignOut}
                          className="group flex items-center justify-center gap-4 px-16 py-6 rounded-full text-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-xl border-2 border-red-500 hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-red-300 w-full sm:w-auto relative overflow-hidden"
                          style={{ minWidth: 280 }}
                        >
                          <LogOut className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300" />
                          <span className="tracking-wide relative z-10">{t('dashboard.actions.logOut')}</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "albums" && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">{t('dashboard.albums.title')}</h2>
                  {selectedAlbum ? (
                    <div>
                      <Button variant="ghost" className="mb-4" onClick={() => setSelectedAlbum(null)}>
{t('dashboard.albums.backToAlbums')}
                      </Button>
                      <h3 className="text-xl font-semibold mb-4">{selectedAlbum.name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {albumImages.length === 0 ? (
                          <div className="col-span-full text-center text-gray-500">{t('dashboard.albums.noImagesInAlbum')}</div>
                        ) : (
                          albumImages.map((image) => (
                            <Card
                              key={image.id}
                              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden cursor-pointer"
                              onClick={() => { setExpandedImage(image); setShowFullPrompt(false); }}
                            >
                              <div className="relative aspect-square group">
                                <Image
                                  src={image.image_url || "/placeholder.svg"}
                                  alt={image.prompt}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/placeholder.svg"
                                  }}
                                />
                                {/* Delete icon button in top right */}
                                <button
                                  type="button"
                                  className="absolute top-2 right-2 z-10 p-1 rounded-full bg-white/80 dark:bg-gray-900/80 shadow hover:bg-red-100 dark:hover:bg-red-900 transition group-hover:opacity-100 opacity-0 group-focus-within:opacity-100 md:opacity-100"
                                  title="Delete image"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setPendingDeleteImageId(image.id)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="w-5 h-5 text-red-600" />
                                </button>
                              </div>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                                  <span>{image.model}</span>
                                  <span>{new Date(image.created_at).toLocaleDateString()}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full mt-2"
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setPromptDialogText(image.prompt);
                                    setPromptDialogOpen(true);
                                  }}
                                >
                                  {t('dashboard.generate.showPrompt')}
                                </Button>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {albums.length === 0 ? (
                        <div className="col-span-full text-center text-gray-500">{t('dashboard.albums.noAlbums')}</div>
                      ) : (
                        albums.map(album => (
                          <Card
                            key={album.id}
                            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden group"
                          >
                            <div 
                              className="relative aspect-square cursor-pointer"
                              onClick={() => setSelectedAlbum(album)}
                            >
                              <Image
                                src={album.cover_image_url || "/placeholder.svg"}
                                alt={album.name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/placeholder.svg"
                                }}
                              />
                              {/* Edit button - shows on hover */}
                              <Button
                                size="sm"
                                variant="secondary"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startEditingAlbum(album)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                            <CardContent className="p-4">
                              {editingAlbumId === album.id ? (
                                <div className="space-y-2">
                                  <Input
                                    value={editingAlbumName}
                                    onChange={(e) => setEditingAlbumName(e.target.value)}
                                    className="text-lg font-semibold"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        saveAlbumName(album.id)
                                      } else if (e.key === 'Escape') {
                                        cancelEditingAlbum()
                                      }
                                    }}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => saveAlbumName(album.id)}
                                      className="flex-1"
                                    >
{t('dashboard.albums.saveAlbum')}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelEditingAlbum}
                                      className="flex-1"
                                    >
{t('dashboard.albums.cancelEdit')}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  className="cursor-pointer"
                                  onClick={() => setSelectedAlbum(album)}
                                >
                                  <div className="font-semibold text-lg mb-1">{album.name}</div>
                                  <div className="text-xs text-gray-500">{album.album_images?.[0]?.count || 0} images</div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
          <DialogContent>
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>{t('dashboard.generate.customAspectTitle')}</DialogTitle>
                <DialogDescription>{t('dashboard.generate.customAspectDescription')}</DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="1"
                  value={customWidth}
                  onChange={e => setCustomWidth(Number(e.target.value))}
                  className="border rounded px-2 py-1 w-20"
                  required
                />
                <span>:</span>
                <input
                  type="number"
                  min="1"
                  value={customHeight}
                  onChange={e => setCustomHeight(Number(e.target.value))}
                  className="border rounded px-2 py-1 w-20"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit">{t('dashboard.generate.setAspectRatio')}</Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">{t('dashboard.generate.cancel')}</Button>
                </DialogClose>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Custom Quota Limit Dialog */}
        <QuotaLimitDialog
          open={quotaDialogOpen}
          onOpenChange={setQuotaDialogOpen}
          title={quotaDialogData.title}
          message={quotaDialogData.message}
          quotaInfo={quotaDialogData.quotaInfo}
        />

        {/* Enhanced Image Editor Dialog */}
        <Dialog open={!!expandedImage} onOpenChange={(open) => {
          if (!open) {
            setExpandedImage(null)
            resetEditMode()
          }
        }}>
          <DialogContent className="max-w-7xl w-full h-[95vh] p-0 overflow-hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>{editMode ? "Edit Image" : "View Image"}</DialogTitle>
            </DialogHeader>
            {expandedImage && (
              <div className={`relative w-full h-full ${editMode ? 'flex flex-col lg:flex-row' : 'flex flex-col'}`}>
                {/* Main Content Area */}
                <div className={`flex-1 flex flex-col ${editMode ? 'lg:w-2/3' : 'w-full'}`}>
                  {/* Header */}
                  <div className="bg-white dark:bg-gray-800 p-3 lg:p-4 pr-12 lg:pr-16 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2 lg:gap-4">
                      <h3 className="font-semibold text-base lg:text-lg">
                        {editMode ? "Image Editor" : "Image Viewer"}
                      </h3>
                      {editMode && editedImageUrl && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowBeforeAfter(!showBeforeAfter)}
                            className="text-xs lg:text-sm h-8 lg:h-9"
                          >
                            {showBeforeAfter ? "Hide" : "Compare"}
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!editMode && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditMode(true)
                            setEditPrompt(expandedImage.prompt)
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs lg:text-sm h-8 lg:h-9"
                        >
                          <Edit className="w-3 h-3 lg:w-4 lg:h-4 mr-1 lg:mr-2" />
                          <span className="hidden sm:inline">Edit Image</span>
                          <span className="sm:hidden">Edit</span>
                        </Button>
                      )}
                      {editMode && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={resetEditMode}
                          className="text-xs lg:text-sm h-8 lg:h-9"
                        >
                          <span className="hidden sm:inline">Exit Edit Mode</span>
                          <span className="sm:hidden">Exit</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Debug Info */}
                  {editMode && process.env.NODE_ENV === 'development' && (
                    <div className="absolute top-2 left-2 z-50 bg-black/80 text-white p-2 text-xs rounded">
                      <div>Original: {expandedImage.image_url ? '✓' : '✗'}</div>
                      <div>Edited: {editedImageUrl ? '✓' : '✗'}</div>
                      <div>Mode: {inpaintMode ? 'Inpaint' : 'Edit'}</div>
                      <div>Before/After: {showBeforeAfter ? 'On' : 'Off'}</div>
                    </div>
                  )}

                  {/* Image Display Area */}
                  <div className={`relative ${editMode ? 'h-48 sm:h-64 lg:flex-1' : 'flex-1'} bg-black`}>
                    {showBeforeAfter && editMode && editedImageUrl ? (
                      <div className="relative w-full h-full overflow-hidden">
                        {/* Background Image (Edited) */}
                        <div className="absolute inset-0">
                          <Image
                            src={editedImageUrl}
                            alt="Edited image"
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 60vw"
                            priority
                            onLoad={() => console.log('Before/After edited image loaded:', editedImageUrl)}
                            onError={() => console.error('Before/After edited image failed to load:', editedImageUrl)}
                          />
                        </div>
                        
                        {/* Overlay Image (Original) with clip-path */}
                        <div 
                          className="absolute inset-0"
                          style={{
                            clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
                          }}
                        >
                  <Image
                    src={expandedImage.image_url || "/placeholder.svg"}
                    alt={expandedImage.prompt}
                    fill
                    className="object-contain"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 60vw"
                    priority
                  />
                </div>
                
                        {/* Labels */}
                        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm z-30 pointer-events-none">
                          Original
                        </div>
                        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm z-30 pointer-events-none">
                          Edited
                        </div>

                        {/* Interactive overlay for slider */}
                        <div 
                          className="absolute inset-0 cursor-ew-resize z-20"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const updatePosition = (clientX: number) => {
                              const x = clientX - rect.left;
                              const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                              setSliderPosition(percentage);
                            };

                            updatePosition(e.clientX);

                            const handleMouseMove = (e: MouseEvent) => {
                              updatePosition(e.clientX);
                            };

                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove);
                              document.removeEventListener('mouseup', handleMouseUp);
                              document.body.style.userSelect = '';
                            };

                            document.body.style.userSelect = 'none';
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const updatePosition = (clientX: number) => {
                              const x = clientX - rect.left;
                              const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
                              setSliderPosition(percentage);
                            };

                            updatePosition(e.touches[0].clientX);

                            const handleTouchMove = (e: TouchEvent) => {
                              e.preventDefault();
                              updatePosition(e.touches[0].clientX);
                            };

                            const handleTouchEnd = () => {
                              document.removeEventListener('touchmove', handleTouchMove);
                              document.removeEventListener('touchend', handleTouchEnd);
                            };

                            document.addEventListener('touchmove', handleTouchMove, { passive: false });
                            document.addEventListener('touchend', handleTouchEnd);
                          }}
                        />

                        {/* Slider Line and Handle */}
                        <div 
                          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-30 pointer-events-none"
                          style={{ left: `${sliderPosition}%` }}
                        >
                          {/* Slider Handle */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-xl border-2 border-gray-300 flex items-center justify-center pointer-events-none">
                            <div className="flex gap-0.5">
                              <div className="w-0.5 h-4 bg-gray-400 rounded-full"></div>
                              <div className="w-0.5 h-4 bg-gray-400 rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-full">
                        <Image
                          id="expanded-image"
                          src={editedImageUrl || expandedImage.image_url || "/placeholder.svg"}
                          alt={expandedImage.prompt}
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 60vw"
                          priority
                          onLoad={(e) => {
                            const img = e.target as HTMLImageElement
                            console.log('Image loaded successfully:', img.src)
                            updateEditingState({ imageRef: img })
                            if (inpaintMode) {
                              initializeMaskCanvas(img)
                            }
                          }}
                          onError={(e) => {
                            const img = e.target as HTMLImageElement
                            console.error('Image failed to load:', img.src)
                            console.error('Current editedImageUrl:', editedImageUrl)
                            console.error('Fallback to original image:', expandedImage.image_url)
                          }}
                        />
                        

                        {/* Inpainting Canvas Overlay */}
                        {inpaintMode && (
                          <div className="absolute inset-0 z-10 pointer-events-auto">
                            <canvas
                              className="absolute inset-0 w-full h-full cursor-crosshair"
                              style={{
                                imageRendering: 'pixelated',
                                opacity: 0.6,
                                mixBlendMode: 'multiply'
                              }}
                              onMouseDown={(e) => {
                                setIsDrawing(true)
                                const rect = e.currentTarget.getBoundingClientRect()
                                const img = document.querySelector('#expanded-image') as HTMLImageElement
                                if (img) {
                                  const { x, y } = getImageCoordinates(e.clientX, e.clientY, img)
                                  if (e.shiftKey) {
                                    eraseFromMask(x, y)
                                  } else {
                                    drawOnMask(x, y)
                                  }
                                }
                              }}
                              onMouseMove={(e) => {
                                if (!isDrawing) return
                                const rect = e.currentTarget.getBoundingClientRect()
                                const img = document.querySelector('#expanded-image') as HTMLImageElement
                                if (img) {
                                  const { x, y } = getImageCoordinates(e.clientX, e.clientY, img)
                                  if (e.shiftKey) {
                                    eraseFromMask(x, y)
                                  } else {
                                    drawOnMask(x, y)
                                  }
                                }
                              }}
                              onMouseUp={() => setIsDrawing(false)}
                              onMouseLeave={() => setIsDrawing(false)}
                              onTouchStart={(e) => {
                                e.preventDefault()
                                setIsDrawing(true)
                                const rect = e.currentTarget.getBoundingClientRect()
                                const img = document.querySelector('#expanded-image') as HTMLImageElement
                                if (img && e.touches[0]) {
                                  const { x, y } = getImageCoordinates(e.touches[0].clientX, e.touches[0].clientY, img)
                                  drawOnMask(x, y)
                                }
                              }}
                              onTouchMove={(e) => {
                                e.preventDefault()
                                if (!isDrawing) return
                                const rect = e.currentTarget.getBoundingClientRect()
                                const img = document.querySelector('#expanded-image') as HTMLImageElement
                                if (img && e.touches[0]) {
                                  const { x, y } = getImageCoordinates(e.touches[0].clientX, e.touches[0].clientY, img)
                                  drawOnMask(x, y)
                                }
                              }}
                              onTouchEnd={() => setIsDrawing(false)}
                              ref={(canvas) => {
                                if (canvas && maskCanvas && imageRef) {
                                  // Update canvas display to match the image dimensions
                                  const img = imageRef
                                  const rect = img.getBoundingClientRect()
                                  canvas.width = rect.width
                                  canvas.height = rect.height
                                  
                                  // Draw the mask onto the display canvas
                                  const ctx = canvas.getContext('2d')
                                  if (ctx && maskCanvas) {
                                    ctx.clearRect(0, 0, canvas.width, canvas.height)
                                    ctx.globalCompositeOperation = 'source-over'
                                    ctx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height)
                                  }
                                }
                              }}
                            />
                            
                            {/* Brush cursor indicator */}
                            <div 
                              className="absolute pointer-events-none border-2 border-red-500 rounded-full bg-red-500/20"
                              style={{
                                width: `${brushSize * 2}px`,
                                height: `${brushSize * 2}px`,
                                transform: 'translate(-50%, -50%)',
                                display: 'none'
                              }}
                              id="brush-cursor"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Bar */}
                  {!editMode && (
                <div className="bg-white dark:bg-gray-800 p-4 border-t">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {expandedImage.prompt}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{expandedImage.model}</span>
                        <span>{new Date(expandedImage.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadImage(expandedImage.image_url, expandedImage.prompt)}
                      >
                        {t('dashboard.generate.download')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => shareImage(expandedImage.image_url, expandedImage.prompt)}
                      >
                        {t('dashboard.generate.share')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPromptDialogText(expandedImage.prompt);
                          setPromptDialogOpen(true);
                        }}
                      >
                        {t('dashboard.generate.showPrompt')}
                      </Button>
                    </div>
                  </div>
                </div>
                  )}
                </div>

                {/* Edit Controls Panel */}
                {editMode && (
                  <div className="w-full lg:w-1/3 bg-gray-50 dark:bg-gray-900 border-t lg:border-t-0 lg:border-l flex flex-col max-h-[50vh] lg:max-h-none lg:h-full">
                    {/* Panel Header */}
                    <div className="p-3 lg:p-4 border-b bg-white dark:bg-gray-800 flex-shrink-0">
                      <div className="flex items-center justify-between mb-1 lg:mb-2">
                        <h4 className="font-semibold text-base lg:text-lg">Edit Controls</h4>
                        <Button
                          variant={inpaintMode ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setInpaintMode(!inpaintMode)
                            if (!inpaintMode && expandedImage) {
                              // Initialize canvas when entering inpaint mode
                              const img = document.querySelector('#expanded-image') as HTMLImageElement
                              if (img) {
                                initializeMaskCanvas(img)
                              }
                            }
                          }}
                          className="text-xs h-7"
                        >
                          <Paintbrush className="w-3 h-3 mr-1" />
                          {inpaintMode ? t('dashboard.generate.exitPaintMode') : t('dashboard.generate.paintMode')}
                        </Button>
                      </div>
                      <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">
                        {inpaintMode 
                          ? t('dashboard.generate.paintAreas')
                          : "Describe the changes you want to make to this image"
                        }
                      </p>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-2 lg:space-y-3 min-h-0">
                      {/* Edit Prompt */}
                      <div className="space-y-2">
                        <Label htmlFor="edit-prompt" className="text-xs lg:text-sm font-medium">
                          Edit Description
                        </Label>
                        <Textarea
                          id="edit-prompt"
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                          placeholder={inpaintMode 
                            ? "Describe what should replace the painted areas..."
                            : "Describe what you want to change in the image..."
                          }
                          className="min-h-[50px] lg:min-h-[80px] resize-none text-sm"
                        />
                      </div>

                      {/* Inpainting Controls */}
                      {inpaintMode && (
                        <div className="space-y-2 p-2 lg:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs lg:text-sm font-medium text-blue-900 dark:text-blue-100">
                              {t('dashboard.generate.paintingTools')}
                            </Label>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={clearMask}
                                className="h-6 lg:h-7 px-2 text-xs"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                {t('dashboard.generate.clearMask')}
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-1 lg:space-y-2">
                            <Label className="text-xs font-medium text-blue-800 dark:text-blue-200">
                              {t('dashboard.generate.brushSize')}: {brushSize}px
                            </Label>
                            <Slider
                              value={[brushSize]}
                              onValueChange={(value) => setBrushSize(value[0])}
                              max={50}
                              min={5}
                              step={5}
                              className="w-full"
                            />
                          </div>
                          
                          <div className="space-y-1 lg:space-y-2">
                            <Label className="text-xs font-medium text-blue-800 dark:text-blue-200">
                              Inpaint Strength: {inpaintStrength.toFixed(2)}
                            </Label>
                            <Slider
                              value={[inpaintStrength]}
                              onValueChange={(value) => setInpaintStrength(value[0])}
                              max={1}
                              min={0.1}
                              step={0.05}
                              className="w-full"
                            />
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              How much to change the painted areas
                            </p>
                          </div>
                          
                          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
                            <p>• Click and drag to paint areas you want to replace</p>
                            <p>• Hold Shift while painting to erase</p>
                            <p>• Use larger brush for broad areas, smaller for details</p>
                          </div>
                        </div>
                      )}

                      {/* Guidance Scale */}
                      <div className="space-y-2 lg:space-y-3">
                        <Label className="text-xs lg:text-sm font-medium">
                          Guidance Scale: {(editGuidanceScale * 35).toFixed(1)}
                        </Label>
                        <Slider
                          value={[editGuidanceScale]}
                          onValueChange={(value) => setEditGuidanceScale(value[0])}
                          max={1}
                          min={0}
                          step={0.1}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500">
                          Lower = more creative, Higher = follows prompt closely
                        </p>
                      </div>



                      {/* Quick Edit Presets */}
                      {!inpaintMode && (
                        <div className="space-y-2 lg:space-y-3">
                          <Label className="text-xs lg:text-sm font-medium">Quick Edits</Label>
                          <div className="grid grid-cols-2 gap-1.5 lg:gap-2">
                            {[
                              "Enhance lighting",
                              "Change to night",
                              "Add more colors",
                              "Make it vintage",
                              "Add dramatic sky",
                              "Change season"
                            ].map((preset) => (
                              <Button
                                key={preset}
                                size="sm"
                                variant="outline"
                                onClick={() => setEditPrompt(preset)}
                                className="text-xs py-1.5 px-2 h-auto"
                              >
                                {preset}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Edit History */}
                      {editHistory.length > 0 && (
                        <div className="space-y-2 lg:space-y-3">
                          <Label className="text-xs lg:text-sm font-medium">Edit History</Label>
                          <div className="space-y-1.5 lg:space-y-2 max-h-32 lg:max-h-40 overflow-y-auto">
                            {editHistory.map((edit) => (
                              <div
                                key={edit.id}
                                className="p-2 bg-white dark:bg-gray-800 rounded border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                                onClick={() => setEditedImageUrl(edit.imageUrl)}
                              >
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                  {edit.prompt}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="p-3 lg:p-4 border-t-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 space-y-2 lg:space-y-3 flex-shrink-0 shadow-lg">
                      {/* Visual indicator for inpaint mode */}
                      {inpaintMode && (
                        <div className="text-center py-1">
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            🎨 Inpaint Mode Active - Ready to Apply
                          </span>
                        </div>
                      )}
                      
                      <Button
                        onClick={inpaintMode ? performInpainting : editImage}
                        disabled={editLoading || !editPrompt.trim()}
                        className={`w-full text-white h-12 lg:h-12 text-sm font-bold transition-all duration-200 ${
                          inpaintMode 
                            ? "bg-blue-600 hover:bg-blue-700 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800" 
                            : "bg-purple-600 hover:bg-purple-700"
                        }`}
                      >
                        {editLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {inpaintMode ? "Processing inpainting... (may take 1-3 minutes)" : "Editing..."}
                          </>
                        ) : (
                          <>
                            {inpaintMode ? (
                              <>
                                <Paintbrush className="w-4 h-4 mr-2" />
                                {t('dashboard.generate.applyInpainting')}
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-4 h-4 mr-2" />
                                Apply Edit
                              </>
                            )}
                          </>
                        )}
                      </Button>

                      {/* Undo Button - Show only after successful inpainting */}
                      {showUndoButton && inpaintMode && (
                        <Button
                          onClick={undoInpainting}
                          disabled={editLoading}
                          variant="outline"
                          className="w-full h-10 lg:h-10 text-sm font-medium border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                        >
                          {editLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                              Undoing...
                            </>
                          ) : (
                            <>
                              <Undo2 className="w-4 h-4 mr-2" />
                              {t('dashboard.generate.undoInpainting')}
                            </>
                          )}
                        </Button>
                      )}
                      
                      {editedImageUrl && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadImage(editedImageUrl, editPrompt)}
                            className="flex-1 h-8 lg:h-9 text-xs lg:text-sm"
                          >
                            Download
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => shareImage(editedImageUrl, editPrompt)}
                            className="flex-1 h-8 lg:h-9 text-xs lg:text-sm"
                          >
                            Share
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Prompt Display Dialog */}
        <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('dashboard.generate.promptTitle')}</DialogTitle>
              <DialogDescription>
                {t('dashboard.generate.promptDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {promptDialogText}
                </p>
              </div>
              <div className="flex justify-between items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(promptDialogText)
                    setCopied(true)
                    toast({
                      title: t('dashboard.generate.copied'),
                      description: t('dashboard.generate.copiedDescription'),
                    })
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <span>✓</span>
                      {t('dashboard.generate.copied')}
                    </>
                  ) : (
                    <>
                      <span>📋</span>
                      {t('dashboard.generate.copyPrompt')}
                    </>
                  )}
                </Button>
                <DialogClose asChild>
                  <Button>{t('dashboard.generate.close')}</Button>
                </DialogClose>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('dashboard.generate.deleteImageTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('dashboard.generate.deleteImageDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('dashboard.generate.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (pendingDeleteImageId) {
                    await deleteImage(pendingDeleteImageId)
                    setPendingDeleteImageId(null)
                  }
                  setDeleteDialogOpen(false)
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                {t('dashboard.generate.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50 pb-safe-bottom">
          <div className="flex items-center justify-around px-2 py-2">
            <button
              onClick={() => {
                setActiveTab("generate")
                setUserMenuOpen(false)
              }}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors touch-manipulation ${
                activeTab === "generate" 
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs font-medium">Generate</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab("history")
                setUserMenuOpen(false)
              }}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors touch-manipulation ${
                activeTab === "history" 
                  ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <History className="w-5 h-5" />
              <span className="text-xs font-medium">History</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab("albums")
                setUserMenuOpen(false)
              }}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors touch-manipulation ${
                activeTab === "albums" 
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Folder className="w-5 h-5" />
              <span className="text-xs font-medium">Albums</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab("profile")
                setUserMenuOpen(false)
              }}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-colors touch-manipulation ${
                activeTab === "profile" 
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <UserCircle className="w-5 h-5" />
              <span className="text-xs font-medium">Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
