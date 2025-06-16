"use client"

import React, { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Sparkles, Download, Share2, History, User, LogOut, Plus, Square, RectangleHorizontal, RectangleVertical, Settings2, Zap, Image as ImageIcon, Rocket, PenTool, Palette, Brain, Bot, Folder, Menu, UserCircle, Trash2, Lock } from "lucide-react"
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
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importUrl, setImportUrl] = useState("")
  const [importPrompt, setImportPrompt] = useState("")
  const [importLoading, setImportLoading] = useState(false)
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const generateImage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

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
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate image",
        variant: "destructive",
      })
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
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        toast({ title: "Error", description: "Not authenticated", variant: "destructive" })
        return
      }
      const { data, error } = await supabase
        .from("generated_images")
        .select("*")
        .eq("user_id", session.user.id)
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

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setImportLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        toast({ title: "Error", description: "Not authenticated", variant: "destructive" })
        return
      }
      const { error } = await supabase
        .from("generated_images")
        .insert({
          user_id: session.user.id,
          prompt: importPrompt || "Imported from FAL.AI",
          model: "imported",
          image_url: importUrl,
          parameters: {},
        })
      if (error) throw error
      toast({ title: "Imported", description: "Image imported successfully!" })
      setImportDialogOpen(false)
      setImportUrl("")
      setImportPrompt("")
      refreshImages()
    } catch (error) {
      toast({ title: "Error", description: "Failed to import image", variant: "destructive" })
    } finally {
      setImportLoading(false)
    }
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
        .select("full_name, is_premium")
        .eq("id", session.user.id)
        .single();
      if (profileError) {
        // Try to create a profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || session.user.email,
            is_premium: false
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
      const isPremium = !!profile?.is_premium;
      setIsFreeUser(!isPremium);
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
    // Supabase Realtime subscription for profile changes
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      supabase.removeAllChannels();
      channel = supabase
        .channel('profile-updates')
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
        .subscribe();
    })();
    return () => {
      supabase.removeAllChannels();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900">
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/90 dark:bg-gray-900/90 shadow-sm sticky top-0 z-50">
          <div className="container mx-auto px-2 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
            {/* Logo */}
            <div className="flex items-center space-x-3 w-full sm:w-auto justify-between">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center shadow">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-extrabold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent tracking-tight select-none">
                AI Image Studio
              </span>
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
              <Button
                variant="outline"
                onClick={() => setPinDialogOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <span>Import Image</span>
              </Button>
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
                <Button
                  variant="outline"
                  onClick={() => setPinDialogOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <span>Import Image</span>
                </Button>
              </nav>
            )}
          </div>
        </header>

        <div className="container mx-auto px-2 py-4">
          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            {/* Categories Sidebar - only show on Generate tab */}
            {activeTab === "generate" && (
              <Card className="w-full md:w-64 bg-white/90 dark:bg-gray-900/90 border-0 shadow-lg mb-4 md:mb-0">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    {categories.map((category) => (
                      <label
                        key={category}
                        className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${selectedCategories.includes(category) ? 'bg-gray-200 dark:bg-gray-800 font-semibold' : ''}`}
                      >
                        <Checkbox
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={checked => handleCategoryChange(category, checked)}
                          className="rounded border-gray-400 focus:ring-2 focus:ring-blue-500"
                        />
                        <span>{category}</span>
                      </label>
                    ))}
                    <span className="text-xs text-gray-500 italic mt-2 pl-1">More to come...</span>
                  </div>
                </CardContent>
              </Card>
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
                                <Label htmlFor="model">Model</Label>
                                {!profileLoading ? (
                                  <Select value={model} onValueChange={setModel}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="fal-ai/fast-sdxl">
                                        <span className="inline-flex items-center gap-2">
                                          <Zap className="w-4 h-4 text-green-600" />
                                          <span className="font-semibold">Fast SDXL</span>
                                          <span className="text-green-700 ml-2">$0.0025/image</span>
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="fal-ai/flux/dev">
                                        <span className="inline-flex items-center gap-2">
                                          <ImageIcon className="w-4 h-4 text-yellow-500" />
                                          <span className="font-semibold">FLUX Dev</span>
                                          <span className="text-yellow-600 ml-2">$0.025/megapixel</span>
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="fal-ai/flux-pro/v1.1-ultra" disabled={isFreeUser} title={isFreeUser ? "Upgrade to unlock" : ""}>
                                        <span className="inline-flex items-center gap-2">
                                          <Rocket className="w-4 h-4 text-pink-600" />
                                          <span className="font-semibold">FLUX Pro Ultra</span>
                                          <span className="text-pink-700 ml-2">$0.06/image</span>
                                          <span className="text-orange-500 ml-1">$0.04/standard</span>
                                          {isFreeUser && <Lock className="w-4 h-4 ml-2 text-gray-400" />}
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="fal-ai/ideogram/v2" disabled={isFreeUser} title={isFreeUser ? "Upgrade to unlock" : ""}>
                                        <span className="inline-flex items-center gap-2">
                                          <PenTool className="w-4 h-4 text-blue-500" />
                                          <span className="font-semibold">Ideogram v2</span>
                                          <span className="text-blue-600 ml-2">$0.08/image</span>
                                          {isFreeUser && <Lock className="w-4 h-4 ml-2 text-gray-400" />}
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="fal-ai/ideogram/v3" disabled={isFreeUser} title={isFreeUser ? "Upgrade to unlock" : ""}>
                                        <span className="inline-flex items-center gap-2">
                                          <PenTool className="w-4 h-4 text-blue-700" />
                                          <span className="font-semibold">Ideogram v3</span>
                                          {isFreeUser && <Lock className="w-4 h-4 ml-2 text-gray-400" />}
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="fal-ai/recraft-v3" disabled={isFreeUser} title={isFreeUser ? "Upgrade to unlock" : ""}>
                                        <span className="inline-flex items-center gap-2">
                                          <Palette className="w-4 h-4 text-purple-700" />
                                          <span className="font-semibold">Recraft V3</span>
                                          <span className="text-purple-700 ml-2">$0.04/image</span>
                                          <span className="text-purple-400 ml-1">$0.08/vector</span>
                                          {isFreeUser && <Lock className="w-4 h-4 ml-2 text-gray-400" />}
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="fal-ai/stable-diffusion-v35-large" disabled={isFreeUser} title={isFreeUser ? "Upgrade to unlock" : ""}>
                                        <span className="inline-flex items-center gap-2">
                                          <Brain className="w-4 h-4 text-indigo-500" />
                                          <span className="font-semibold">Stable Diffusion 3.5 Large</span>
                                          <span className="text-indigo-600 ml-2">$0.065/image</span>
                                          {isFreeUser && <Lock className="w-4 h-4 ml-2 text-gray-400" />}
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="fal-ai/hidream-i1-fast" disabled={isFreeUser} title={isFreeUser ? "Upgrade to unlock" : ""}>
                                        <span className="inline-flex items-center gap-2">
                                          <Rocket className="w-4 h-4 text-cyan-600" />
                                          <span className="font-semibold">HiDream I1 Fast</span>
                                          <span className="text-cyan-700 ml-2">$0.01/megapixel</span>
                                          {isFreeUser && <Lock className="w-4 h-4 ml-2 text-gray-400" />}
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="fal-ai/flux-pro/kontext/text-to-image" disabled={isFreeUser} title={isFreeUser ? "Upgrade to unlock" : ""}>
                                        <span className="inline-flex items-center gap-2">
                                          <Brain className="w-4 h-4 text-orange-600" />
                                          <span className="font-semibold">FLUX Kontext T2I</span>
                                          <span className="text-orange-700 ml-2">$0.04/image</span>
                                          {isFreeUser && <Lock className="w-4 h-4 ml-2 text-gray-400" />}
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="fal-ai/imagen4/preview" disabled={isFreeUser} title={isFreeUser ? "Upgrade to unlock" : ""}>
                                        <span className="inline-flex items-center gap-2">
                                          <ImageIcon className="w-4 h-4 text-pink-500" />
                                          <span className="font-semibold">Imagen 4 Preview</span>
                                          <span className="text-pink-700 ml-2">$0.05/image</span>
                                          {isFreeUser && <Lock className="w-4 h-4 ml-2 text-gray-400" />}
                                        </span>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-md animate-pulse flex items-center px-3">
                                    <span className="text-gray-500 text-sm">Loading models...</span>
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
                <div className="max-w-2xl mx-auto">
                  <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle>Profile Settings</CardTitle>
                      <CardDescription>Manage your account settings</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="text-center">
                          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <User className="w-10 h-10 text-white" />
                          </div>
                          <h3 className="text-lg font-semibold">
                            {userName ? `Welcome, ${userName}` : "Welcome"}
                          </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">{images.length}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Images Generated</div>
                          </div>
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{new Set(images.map((img) => img.model)).size}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Models Used</div>
                          </div>
                          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{images.length > 0 ? Math.ceil((Date.now() - new Date(images[images.length - 1].created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Days Active</div>
                          </div>
                          {!profileLoading && (
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                              {isFreeUser ? (
                                <>
                                  <div className="text-2xl font-bold text-yellow-600">{quotaLeft !== null && quotaLeft !== undefined ? quotaLeft : 0}</div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">Images Left (24h)</div>
                                  <div className="text-xs text-gray-500 mt-1">Daily Quota: {quotaLimit}, Used: {quotaUsed !== null ? quotaUsed : 0}</div>
                                </>
                              ) : (
                                <>
                                  <div className="text-3xl font-extrabold bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 bg-clip-text text-transparent animate-pulse">UNLIMITED</div>
                                  <div className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 mt-1">Enjoy unlimited generations!</div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-center mt-10 mb-2">
                        <Button
                          onClick={handleSignOut}
                          className="flex items-center justify-center gap-3 px-12 py-4 rounded-full text-lg font-bold bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg border-2 border-red-500 hover:from-red-700 hover:to-pink-700 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-red-300 w-full sm:w-auto"
                          style={{ minWidth: 220 }}
                        >
                          <LogOut className="w-7 h-7" />
                          <span className="tracking-wide">Log Out</span>
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

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent>
            <form onSubmit={handleImport} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Import FAL.AI Image</DialogTitle>
                <DialogDescription>Paste the direct image URL from FAL.AI and (optionally) a prompt.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="import-url">Image URL</Label>
                <input
                  id="import-url"
                  type="url"
                  value={importUrl}
                  onChange={e => setImportUrl(e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                  required
                  placeholder="https://fal.ai/outputs/your-image.png"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="import-prompt">Prompt (optional)</Label>
                <input
                  id="import-prompt"
                  type="text"
                  value={importPrompt}
                  onChange={e => setImportPrompt(e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                  placeholder="Describe the image..."
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={importLoading}>{importLoading ? "Importing..." : "Import"}</Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Full Size Image Dialog */}
        <Dialog open={!!expandedImage} onOpenChange={open => !open && setExpandedImage(null)}>
          <DialogContent
            noOverlay
            className="fixed inset-0 z-50 flex items-center justify-center p-0 m-0 bg-black/90 border-none shadow-none w-screen h-screen max-w-none rounded-none"
            onPointerDown={e => {
              if (e.target === e.currentTarget) setExpandedImage(null)
            }}
          >
            <DialogTitle>
              <span className="sr-only">{expandedImage?.prompt || "Full Size Image"}</span>
            </DialogTitle>
            {expandedImage && (
              <div className="flex items-center justify-center w-full h-full" onPointerDown={e => e.stopPropagation()}>
                <img
                  src={expandedImage.image_url || "/placeholder.svg"}
                  alt={expandedImage.prompt}
                  className="object-contain w-auto h-auto max-w-[95vw] max-h-[95vh] block pointer-events-auto"
                />
                <button
                  type="button"
                  className="fixed top-4 right-4 z-20 bg-white/80 dark:bg-gray-900/80 rounded-full p-2 shadow hover:bg-white dark:hover:bg-gray-800 transition border border-gray-200 dark:border-gray-700"
                  title="Download image"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const response = await fetch(expandedImage.image_url)
                    const blob = await response.blob()
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `ai-image-${expandedImage.prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "-")}.png`
                    document.body.appendChild(a)
                    a.click()
                    window.URL.revokeObjectURL(url)
                    document.body.removeChild(a)
                  }}
                >
                  <Download className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Prompt Dialog */}
        <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogTitle>Prompt</DialogTitle>
            <div className="mb-4 whitespace-pre-line break-words text-base font-normal leading-relaxed bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-y-auto" style={{ maxHeight: '50vh' }}>
              {promptDialogText}
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(promptDialogText)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Image</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this image? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="destructive" onClick={async () => {
                if (pendingDeleteImageId) {
                  await deleteImage(pendingDeleteImageId)
                  setPendingDeleteImageId(null)
                  setDeleteDialogOpen(false)
                }
              }}>
                Delete
              </Button>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
          <DialogContent>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (pinInput === "1255") {
                  setPinDialogOpen(false);
                  setPinInput("");
                  setPinError("");
                  setImportDialogOpen(true);
                } else {
                  setPinError("Incorrect pin. Please try again or contact support if you need help.");
                }
              }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>Enter Pin Code</DialogTitle>
                <DialogDescription>Access to import images is restricted. Please enter the 4-digit pin code to continue.</DialogDescription>
              </DialogHeader>
              <Input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={e => { setPinInput(e.target.value); setPinError(""); }}
                placeholder="4-digit pin"
                autoFocus
                className="text-center tracking-widest text-lg"
              />
              {pinError && <div className="text-red-500 text-sm text-center">{pinError}</div>}
              <DialogFooter>
                <Button type="submit" className="w-full">Continue</Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
