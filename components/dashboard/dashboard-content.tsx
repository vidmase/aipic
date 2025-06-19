"use client"

import React, { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { ADMIN_EMAILS } from "@/lib/admin-config"
import { Sparkles, Share2, History, User, LogOut, Plus, Square, RectangleHorizontal, RectangleVertical, Settings2, Zap, Image as ImageIcon, Rocket, PenTool, Palette, Brain, Bot, Folder, Menu, UserCircle, Trash2, Lock, Shield, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { QuotaLimitDialog } from "@/components/ui/quota-limit-dialog"
import { AuroraText } from "@/components/ui/aurora-text"
import { useRouter } from "next/navigation"
import Image from "next/image"
import type { Database } from "@/lib/supabase/types"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import PromptSuggestions from "./PromptSuggestions"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

type GeneratedImage = Database["public"]["Tables"]["generated_images"]["Row"]

interface DashboardContentProps {
  initialImages: GeneratedImage[]
}

// --- Image Generation Quota Config ---
const IMAGE_GENERATION_QUOTA_PER_DAY = 3; // Keep in sync with API

export function DashboardContent({ initialImages }: DashboardContentProps) {
  const [prompt, setPrompt] = useState("")
  const [model, setModel] = useState("fal-ai/ideogram/v2")
  const [aspectRatio, setAspectRatio] = useState("1:1")
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<GeneratedImage[]>(initialImages)
  const [activeTab, setActiveTab] = useState("generate")
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const [customWidth, setCustomWidth] = useState(1)
  const [customHeight, setCustomHeight] = useState(1)
  const [expandedImage, setExpandedImage] = useState<GeneratedImage | null>(null)
  const [showFullPrompt, setShowFullPrompt] = useState(false)
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [promptDialogText, setPromptDialogText] = useState("")
  const [copied, setCopied] = useState(false)
  const [improvingPrompt, setImprovingPrompt] = useState(false)
  const [albums, setAlbums] = useState<any[]>([])
  const [selectedAlbum, setSelectedAlbum] = useState<any | null>(null)
  const [albumImages, setAlbumImages] = useState<GeneratedImage[]>([])
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDeleteImageId, setPendingDeleteImageId] = useState<string | null>(null)
  const [renderingSpeed, setRenderingSpeed] = useState('BALANCED')
  const [style, setStyle] = useState('AUTO')
  const [expandPrompt, setExpandPrompt] = useState(true)
  const [imageSize, setImageSize] = useState('square_hd')
  const [numImages, setNumImages] = useState(1)
  const [guidanceScale, setGuidanceScale] = useState(7.5)
  const [numSteps, setNumSteps] = useState(25)
  const [currentModelIndex, setCurrentModelIndex] = useState(0)
  const [expandPromptFast, setExpandPromptFast] = useState(false)
  const [enableSafetyChecker, setEnableSafetyChecker] = useState(true)
  const [negativePrompt, setNegativePrompt] = useState('')
  const [format, setFormat] = useState('jpeg')
  const [seed, setSeed] = useState('')
  const [styleCodes, setStyleCodes] = useState('')
  const [colorPalette, setColorPalette] = useState('')
  const [customPalette, setCustomPalette] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [quotaUsed, setQuotaUsed] = useState<number | null>(null)
  const [quotaLimit, setQuotaLimit] = useState<number>(3) // Keep in sync with API
  const [quotaLeft, setQuotaLeft] = useState<number | null>(null)
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [pinError, setPinError] = useState("")
  const categories = ["Text to Image"]
  const [userName, setUserName] = useState<string | null>(null)
  const [isFreeUser, setIsFreeUser] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userAccessibleModels, setUserAccessibleModels] = useState<string[]>([])
  const [refreshingPermissions, setRefreshingPermissions] = useState(false)
  const [modelPanelOpen, setModelPanelOpen] = useState(false)
  
  // Quota limit dialog state
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false)
  const [quotaDialogData, setQuotaDialogData] = useState<{
    title: string
    message: string
    quotaInfo?: { used: number; limit: number; period: "hourly" | "daily" | "monthly" }
  }>({ title: "", message: "" })
  
  const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const generateImage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    // Refresh accessible models before generating to ensure latest permissions
    if (isFreeUser) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_tier")
          .eq("id", user.id)
          .single();
        
        if (profile?.user_tier) {
          await fetchUserAccessibleModels(profile.user_tier);
          
          // Check if the selected model is still accessible after refresh
          if (!isModelAccessible(model)) {
            toast({
              title: "Access Denied",
              description: "You no longer have access to this model. Please select a different model.",
              variant: "destructive",
            });
            return;
          }
        }
      }
    }

    setLoading(true)
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          model,
          aspectRatio,
          ...(model === 'fal-ai/ideogram/v3' && {
            renderingSpeed,
            style,
            expandPrompt,
          }),
          ...(model === 'fal-ai/fast-sdxl' && {
            image_size: imageSize,
            num_images: numImages,
            guidance_scale: guidanceScale,
            num_inference_steps: numSteps,
            expand_prompt: expandPromptFast,
            enable_safety_checker: enableSafetyChecker,
            negative_prompt: negativePrompt,
            format,
            seed: seed ? Number(seed) : undefined,
          }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image")
      }

      // Support both single and multiple images
      const newImages = data.images || (data.image ? [data.image] : [])
      setImages((prev) => [...newImages, ...prev])

      toast({
        title: "Success",
        description: `${newImages.length} image${newImages.length > 1 ? 's' : ''} generated successfully!`,
      })

      setPrompt("")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to generate image"
      
      // Check if it's a quota limit error and show custom dialog
      if (errorMessage.includes("Generation limit reached")) {
        handleQuotaLimitError(errorMessage)
      } else {
        // Show regular toast for other errors
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const downloadImage = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ai-image-${prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "-")}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download image",
        variant: "destructive",
      })
    }
  }

  const shareImage = async (imageUrl: string, prompt: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "AI Generated Image",
          text: `Check out this AI-generated image: "${prompt}"`,
          url: imageUrl,
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(imageUrl)
        toast({
          title: "Success",
          description: "Image URL copied to clipboard!",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy URL",
          variant: "destructive",
        })
      }
    }
  }

  const refreshImages = async () => {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast({ title: "Error", description: "Not authenticated", variant: "destructive" })
        return
      }
      const { data, error } = await supabase
        .from("generated_images")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12)
      if (error) throw error
      setImages(data || [])
      toast({ title: "Refreshed", description: "Images updated" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to refresh images", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAspectRatioChange = (value: string) => {
    if (value === "custom") {
      setCustomDialogOpen(true)
    } else {
      setAspectRatio(value)
    }
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAspectRatio(`${customWidth}:${customHeight}`)
    setCustomDialogOpen(false)
  }

  // Fetch albums for the user
  const fetchAlbums = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return
    const { data, error } = await supabase
      .from("albums")
      .select("*, album_images(count)")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
    if (!error) setAlbums(data || [])
  }

  // Fetch images for a selected album
  const fetchAlbumImages = async (albumId: string) => {
    const { data, error } = await supabase
      .from("album_images")
      .select("generated_images(*)")
      .eq("album_id", albumId)
    if (!error) {
      setAlbumImages((data || []).map((row: any) => row.generated_images))
    }
  }

  // When Albums tab is activated, fetch albums
  React.useEffect(() => {
    if (activeTab === "albums") {
      fetchAlbums()
      setSelectedAlbum(null)
      setAlbumImages([])
    }
  }, [activeTab])

  // When an album is selected, fetch its images
  React.useEffect(() => {
    if (selectedAlbum) {
      fetchAlbumImages(selectedAlbum.id)
    }
  }, [selectedAlbum])

  // Move image to another album and log correction
  const moveImageToAlbum = async (imageId: string, newAlbumId: string) => {
    // Remove from all albums, then add to new album
    await supabase.from("album_images").delete().eq("image_id", imageId)
    await supabase.from("album_images").insert({ album_id: newAlbumId, image_id: imageId })
    // Log correction in localStorage for learning
    const corrections = JSON.parse(localStorage.getItem("album_corrections") || "[]")
    corrections.push({ imageId, newAlbumId, timestamp: Date.now() })
    localStorage.setItem("album_corrections", JSON.stringify(corrections))
    toast({ title: "Moved", description: "Image moved to new album." })
    // Refresh album images if in album view
    if (selectedAlbum) fetchAlbumImages(selectedAlbum.id)
  }

  // Delete an image from the database and UI
  const deleteImage = async (imageId: string) => {
    setLoading(true)
    try {
      // Remove from album_images first (if exists)
      await supabase.from("album_images").delete().eq("image_id", imageId)
      // Remove from generated_images
      const { error } = await supabase.from("generated_images").delete().eq("id", imageId)
      if (error) throw error
      setImages(prev => prev.filter(img => img.id !== imageId))
      setAlbumImages(prev => prev.filter(img => img.id !== imageId))
      toast({ title: "Deleted", description: "Image deleted successfully." })
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete image.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (category: string, checked: boolean | "indeterminate") => {
    setSelectedCategories((prev) =>
      checked
        ? [...prev, category]
        : prev.filter((c) => c !== category)
    )
  }

  // Fetch user accessible models based on their tier
  const fetchUserAccessibleModels = async (userTier: string, showLoading: boolean = false) => {
    try {
      if (showLoading) setRefreshingPermissions(true)
      
      console.log(`🔍 Fetching accessible models for tier: ${userTier}`)
      
      const { data: accessibleModels, error } = await supabase
        .from('tier_model_access')
        .select(`
          is_enabled,
          image_models!inner(model_id),
          user_tiers!inner(name)
        `)
        .eq('user_tiers.name', userTier)
        .eq('is_enabled', true)
      
      if (error) {
        console.error('❌ Error fetching accessible models:', error)
        setUserAccessibleModels([])
        return
      }
      
      console.log('📊 Raw accessible models data:', accessibleModels)
      
      const modelIds = accessibleModels?.map(access => access.image_models.model_id) || []
      console.log(`✅ Accessible model IDs for ${userTier}:`, modelIds)
      setUserAccessibleModels(modelIds)
      
      if (showLoading) {
        toast({
          title: "Permissions Updated",
          description: `Loaded ${modelIds.length} accessible models`,
        })
      }
    } catch (error) {
      console.error('Error fetching accessible models:', error)
      setUserAccessibleModels([])
      if (showLoading) {
        toast({
          title: "Error",
          description: "Failed to refresh model permissions",
          variant: "destructive",
        })
      }
    } finally {
      if (showLoading) setRefreshingPermissions(false)
    }
  }

  // Manual refresh function for permissions
  const refreshModelPermissions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_tier")
        .eq("id", session.user.id)
        .single();
      
      if (profile?.user_tier) {
        await fetchUserAccessibleModels(profile.user_tier, true);
      }
    }
  }

  // Check if a model is accessible to the current user
  const isModelAccessible = (modelId: string) => {
    const isAccessible = userAccessibleModels.includes(modelId) || !isFreeUser
    console.log(`🔐 Model ${modelId} accessibility check:`, {
      isFreeUser,
      isInAccessibleList: userAccessibleModels.includes(modelId),
      userAccessibleModels,
      finalResult: isAccessible
    })
    return isAccessible
  }

  // Parse quota limit error and show custom dialog
  const handleQuotaLimitError = (errorMessage: string) => {
    // Extract quota information from error message
    // Example: "Generation limit reached: Hourly limit exceeded (1/1)"
    const quotaMatch = errorMessage.match(/(.+) limit exceeded \((\d+)\/(\d+)\)/i)
    
    if (quotaMatch) {
      const [, period, used, limit] = quotaMatch
      const periodType = period.toLowerCase() as "hourly" | "daily" | "monthly"
      
      setQuotaDialogData({
        title: "Generation Limit Reached",
        message: `You've reached your ${period.toLowerCase()} generation limit. Please wait before generating more images or consider upgrading to Premium for unlimited access.`,
        quotaInfo: {
          used: parseInt(used),
          limit: parseInt(limit),
          period: periodType
        }
      })
    } else {
      // Fallback for general quota errors
      setQuotaDialogData({
        title: "Generation Limit Reached",
        message: errorMessage.replace("Generation limit reached: ", ""),
      })
    }
    
    setQuotaDialogOpen(true)
  }

  // Fetch user and quota status together to avoid race condition
  useEffect(() => {
    let channel: any = null;
    async function fetchUserAndQuota() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setProfileLoading(false);
        return;
      }
      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, is_premium, user_tier")
        .eq("id", session.user.id)
        .single();
      if (profileError) {
        // Try to create a profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || session.user.email,
            is_premium: false,
            user_tier: 'free'
          })
          .select()
          .single();
        if (createError) {
          setProfileLoading(false);
          return;
        }
        profile = newProfile;
      }
      setUserName(profile?.full_name || session.user.email || "User");
      setUserEmail(session.user.email || null);
      const isPremium = !!profile?.is_premium;
      const userTier = profile?.user_tier || 'free';
      setIsFreeUser(!isPremium);
      
      // Fetch accessible models for this user's tier
      await fetchUserAccessibleModels(userTier);
      if (!isPremium) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("generated_images")
          .select("id", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .gte("created_at", since);
        setQuotaUsed(count ?? 0);
        setQuotaLeft(
          typeof count === "number"
            ? Math.max(IMAGE_GENERATION_QUOTA_PER_DAY - count, 0)
            : 0
        );
        setQuotaLimit(IMAGE_GENERATION_QUOTA_PER_DAY);
      } else {
        setQuotaUsed(null);
        setQuotaLeft(null);
        setQuotaLimit(Infinity);
      }
      setProfileLoading(false);
    }
    fetchUserAndQuota();
    // Supabase Realtime subscription for profile changes and tier access changes
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      supabase.removeAllChannels();
      
      // Get user's tier to filter tier_model_access changes
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_tier")
        .eq("id", session.user.id)
        .single();
      
      const userTier = profile?.user_tier || 'free';
      
      channel = supabase
        .channel('dashboard-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${session.user.id}`,
          },
          () => {
            fetchUserAndQuota();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*', // Listen for INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'tier_model_access',
          },
          async (payload) => {
            // Refresh accessible models when tier access changes
            console.log('🔄 Tier model access changed, refreshing permissions...');
            await fetchUserAccessibleModels(userTier);
          }
        )
        .subscribe();
    })();
    return () => {
      supabase.removeAllChannels();
    };
  }, []);

  // Available models with mobile-friendly data
  const availableModels = [
    {
      id: "fal-ai/fast-sdxl",
      name: "Fast SDXL",
      description: "Quick generation, good quality",
      category: "Fast & Free",
      icon: Zap,
      iconColor: "text-green-600",
      bgColor: "bg-green-100",
      price: isFreeUser ? "Free" : "$0.0025"
    },
    {
      id: "fal-ai/hidream-i1-fast",
      name: "HiDream I1 Fast", 
      description: "Ultra-fast Asian aesthetics",
      category: "Fast & Free",
      icon: Rocket,
      iconColor: "text-cyan-600", 
      bgColor: "bg-cyan-100",
      price: isFreeUser ? "Free" : "$0.01/MP"
    },
    {
      id: "fal-ai/flux/dev",
      name: "FLUX Dev",
      description: "High quality, versatile",
      category: "FLUX Models",
      icon: ImageIcon,
      iconColor: "text-yellow-600",
      bgColor: "bg-yellow-100", 
      price: "$0.025/MP"
    },
    {
      id: "fal-ai/flux-pro/v1.1-ultra",
      name: "FLUX Pro Ultra",
      description: "Premium quality, photorealistic", 
      category: "Premium",
      icon: Rocket,
      iconColor: "text-pink-600",
      bgColor: "bg-pink-100",
      price: "$0.04-0.06"
    },
    {
      id: "fal-ai/flux-pro/kontext/text-to-image",
      name: "FLUX Kontext T2I",
      description: "Context-aware generation",
      category: "Premium", 
      icon: Brain,
      iconColor: "text-orange-600",
      bgColor: "bg-orange-100",
      price: "$0.04"
    },
    {
      id: "fal-ai/ideogram/v2", 
      name: "Ideogram v2",
      description: "Excellent text rendering",
      category: "Text & Logos",
      icon: PenTool,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-100",
      price: "$0.08"
    },
    {
      id: "fal-ai/ideogram/v3",
      name: "Ideogram v3", 
      description: "Latest text & logo model",
      category: "Text & Logos",
      icon: PenTool,
      iconColor: "text-blue-700",
      bgColor: "bg-blue-100"
    },
    {
      id: "fal-ai/recraft-v3",
      name: "Recraft V3",
      description: "Vector & design generation", 
      category: "Text & Logos",
      icon: Palette,
      iconColor: "text-purple-600",
      bgColor: "bg-purple-100",
      price: "$0.04-0.08"
    },
    {
      id: "fal-ai/imagen4/preview",
      name: "Imagen 4 Preview",
      description: "Google's latest AI model",
      category: "Advanced",
      icon: ImageIcon, 
      iconColor: "text-pink-600",
      bgColor: "bg-pink-100",
      price: "$0.05"
    },
    {
      id: "fal-ai/imagen4/preview/ultra",
      name: "Imagen4-Ultra", 
      description: "Ultra-high quality generation",
      category: "Advanced",
      icon: ImageIcon,
      iconColor: "text-pink-700",
      bgColor: "bg-pink-100",
      price: "$0.08"
    },
    {
      id: "fal-ai/stable-diffusion-v35-large",
      name: "Stable Diffusion 3.5 Large",
      description: "Open-source powerhouse",
      category: "Advanced",
      icon: Brain,
      iconColor: "text-indigo-600", 
      bgColor: "bg-indigo-100",
      price: "$0.065"
    }
  ]

  // Update current model index when model changes
  useEffect(() => {
    const modelIndex = availableModels.findIndex(m => m.id === model)
    if (modelIndex !== -1) {
      setCurrentModelIndex(modelIndex)
    }
  }, [model])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900">
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/90 dark:bg-gray-900/90 shadow-sm sticky top-0 z-50">
          <div className="container mx-auto px-2 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
            {/* Logo */}
            <div className="flex items-center space-x-3 w-full sm:w-auto justify-between">
              <button 
                onClick={() => setActiveTab("generate")}
                className="flex items-center space-x-3 group cursor-pointer hover:scale-105 transition-transform duration-200"
                title="Generate AI Image"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center shadow group-hover:shadow-lg transition-shadow duration-200">
                  <Sparkles className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-200" />
                </div>
                <AuroraText className="text-2xl group-hover:scale-105 transition-transform duration-200">
                  AI Image Studio
                </AuroraText>
              </button>
              {/* Hamburger for mobile */}
              <button className="sm:hidden ml-auto" onClick={() => setUserMenuOpen((open) => !open)}>
                <Menu className="w-7 h-7 text-purple-600" />
              </button>
            </div>
            {/* Menu */}
            <nav className="hidden sm:flex items-center gap-2 md:gap-4 w-full sm:w-auto justify-end">
              <Button
                variant={activeTab === "generate" ? "default" : "ghost"}
                onClick={() => setActiveTab("generate")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === "generate" ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              >
                <Plus className="w-4 h-4" />
                <span>Generate</span>
              </Button>
              <Button
                variant={activeTab === "history" ? "default" : "ghost"}
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === "history" ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              >
                <History className="w-4 h-4" />
                <span>History</span>
              </Button>
              <Button
                variant={activeTab === "albums" ? "default" : "ghost"}
                onClick={() => setActiveTab("albums")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === "albums" ? "bg-gradient-to-r from-green-400 to-blue-500 text-white shadow" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              >
                <Folder className="w-4 h-4" />
                <span>Albums</span>
              </Button>
              <Button
                variant={activeTab === "profile" ? "default" : "ghost"}
                onClick={() => setActiveTab("profile")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === "profile" ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
              >
                <UserCircle className="w-4 h-4" />
                <span>Profile</span>
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => router.push('/admin')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-700 dark:text-red-400"
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                </Button>
              )}
            </nav>
            {/* Mobile nav */}
            {userMenuOpen && (
              <nav className="flex flex-col gap-2 w-full sm:hidden bg-white dark:bg-gray-900 rounded-lg shadow p-2 mt-2 z-50">
                <Button
                  variant={activeTab === "generate" ? "default" : "ghost"}
                  onClick={() => setActiveTab("generate")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === "generate" ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Generate</span>
                </Button>
                <Button
                  variant={activeTab === "history" ? "default" : "ghost"}
                  onClick={() => setActiveTab("history")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === "history" ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                >
                  <History className="w-4 h-4" />
                  <span>History</span>
                </Button>
                <Button
                  variant={activeTab === "albums" ? "default" : "ghost"}
                  onClick={() => setActiveTab("albums")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === "albums" ? "bg-gradient-to-r from-green-400 to-blue-500 text-white shadow" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                >
                  <Folder className="w-4 h-4" />
                  <span>Albums</span>
                </Button>
                <Button
                  variant={activeTab === "profile" ? "default" : "ghost"}
                  onClick={() => setActiveTab("profile")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === "profile" ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow" : "hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                >
                  <UserCircle className="w-4 h-4" />
                  <span>Profile</span>
                </Button>
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => router.push('/admin')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-700 dark:text-red-400"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </Button>
                )}
              </nav>
            )}
          </div>
        </header>

        <div className="container mx-auto px-2 py-4">
          <div className="flex gap-4">
            {/* Model Selection Side Panel - only show on Generate tab */}
            {activeTab === "generate" && (
              <>
                {/* Desktop Side Panel */}
                <div className="hidden lg:block w-80 flex-shrink-0">
                  <Card className="bg-white/90 dark:bg-gray-900/90 border-0 shadow-lg sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <Bot className="w-5 h-5 text-purple-600" />
                          AI Models
                        </CardTitle>
                        {isFreeUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={refreshModelPermissions}
                            disabled={refreshingPermissions}
                            className="h-6 px-2 text-xs"
                          >
                            {refreshingPermissions ? (
                              <>
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                Refreshing...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Refresh
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      {/* FOMO Header */}
                      <div className="flex items-center justify-between p-2 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800 mt-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                            {userAccessibleModels.length}/{availableModels.length} models
                          </span>
                        </div>
                        <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 text-xs px-2 py-1 h-6">
                          Unlock All ⭐
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {!profileLoading ? (
                        <div className="space-y-3">
                          {/* Model List - Compact Side Panel Style */}
                          {availableModels.map((modelOption) => {
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
                                    : 'border-purple-300 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-purple-900/30 hover:shadow-md'
                                }`}
                                onClick={() => {
                                  if (isAccessible) {
                                    setModel(modelOption.id)
                                    // Switch to generate tab and ensure category is selected
                                    setActiveTab("generate")
                                    if (!selectedCategories.includes("Text to Image")) {
                                      setSelectedCategories(["Text to Image"])
                                    }
                                  } else {
                                    toast({
                                      title: "🔒 Premium Model",
                                      description: `Upgrade to unlock ${modelOption.name}!`,
                                      variant: "destructive",
                                    })
                                  }
                                }}
                              >
                                {/* Premium Glow Effect */}
                                {!isAccessible && (
                                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-lg"></div>
                                )}
                                
                                {/* Model Content */}
                                <div className="relative z-10">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                      isAccessible ? modelOption.bgColor : 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-800 dark:to-pink-800'
                                    }`}>
                                      <modelOption.icon className={`w-5 h-5 ${
                                        isAccessible ? modelOption.iconColor : 'text-purple-600 dark:text-purple-300'
                                      }`} />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <h3 className={`font-semibold text-sm truncate ${
                                          isAccessible ? 'text-gray-900 dark:text-gray-100' : 'text-purple-900 dark:text-purple-100'
                                        }`}>
                                          {modelOption.name}
                                        </h3>
                                        
                                        {/* Badge */}
                                        <div className={`px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 ml-2 ${
                                          isAccessible 
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
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
                                  
                                  {/* Selected Indicator */}
                                  {isSelected && isAccessible && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                          
                          {/* Bottom FOMO Banner - Compact */}
                          <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white text-center mt-4">
                            <div className="flex items-center justify-center gap-1 mb-2">
                              <Sparkles className="w-4 h-4" />
                              <span className="font-bold text-sm">Missing {availableModels.length - userAccessibleModels.length} models!</span>
                            </div>
                            <Button className="bg-white text-purple-600 hover:bg-gray-100 font-bold text-xs px-3 py-1 h-7">
                              Upgrade Now 🚀
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse flex items-center justify-center">
                          <span className="text-gray-500 text-sm">Loading models...</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Mobile Model Panel Toggle */}
                <div className="lg:hidden fixed bottom-4 right-4 z-50">
                  <Button
                    onClick={() => setModelPanelOpen(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg rounded-full w-14 h-14 flex items-center justify-center"
                  >
                    <Bot className="w-6 h-6" />
                  </Button>
                </div>

                {/* Mobile Model Panel Overlay */}
                {modelPanelOpen && (
                  <div className="lg:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setModelPanelOpen(false)}>
                    <div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      <div className="p-4 border-b">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-bold flex items-center gap-2">
                            <Bot className="w-5 h-5 text-purple-600" />
                            AI Models
                          </h2>
                          <Button variant="ghost" size="sm" onClick={() => setModelPanelOpen(false)}>
                            ✕
                          </Button>
                        </div>
                        {/* FOMO Header Mobile */}
                        <div className="flex items-center justify-between p-2 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800 mt-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                              {userAccessibleModels.length}/{availableModels.length} models
                            </span>
                          </div>
                          <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 text-xs px-2 py-1 h-6">
                            Unlock All ⭐
                          </Button>
                        </div>
                      </div>
                      <div className="p-4">
                        {!profileLoading ? (
                          <div className="space-y-3">
                            {/* Same model list as desktop */}
                            {availableModels.map((modelOption) => {
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
                                      : 'border-purple-300 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-purple-900/30 hover:shadow-md'
                                  }`}
                                  onClick={() => {
                                    if (isAccessible) {
                                      setModel(modelOption.id)
                                      setModelPanelOpen(false)
                                      // Switch to generate tab and ensure category is selected
                                      setActiveTab("generate")
                                      if (!selectedCategories.includes("Text to Image")) {
                                        setSelectedCategories(["Text to Image"])
                                      }
                                    } else {
                                      toast({
                                        title: "🔒 Premium Model",
                                        description: `Upgrade to unlock ${modelOption.name}!`,
                                        variant: "destructive",
                                      })
                                    }
                                  }}
                                >
                                  <div className="relative z-10">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                        isAccessible ? modelOption.bgColor : 'bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-800 dark:to-pink-800'
                                      }`}>
                                        <modelOption.icon className={`w-5 h-5 ${
                                          isAccessible ? modelOption.iconColor : 'text-purple-600 dark:text-purple-300'
                                        }`} />
                                      </div>
                                      
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                          <h3 className={`font-semibold text-sm truncate ${
                                            isAccessible ? 'text-gray-900 dark:text-gray-100' : 'text-purple-900 dark:text-purple-100'
                                          }`}>
                                            {modelOption.name}
                                          </h3>
                                          
                                          <div className={`px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0 ml-2 ${
                                            isAccessible 
                                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
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
                                    
                                    {isSelected && isAccessible && (
                                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                            
                            {/* Bottom FOMO Banner Mobile */}
                            <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white text-center mt-4">
                              <div className="flex items-center justify-center gap-1 mb-2">
                                <Sparkles className="w-4 h-4" />
                                <span className="font-bold text-sm">Missing {availableModels.length - userAccessibleModels.length} models!</span>
                              </div>
                              <Button className="bg-white text-purple-600 hover:bg-gray-100 font-bold text-xs px-3 py-1 h-7">
                                Upgrade Now 🚀
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse flex items-center justify-center">
                            <span className="text-gray-500 text-sm">Loading models...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            {/* Main Content */}
            <div className="flex-1 w-full">
              {activeTab === "generate" && (
                <div className="grid lg:grid-cols-2 gap-8">
                  {selectedCategories.length === 0 ? (
                    images.length > 0 && (
                      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
                        <CardHeader>
                          <CardTitle>Latest Creation</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="relative aspect-square rounded-lg overflow-hidden">
                              <Image
                                src={images[0].image_url || "/placeholder.svg"}
                                alt={images[0].prompt}
                                fill
                                className="object-cover"
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
                                Show Prompt
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  ) : selectedCategories.includes("Text to Image") && (
                    <>
                      {/* Generation Form */}
                      <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl shadow-blue-100 dark:shadow-blue-900">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-3 text-2xl font-bold">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 mr-1 animate-bounce-slow">
                              <Sparkles className="w-5 h-5 text-white" />
                            </span>
                            Generate AI Image
                          </CardTitle>
                          <CardDescription>Describe your vision and let AI bring it to life</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <form onSubmit={generateImage} className="space-y-8">
                            <div className="space-y-4">
                              <Label htmlFor="prompt">Prompt</Label>
                              <div className="flex items-center">
                                <Textarea
                                  id="prompt"
                                  placeholder="Describe the image you want to generate..."
                                  value={prompt}
                                  onChange={e => setPrompt(e.target.value)}
                                  required
                                  className="min-h-[80px]"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="ml-2"
                                  disabled={improvingPrompt || !prompt.trim()}
                                  title="Improve prompt with AI"
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
                                    } catch (err: any) {
                                      toast({ title: "Error", description: err.message, variant: "destructive" })
                                    } finally {
                                      setImprovingPrompt(false)
                                    }
                                  }}
                                >
                                  {improvingPrompt ? (
                                    <span className="animate-spin"><Bot className="w-5 h-5" /></span>
                                  ) : (
                                    <Bot className="w-5 h-5 text-blue-500" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            {model === 'fal-ai/fast-sdxl' && (
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="image-size">Image Size</Label>
                                  <Select value={imageSize} onValueChange={setImageSize}>
                                    <SelectTrigger id="image-size"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="square_hd">Square HD</SelectItem>
                                      <SelectItem value="square">Square</SelectItem>
                                      <SelectItem value="portrait_4_3">Portrait 4:3</SelectItem>
                                      <SelectItem value="portrait_16_9">Portrait 16:9</SelectItem>
                                      <SelectItem value="landscape_4_3">Landscape 4:3</SelectItem>
                                      <SelectItem value="landscape_16_9">Landscape 16:9</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="num-images">Number of Images</Label>
                                  <input type="number" min={1} max={8} value={numImages} onChange={e => setNumImages(Number(e.target.value))} className="w-20 border rounded px-2 py-1" />
                                </div>
                                <div>
                                  <Label htmlFor="guidance-scale">Guidance Scale (CFG)</Label>
                                  <input type="range" min={0} max={20} step={0.1} value={guidanceScale} onChange={e => setGuidanceScale(Number(e.target.value))} className="w-full" />
                                  <span className="text-xs ml-2">{guidanceScale}</span>
                                </div>
                                <div>
                                  <Label htmlFor="num-steps">Inference Steps</Label>
                                  <input type="number" min={1} max={50} value={numSteps} onChange={e => setNumSteps(Number(e.target.value))} className="w-20 border rounded px-2 py-1" />
                                </div>
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" checked={expandPromptFast} onChange={e => setExpandPromptFast(e.target.checked)} id="expand-prompt-fast" className="accent-blue-600" />
                                  <Label htmlFor="expand-prompt-fast">Expand Prompt</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input type="checkbox" checked={enableSafetyChecker} onChange={e => setEnableSafetyChecker(e.target.checked)} id="enable-safety-checker" className="accent-blue-600" />
                                  <Label htmlFor="enable-safety-checker">Enable Safety Checker</Label>
                                </div>
                                <div>
                                  <Label htmlFor="negative-prompt">Negative Prompt</Label>
                                  <input type="text" value={negativePrompt} onChange={e => setNegativePrompt(e.target.value)} id="negative-prompt" className="w-full border rounded px-2 py-1" />
                                </div>
                                <div>
                                  <Label htmlFor="format">Format</Label>
                                  <Select value={format} onValueChange={setFormat}>
                                    <SelectTrigger id="format"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="jpeg">JPEG</SelectItem>
                                      <SelectItem value="png">PNG</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="seed">Seed (optional)</Label>
                                  <input type="number" value={seed} onChange={e => setSeed(e.target.value)} id="seed" className="w-32 border rounded px-2 py-1" />
                                </div>
                              </div>
                            )}
                            {model === 'fal-ai/ideogram/v3' && (
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="num-images-ideo">Number of Images</Label>
                                  <input
                                    id="num-images-ideo"
                                    type="number"
                                    min={1}
                                    max={8}
                                    value={numImages}
                                    onChange={e => setNumImages(Number(e.target.value))}
                                    className="w-20 border rounded px-2 py-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="image-size-ideo">Image Size</Label>
                                  <Select value={imageSize} onValueChange={setImageSize}>
                                    <SelectTrigger id="image-size-ideo"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="square_hd">Square HD</SelectItem>
                                      <SelectItem value="square">Square</SelectItem>
                                      <SelectItem value="portrait_4_3">Portrait 4:3</SelectItem>
                                      <SelectItem value="portrait_16_9">Portrait 16:9</SelectItem>
                                      <SelectItem value="landscape_4_3">Landscape 4:3</SelectItem>
                                      <SelectItem value="landscape_16_9">Landscape 16:9</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="style-ideo">Style</Label>
                                  <Select value={style} onValueChange={setStyle}>
                                    <SelectTrigger id="style-ideo"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="AUTO">Auto</SelectItem>
                                      <SelectItem value="GENERAL">General</SelectItem>
                                      <SelectItem value="REALISTIC">Realistic</SelectItem>
                                      <SelectItem value="DESIGN">Design</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="expand-prompt-ideo">Expand Prompt</Label>
                                  <input
                                    id="expand-prompt-ideo"
                                    type="checkbox"
                                    checked={expandPrompt}
                                    onChange={e => setExpandPrompt(e.target.checked)}
                                    className="accent-blue-600 ml-2"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="rendering-speed-ideo">Rendering Speed</Label>
                                  <Select value={renderingSpeed} onValueChange={setRenderingSpeed}>
                                    <SelectTrigger id="rendering-speed-ideo"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="TURBO">Turbo</SelectItem>
                                      <SelectItem value="BALANCED">Balanced</SelectItem>
                                      <SelectItem value="QUALITY">Quality</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="seed-ideo">Seed (optional)</Label>
                                  <input
                                    id="seed-ideo"
                                    type="number"
                                    value={seed}
                                    onChange={e => setSeed(e.target.value)}
                                    className="w-32 border rounded px-2 py-1"
                                    placeholder="Random"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="negative-prompt-ideo">Negative Prompt (optional)</Label>
                                  <input
                                    id="negative-prompt-ideo"
                                    type="text"
                                    value={negativePrompt}
                                    onChange={e => setNegativePrompt(e.target.value)}
                                    className="w-full border rounded px-2 py-1"
                                    placeholder="What to avoid..."
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="style-codes-ideo">Style Codes (comma separated, optional)</Label>
                                  <input
                                    id="style-codes-ideo"
                                    type="text"
                                    value={styleCodes || ''}
                                    onChange={e => setStyleCodes(e.target.value)}
                                    className="w-full border rounded px-2 py-1"
                                    placeholder="e.g. 1a2b3c4d,5e6f7a8b"
                                  />
                                  <span className="text-xs text-gray-500">Overrides Style if provided. 8-char hex codes, comma separated.</span>
                                </div>
                                <div>
                                  <Label htmlFor="color-palette-ideo">Color Palette (optional)</Label>
                                  <Select value={colorPalette} onValueChange={setColorPalette}>
                                    <SelectTrigger id="color-palette-ideo"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      <SelectItem value="EMBER">Ember</SelectItem>
                                      <SelectItem value="FRESH">Fresh</SelectItem>
                                      <SelectItem value="JUNGLE">Jungle</SelectItem>
                                      <SelectItem value="MAGIC">Magic</SelectItem>
                                      <SelectItem value="MELON">Melon</SelectItem>
                                      <SelectItem value="MOSAIC">Mosaic</SelectItem>
                                      <SelectItem value="PASTEL">Pastel</SelectItem>
                                      <SelectItem value="ULTRAMARINE">Ultramarine</SelectItem>
                                      <SelectItem value="custom">Custom (enter hex codes below)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {colorPalette === 'custom' && (
                                    <input
                                      type="text"
                                      value={customPalette}
                                      onChange={e => setCustomPalette(e.target.value)}
                                      className="w-full border rounded px-2 py-1 mt-2"
                                      placeholder="#ff0000,#00ff00,#0000ff"
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                <Label htmlFor="current-model">Current Model</Label>
                {!profileLoading ? (
                  <div className="p-3 border rounded-lg bg-primary/5 border-primary/20">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const currentModel = availableModels.find(m => m.id === model);
                        if (!currentModel) return null;
                        return (
                          <>
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${currentModel.bgColor}`}>
                              <currentModel.icon className={`w-5 h-5 ${currentModel.iconColor}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-sm">{currentModel.name}</h3>
                                <div className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                  ACTIVE
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{currentModel.description}</p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs font-medium text-primary">{currentModel.category}</span>
                                {currentModel.price && (
                                  <span className="text-xs font-medium text-green-600">{currentModel.price}</span>
                                )}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="mt-3 pt-3 border-t border-primary/10">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-primary hover:bg-primary/10"
                        onClick={() => {
                          setModelPanelOpen(true)
                          // On mobile, this will open the model panel
                          // On desktop, the panel is already visible
                        }}
                      >
                        <Bot className="w-4 h-4 mr-2" />
                        Choose Different Model
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse flex items-center justify-center">
                    <span className="text-gray-500 text-sm">Loading current model...</span>
                  </div>
                )}
              </div>

                              <div className="space-y-2">
                                <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                                <Select value={aspectRatio} onValueChange={handleAspectRatioChange}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1:1">
                                      <span className="inline-flex items-center gap-2">
                                        <Square className="w-4 h-4" /> Square (1:1)
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="1:1_hd">
                                      <span className="inline-flex items-center gap-2">
                                        <Square className="w-4 h-4" /> Square HD (1:1)
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="3:4">
                                      <span className="inline-flex items-center gap-2">
                                        <RectangleVertical className="w-4 h-4" /> Portrait 3:4
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="9:16">
                                      <span className="inline-flex items-center gap-2">
                                        <RectangleVertical className="w-4 h-4" /> Portrait 9:16
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="4:3">
                                      <span className="inline-flex items-center gap-2">
                                        <RectangleHorizontal className="w-4 h-4" /> Landscape 4:3
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="16:9">
                                      <span className="inline-flex items-center gap-2">
                                        <RectangleHorizontal className="w-4 h-4" /> Landscape 16:9
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="custom">
                                      <span className="inline-flex items-center gap-2">
                                        <Settings2 className="w-4 h-4" /> Custom
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="pt-4">
                              <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Generating..." : "Generate Image"}
                              </Button>
                            </div>
                          </form>
                        </CardContent>
                      </Card>
                      {/* Latest Generated Image */}
                      {images.length > 0 && (
                        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
                          <CardHeader>
                            <CardTitle>Latest Creation</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="relative aspect-square rounded-lg overflow-hidden">
                                <Image
                                  src={images[0].image_url || "/placeholder.svg"}
                                  alt={images[0].prompt}
                                  fill
                                  className="object-cover"
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
                                  Show Prompt
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === "history" && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Your Generated Images</h2>
                  {images.length === 0 ? (
                    <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
                      <CardContent className="text-center py-12">
                        <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600 dark:text-gray-400">
                          No images generated yet. Start creating your first AI image!
                        </p>
                        <Button className="mt-4" onClick={() => setActiveTab("generate")}>
                          Generate Image
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
                              Show Prompt
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
                    <CardHeader className="text-center bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                      <CardTitle className="text-3xl">Profile Settings</CardTitle>
                      <CardDescription className="text-lg">Manage your account settings</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="space-y-8">
                        <div className="text-center">
                          <div className="relative group cursor-pointer">
                            <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-105 transition-transform duration-300">
                              <User className="w-12 h-12 text-white" />
                            </div>
                            <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                              <span className="text-white text-xs font-medium">Edit Avatar</span>
                            </div>
                          </div>
                          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                            {userName ? `Welcome, ${userName}` : "Welcome"}
                          </h3>
                          <p className="text-gray-500 mt-1">Creative AI Artist</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="group p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-purple-200/50 dark:border-purple-700/50">
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
                              {isFreeUser && quotaUsed !== null && quotaLimit !== null ? "Daily Usage" : "Images Generated"}
                            </div>
                            <div className="text-xs text-purple-500 mt-1">
                              {isFreeUser && quotaUsed !== null && quotaLimit !== null ? (
                                `${quotaLimit - quotaUsed} remaining today`
                              ) : (
                                `+${images.filter(img => new Date(img.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length} this week`
                              )}
                            </div>
                          </div>

                          <div className="group p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-blue-200/50 dark:border-blue-700/50">
                            <div className="flex items-center justify-between mb-3">
                              <Bot className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            </div>
                            <div className="text-3xl font-bold text-blue-600 mb-1 group-hover:scale-105 transition-transform duration-300">{new Set(images.map((img) => img.model)).size}</div>
                            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Models Used</div>
                            <div className="text-xs text-blue-500 mt-1">Explore more models</div>
                          </div>

                          <div className="group p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-green-200/50 dark:border-green-700/50">
                            <div className="flex items-center justify-between mb-3">
                              <History className="w-8 h-8 text-green-600 group-hover:scale-110 transition-transform duration-300" />
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            </div>
                            <div className="text-3xl font-bold text-green-600 mb-1 group-hover:scale-105 transition-transform duration-300">{images.length > 0 ? Math.ceil((Date.now() - new Date(images[images.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}</div>
                            <div className="text-sm font-medium text-green-700 dark:text-green-300">Days Active</div>
                            <div className="text-xs text-green-500 mt-1">Keep creating!</div>
                          </div>

                          {!profileLoading && (
                            <div className="group p-6 bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 dark:from-yellow-900/20 dark:via-orange-900/20 dark:to-pink-900/20 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-yellow-200/50 dark:border-yellow-700/50 min-w-0">
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
                                    <Rocket className="w-8 h-8 text-transparent bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text group-hover:scale-110 transition-transform duration-300" />
                                    <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-pink-500 rounded-full animate-pulse"></div>
                                  </div>
                                  <div className="text-2xl font-black bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent mb-1 group-hover:scale-105 transition-transform duration-300 leading-tight">
                                    UNLIMITED
                                  </div>
                                  <div className="text-sm font-bold bg-gradient-to-r from-yellow-700 via-pink-600 to-purple-700 bg-clip-text text-transparent">
                                    Enjoy unlimited generations!
                                  </div>
                                  <div className="text-xs text-yellow-600 mt-1">Premium member ✨</div>
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
                            <span className="text-sm">Create Image</span>
                          </Button>
                          <Button
                            variant="outline"
                            className="h-16 flex flex-col gap-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"
                            onClick={() => setActiveTab("history")}
                          >
                            <History className="w-5 h-5 text-blue-600" />
                            <span className="text-sm">View Gallery</span>
                          </Button>
                          <Button
                            variant="outline"
                            className="h-16 flex flex-col gap-2 hover:bg-green-50 hover:border-green-300 transition-all duration-300"
                            onClick={() => setActiveTab("albums")}
                          >
                            <Folder className="w-5 h-5 text-green-600" />
                            <span className="text-sm">Albums</span>
                          </Button>
                        </div>
                      </div>

                      <div className="flex justify-center mt-12 mb-4">
                        <Button
                          onClick={handleSignOut}
                          className="group flex items-center justify-center gap-4 px-16 py-6 rounded-full text-xl font-bold bg-gradient-to-r from-red-600 via-pink-600 to-red-700 text-white shadow-xl border-2 border-red-500 hover:from-red-700 hover:via-pink-700 hover:to-red-800 hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-red-300 w-full sm:w-auto relative overflow-hidden"
                          style={{ minWidth: 280 }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-pink-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <LogOut className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300" />
                          <span className="tracking-wide relative z-10">Log Out</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "albums" && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Your Albums</h2>
                  {selectedAlbum ? (
                    <div>
                      <Button variant="ghost" className="mb-4" onClick={() => setSelectedAlbum(null)}>
                        ← Back to Albums
                      </Button>
                      <h3 className="text-xl font-semibold mb-4">{selectedAlbum.name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {albumImages.length === 0 ? (
                          <div className="col-span-full text-center text-gray-500">No images in this album yet.</div>
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
                                  Show Prompt
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
                        <div className="col-span-full text-center text-gray-500">No albums found.</div>
                      ) : (
                        albums.map(album => (
                          <Card
                            key={album.id}
                            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden cursor-pointer"
                            onClick={() => setSelectedAlbum(album)}
                          >
                            <div className="relative aspect-square">
                              <Image
                                src={album.cover_image_url || "/placeholder.svg"}
                                alt={album.name}
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/placeholder.svg"
                                }}
                              />
                            </div>
                            <CardContent className="p-4">
                              <div className="font-semibold text-lg mb-1">{album.name}</div>
                              <div className="text-xs text-gray-500">{album.album_images?.[0]?.count || 0} images</div>
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
                <DialogTitle>Custom Aspect Ratio</DialogTitle>
                <DialogDescription>Enter your desired width and height for the aspect ratio.</DialogDescription>
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
                <Button type="submit">Set Aspect Ratio</Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
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
      </div>
    </div>
  )
}
