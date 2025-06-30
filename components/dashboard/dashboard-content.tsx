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
import { Sparkles, Share2, History, User, LogOut, Plus, Square, RectangleHorizontal, RectangleVertical, Settings2, Zap, Image as ImageIcon, Rocket, PenTool, Palette, Brain, Bot, Folder, Menu, UserCircle, Trash2, Lock, Shield, RefreshCw, ChevronLeft, ChevronRight, Wand2, Edit, Paintbrush, Eraser, RotateCcw, Undo2, ChevronDown, ChevronUp, Lightbulb, Copy } from "lucide-react"
import { QuotaLimitDialog } from "@/components/ui/quota-limit-dialog"
import { AuroraText } from "@/components/ui/aurora-text"
import { useRouter } from "next/navigation"
import Image from "next/image"
import type { Database } from "@/lib/supabase/types"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import PromptSuggestions from "./PromptSuggestions"
import { SmartPromptBuilder } from "./smart-prompt-builder"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/components/providers/locale-provider"
import { LanguageSwitcher } from "@/components/ui/language-switcher"
import { Slider } from "@/components/ui/slider"

type GeneratedImage = Database["public"]["Tables"]["generated_images"]["Row"]

interface DashboardContentProps {
  initialImages: GeneratedImage[]
}

// --- Image Generation Quota Config ---
const IMAGE_GENERATION_QUOTA_PER_DAY = 3; // Keep in sync with API

export function DashboardContent({ initialImages }: DashboardContentProps) {
  const { t } = useTranslation()
  const [prompt, setPrompt] = useState("")
  const [model, setModel] = useState("fal-ai/fast-sdxl")
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
  const [showSmartPromptBuilder, setShowSmartPromptBuilder] = useState(false)
  
  // SeedEdit model state
  const [imageUrl, setImageUrl] = useState('')
  const [referenceMethod, setReferenceMethod] = useState<'url' | 'upload'>('url')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedFilePreview, setUploadedFilePreview] = useState<string | null>(null)
  
  // Quota limit dialog state
  const [quotaDialogOpen, setQuotaDialogOpen] = useState(false)
  const [quotaDialogData, setQuotaDialogData] = useState<{
    title: string
    message: string
    quotaInfo?: { used: number; limit: number; period: "hourly" | "daily" | "monthly" }
  }>({ title: "", message: "" })
  
  // Image editor state
  const [editMode, setEditMode] = useState(false)
  const [editPrompt, setEditPrompt] = useState("")
  const [editGuidanceScale, setEditGuidanceScale] = useState(0.1) // Default to 3.5 on fal.ai scale (0.1 * 35)
  const [inpaintStrength, setInpaintStrength] = useState(0.85) // How much to change the masked area
  const [editLoading, setEditLoading] = useState(false)
  const [editedImageUrl, setEditedImageUrl] = useState<string | null>(null)
  const [showBeforeAfter, setShowBeforeAfter] = useState(false)
  const [editHistory, setEditHistory] = useState<Array<{id: string, prompt: string, imageUrl: string}>>([])
  const [sliderPosition, setSliderPosition] = useState(50) // For image comparison slider
  
  // Inpainting state
  const [inpaintMode, setInpaintMode] = useState(false)
  const [brushSize, setBrushSize] = useState(20)
  const [isDrawing, setIsDrawing] = useState(false)
  const [maskCanvas, setMaskCanvas] = useState<HTMLCanvasElement | null>(null)
  const [maskContext, setMaskContext] = useState<CanvasRenderingContext2D | null>(null)
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null)
  
  // Undo functionality state
  const [lastInpaintResult, setLastInpaintResult] = useState<{
    imageId: string
    imageUrl: string
    editHistoryEntry: {id: string, prompt: string, imageUrl: string}
  } | null>(null)
  const [showUndoButton, setShowUndoButton] = useState(false)
  
  // Album editing state
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null)
  const [editingAlbumName, setEditingAlbumName] = useState("")
  
  // Advanced settings visibility state
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  
  // Example prompts state
  const [showExamplePrompts, setShowExamplePrompts] = useState(false)
  
  const isAdmin = userEmail && ADMIN_EMAILS.includes(userEmail)

  // Example prompts for inspiration
  const examplePrompts = [
    "A majestic dragon soaring through clouds at sunset, digital art style",
    "Cozy coffee shop in a rainy city, warm lighting, photorealistic",
    "Futuristic cityscape with flying cars and neon lights, cyberpunk aesthetic",
    "Enchanted forest with glowing mushrooms and fairy lights, fantasy art",
    "Vintage car on a desert highway, golden hour lighting, cinematic",
    "Abstract geometric patterns in vibrant colors, modern art style"
  ]

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  const generateImage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    // Validation for SeedEdit model
    if (model === 'fal-ai/bytedance/seededit/v3/edit-image') {
      if (referenceMethod === 'url' && !imageUrl.trim()) {
        toast({
          title: "Error",
          description: "Please provide an image URL for editing",
          variant: "destructive",
        })
        return
      }
      if (referenceMethod === 'upload' && !uploadedFile) {
        toast({
          title: "Error", 
          description: "Please upload an image file for editing",
          variant: "destructive",
        })
        return
      }
    }

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
      let finalImageUrl = imageUrl

      // Handle file upload for SeedEdit model
      if (model === 'fal-ai/bytedance/seededit/v3/edit-image' && referenceMethod === 'upload' && uploadedFile) {
        const formData = new FormData()
        formData.append('file', uploadedFile)
        
        const uploadResponse = await fetch('/api/upload-image', {
          method: 'POST', 
          body: formData
        })
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image')
        }
        
        const uploadData = await uploadResponse.json()
        finalImageUrl = uploadData.url
      }

      // Use different endpoint for SeedEdit model
      const endpoint = model === 'fal-ai/bytedance/seededit/v3/edit-image' 
        ? "/api/edit-image" 
        : "/api/generate-image"
      
      const response = await fetch(endpoint, {
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
          ...(model === 'fal-ai/bytedance/seededit/v3/edit-image' && {
            image_url: finalImageUrl,
            guidance_scale: guidanceScale,
            seed: seed ? Number(seed) : undefined,
          }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error codes from the API
        if (response.status === 408 && data.code === 'TIMEOUT_ERROR') {
          throw new Error("Image generation is taking longer than expected. Please try again with a simpler prompt or try again later.")
        }
        if (response.status === 503 && data.code === 'NETWORK_ERROR') {
          throw new Error("Network connection issue. Please check your internet connection and try again.")
        }
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

  const editImage = async () => {
    if (!expandedImage || !editPrompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description for the edit",
        variant: "destructive",
      })
      return
    }

    setEditLoading(true)
    try {
      const response = await fetch("/api/edit-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: editPrompt,
          model: 'fal-ai/bytedance/seededit/v3/edit-image',
          image_url: expandedImage.image_url,
          guidance_scale: editGuidanceScale,
        }),
      })

      const data = await response.json()
      console.log('Edit Image API Response:', { status: response.status, data })

      if (!response.ok) {
        // Handle specific error codes from the API
        if (response.status === 408 && data.code === 'TIMEOUT_ERROR') {
          throw new Error("Image editing is taking longer than expected. This can happen with complex images or prompts. Please try again with a simpler prompt or try again later.")
        }
        if (response.status === 503 && data.code === 'NETWORK_ERROR') {
          throw new Error("Network connection issue. Please check your internet connection and try again.")
        }
        throw new Error(data.error || "Failed to edit image")
      }

      // Validate response structure
      if (!data.image || !data.image.image_url) {
        console.error('Invalid response structure:', data)
        throw new Error("Invalid response: missing image data")
      }

      console.log('Successfully received edited image URL:', data.image.image_url)

      // Use proxy for fal.ai URLs on production to avoid CORS issues
      const imageUrl = data.image.image_url
      const isProduction = window.location.hostname !== 'localhost'
      const isFalAiUrl = imageUrl.includes('fal.media') || imageUrl.includes('fal.ai')
      const finalImageUrl = (isProduction && isFalAiUrl) 
        ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
        : imageUrl

      console.log('Using image URL:', finalImageUrl, isProduction ? '(via proxy)' : '(direct)')

      // Add to edit history
      const newEdit = {
        id: Date.now().toString(),
        prompt: editPrompt,
        imageUrl: finalImageUrl
      }
      setEditHistory(prev => [newEdit, ...prev])
      setEditedImageUrl(finalImageUrl)
      console.log('Edit history updated:', newEdit)
      console.log('Edited image URL set to:', finalImageUrl)
      
      toast({
        title: "Success!",
        description: "Image edited successfully",
      })
    } catch (error) {
      console.error("Error editing image:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to edit image",
        variant: "destructive",
      })
    } finally {
      setEditLoading(false)
    }
  }

  const resetEditMode = () => {
    setEditMode(false)
    setEditPrompt("")
    setEditedImageUrl(null)
    setShowBeforeAfter(false)
    setEditHistory([])
    setSliderPosition(50)
    setInpaintMode(false)
    setInpaintStrength(0.85)
    clearMask()
    // Clear undo state
    setLastInpaintResult(null)
    setShowUndoButton(false)
  }

  // Initialize canvas for mask drawing
  const initializeMaskCanvas = (imageElement: HTMLImageElement) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = imageElement.naturalWidth
    canvas.height = imageElement.naturalHeight
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    setMaskCanvas(canvas)
    setMaskContext(ctx)
    setImageRef(imageElement)
  }

  // Clear the mask
  const clearMask = () => {
    if (maskContext && maskCanvas) {
      maskContext.fillStyle = 'black'
      maskContext.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
    }
  }

  // Convert canvas coordinates to image coordinates
  const getImageCoordinates = (clientX: number, clientY: number, imageElement: HTMLElement) => {
    const rect = imageElement.getBoundingClientRect()
    const scaleX = imageRef ? imageRef.naturalWidth / rect.width : 1
    const scaleY = imageRef ? imageRef.naturalHeight / rect.height : 1
    
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY
    
    return { x, y }
  }

  // Draw on mask
  const drawOnMask = (x: number, y: number) => {
    if (!maskContext) return
    
    maskContext.globalCompositeOperation = 'source-over'
    maskContext.fillStyle = 'white'
    maskContext.beginPath()
    maskContext.arc(x, y, brushSize, 0, 2 * Math.PI)
    maskContext.fill()
  }

  // Erase from mask
  const eraseFromMask = (x: number, y: number) => {
    if (!maskContext) return
    
    maskContext.globalCompositeOperation = 'source-over'
    maskContext.fillStyle = 'black'
    maskContext.beginPath()
    maskContext.arc(x, y, brushSize, 0, 2 * Math.PI)
    maskContext.fill()
  }

  // Convert mask canvas to base64
  const getMaskDataUrl = () => {
    return maskCanvas?.toDataURL('image/png') || ''
  }

  // Undo the last inpainting operation
  const undoInpainting = async () => {
    if (!lastInpaintResult) return

    try {
      setEditLoading(true)

      // Remove from album_images first (if exists)
      await supabase
        .from('album_images')
        .delete()
        .eq('image_id', lastInpaintResult.imageId)

      // Delete the unwanted image from database
      const { error: deleteError } = await supabase
        .from('generated_images')
        .delete()
        .eq('id', lastInpaintResult.imageId)

      if (deleteError) {
        console.error('Error deleting unwanted inpaint result:', deleteError)
        toast({
          title: "Warning",
          description: "Could not remove unwanted result from database",
          variant: "destructive",
        })
      }

      // Remove from edit history
      setEditHistory(prev => prev.filter(edit => edit.id !== lastInpaintResult.editHistoryEntry.id))
      
      // Revert to original image
      setEditedImageUrl(expandedImage?.image_url || null)
      
      // Clear undo state
      setLastInpaintResult(null)
      setShowUndoButton(false)
      
      // Clear the mask so user can start fresh
      clearMask()

      toast({
        title: "Undone",
        description: t('dashboard.generate.undoSuccess'),
        duration: 3000,
      })
    } catch (error) {
      console.error("Error undoing inpainting:", error)
      toast({
        title: "Error",
        description: "Failed to undo inpainting",
        variant: "destructive",
      })
    } finally {
      setEditLoading(false)
    }
  }

  // Perform inpainting
  const performInpainting = async () => {
    if (!expandedImage || !editPrompt.trim() || !maskCanvas) {
      toast({
        title: "Error",
        description: t('dashboard.generate.inpaintError'),
        variant: "destructive",
      })
      return
    }

    // Clear previous undo state when starting new inpainting
    setLastInpaintResult(null)
    setShowUndoButton(false)

    setEditLoading(true)
    try {
      const maskDataUrl = getMaskDataUrl()
      
      const response = await fetch("/api/inpaint-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: editPrompt,
          image_url: expandedImage.image_url,
          mask_url: maskDataUrl,
          guidance_scale: editGuidanceScale * 35, // Convert 0-1 to 0-35 range for fal.ai
          num_inference_steps: 28,
          strength: inpaintStrength,
        }),
      })

      const data = await response.json()
      console.log('Inpainting API response:', { status: response.status, data })

      if (!response.ok) {
        console.error('Inpainting API error response:', data)
        throw new Error(data.error || "Failed to inpaint image")
      }

      // Validate response structure
      if (!data.image || !data.image.image_url) {
        console.error('Invalid response structure:', data)
        throw new Error("Invalid response: missing image data")
      }

      // Use proxy for fal.ai URLs on production to avoid CORS issues
      const imageUrl = data.image.image_url
      const isProduction = window.location.hostname !== 'localhost'
      const isFalAiUrl = imageUrl.includes('fal.media') || imageUrl.includes('fal.ai')
      const finalImageUrl = (isProduction && isFalAiUrl) 
        ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
        : imageUrl

      // Add to edit history
      const newEdit = {
        id: Date.now().toString(),
        prompt: editPrompt,
        imageUrl: finalImageUrl
      }
      setEditHistory(prev => [newEdit, ...prev])
      setEditedImageUrl(finalImageUrl)
      
      // Store undo information
      setLastInpaintResult({
        imageId: data.image.id,
        imageUrl: data.image.image_url,
        editHistoryEntry: newEdit
      })
      setShowUndoButton(true)
      
      // Refresh albums list to show the new "Inpainted" album if it was just created
      if (activeTab === "albums") {
        fetchAlbums()
      }

      toast({
        title: "Success!",
        description: t('dashboard.generate.inpaintSuccess'),
        duration: 5000,
      })
    } catch (error) {
      console.error("Error inpainting image:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to inpaint image",
        variant: "destructive",
      })
    } finally {
      setEditLoading(false)
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

  // Album editing functions
  const startEditingAlbum = (album: { id: string; name: string }) => {
    setEditingAlbumId(album.id)
    setEditingAlbumName(album.name)
  }

  const cancelEditingAlbum = () => {
    setEditingAlbumId(null)
    setEditingAlbumName("")
  }

  const saveAlbumName = async (albumId: string) => {
    if (!editingAlbumName.trim()) {
      toast({
        title: "Error",
        description: t('dashboard.albums.albumNameEmpty'),
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/albums", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          albumId,
          name: editingAlbumName.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update album name")
      }

      // Update the album in the local state
      setAlbums((prev: any[]) => prev.map(album => 
        album.id === albumId 
          ? { ...album, name: editingAlbumName.trim() }
          : album
      ))

      // If we're viewing this album, update the selected album too
      if (selectedAlbum?.id === albumId) {
        setSelectedAlbum((prev: any) => prev ? { ...prev, name: editingAlbumName.trim() } : null)
      }

      setEditingAlbumId(null)
      setEditingAlbumName("")

      toast({
        title: "Success",
        description: t('dashboard.albums.albumNameUpdated'),
        duration: 3000,
      })
    } catch (error) {
      console.error("Error updating album name:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : t('dashboard.albums.albumUpdateError'),
        variant: "destructive",
      })
    }
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
      
      const modelIds = accessibleModels?.map(access => {
        const imageModels = Array.isArray(access.image_models) ? access.image_models[0] : access.image_models
        return imageModels?.model_id
      }).filter(Boolean) || []
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

  // Handle file upload and create preview
  const handleFileUpload = (file: File) => {
    setUploadedFile(file)
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setUploadedFilePreview(previewUrl)
  }

  // Clean up preview URL when component unmounts or file changes
  React.useEffect(() => {
    return () => {
      if (uploadedFilePreview) {
        URL.revokeObjectURL(uploadedFilePreview)
      }
    }
  }, [uploadedFilePreview])

  // Fetch user and quota status together to avoid race condition
  useEffect(() => {
    let channel: any = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Set a timeout to ensure profileLoading is set to false after 10 seconds
    timeoutId = setTimeout(() => {
      console.warn('⚠️ Profile loading timeout - setting profileLoading to false');
      setProfileLoading(false);
    }, 10000);
    
    async function fetchUserAndQuota() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setProfileLoading(false);
        // Clear the timeout since we're done loading
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
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
          // Clear the timeout since we're done loading
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
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
      try {
        await fetchUserAccessibleModels(userTier);
      } catch (error) {
        console.error('Error fetching accessible models in useEffect:', error);
        // Set some default accessible models for free users if fetch fails
        if (userTier === 'free') {
          setUserAccessibleModels(['fal-ai/fast-sdxl', 'fal-ai/hidream-i1-fast', 'fal-ai/flux/schnell']);
        }
      }
      
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
      // Clear the timeout since we're done loading
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
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
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Helper function to check if a model is new (within a week)
  const isModelNew = (modelId: string) => {
    const newModels = {
      "fal-ai/bytedance/seededit/v3/edit-image": new Date('2024-12-19') // Set the date when model was added
    }
    
    const addedDate = newModels[modelId as keyof typeof newModels]
    if (!addedDate) return false
    
    const weekInMs = 7 * 24 * 60 * 60 * 1000
    const now = new Date()
    return (now.getTime() - addedDate.getTime()) < weekInMs
  }

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
      id: "fal-ai/flux/schnell",
      name: "Flux Schnell",
      description: "Fast Flux model for quick generation",
      category: "Fast & Free",
      icon: Zap,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-100",
      price: isFreeUser ? "Free" : "$0.01/MP"
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
      id: "fal-ai/imagen4/preview/fast",
      name: "Imagen4-preview",
      description: "Fast version of Google's Imagen 4",
      category: "Advanced",
      icon: ImageIcon,
      iconColor: "text-pink-500",
      bgColor: "bg-pink-100",
      price: "$0.04"
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
    },
    {
      id: "fal-ai/bytedance/seededit/v3/edit-image",
      name: "SeedEdit V3",
      description: "AI-powered image editing",
      category: "Editing",
      icon: Edit,
      iconColor: "text-green-600",
      bgColor: "bg-green-100",
      price: "$0.04"
    },
    {
      id: "rundiffusion-fal/juggernaut-flux-lora/inpainting",
      name: "Juggernaut Flux Inpainting",
      description: "AI-powered object replacement and inpainting",
      category: "Editing",
      icon: Edit,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-100",
      price: "$0.04"
    }
  ]

  // Update current model index when model changes
  useEffect(() => {
    const modelIndex = availableModels.findIndex(m => m.id === model)
    if (modelIndex !== -1) {
      setCurrentModelIndex(modelIndex)
    }
    
    // Reset guidance scale for SeedEdit model (0-1 range vs 1-20 range for other models)
    if (model === 'fal-ai/bytedance/seededit/v3/edit-image') {
      setGuidanceScale(0.5) // Default for SeedEdit (0-1 range)
    } else {
      setGuidanceScale(7.5) // Default for other models (1-20 range)
    }
  }, [model])



  return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === "generate" ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
              >
                <Plus className="w-4 h-4" />
                <span>{t('dashboard.tabs.generate')}</span>
              </Button>
              <Button
                variant={activeTab === "history" ? "default" : "ghost"}
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === "history" ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
              >
                <History className="w-4 h-4" />
                <span>{t('dashboard.tabs.history')}</span>
              </Button>
              <Button
                variant={activeTab === "albums" ? "default" : "ghost"}
                onClick={() => setActiveTab("albums")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === "albums" ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
              >
                <Folder className="w-4 h-4" />
                <span>{t('dashboard.tabs.albums')}</span>
              </Button>
              <Button
                variant={activeTab === "profile" ? "default" : "ghost"}
                onClick={() => setActiveTab("profile")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === "profile" ? "bg-purple-600 hover:bg-purple-700 text-white shadow-sm" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
              >
                <UserCircle className="w-4 h-4" />
                <span className="hidden lg:inline">
                  {userName ? `Welcome, ${userName}` : t('dashboard.tabs.profile')}
                </span>
                <span className="lg:hidden">{t('dashboard.tabs.profile')}</span>
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => router.push('/admin')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-700 dark:text-red-400"
                >
                  <Shield className="w-4 h-4" />
                  <span>{t('dashboard.tabs.admin')}</span>
                </Button>
              )}
              {/* Language Switcher */}
              <LanguageSwitcher variant="ghost" size="sm" />
            </nav>
            {/* Mobile nav */}
            {userMenuOpen && (
              <nav className="flex flex-col gap-2 w-full sm:hidden bg-white dark:bg-gray-900 rounded-lg shadow p-2 mt-2 z-50">
                <Button
                  variant={activeTab === "generate" ? "default" : "ghost"}
                  onClick={() => setActiveTab("generate")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === "generate" ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('dashboard.tabs.generate')}</span>
                </Button>
                <Button
                  variant={activeTab === "history" ? "default" : "ghost"}
                  onClick={() => setActiveTab("history")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === "history" ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
                >
                  <History className="w-4 h-4" />
                  <span>{t('dashboard.tabs.history')}</span>
                </Button>
                <Button
                  variant={activeTab === "albums" ? "default" : "ghost"}
                  onClick={() => setActiveTab("albums")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === "albums" ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
                >
                  <Folder className="w-4 h-4" />
                  <span>{t('dashboard.tabs.albums')}</span>
                </Button>
                <Button
                  variant={activeTab === "profile" ? "default" : "ghost"}
                  onClick={() => setActiveTab("profile")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === "profile" ? "bg-purple-600 hover:bg-purple-700 text-white shadow-sm" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
                >
                  <UserCircle className="w-4 h-4" />
                  <span>
                    {userName ? `Welcome, ${userName}` : t('dashboard.tabs.profile')}
                  </span>
                </Button>
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => router.push('/admin')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-700 dark:text-red-400"
                  >
                    <Shield className="w-4 h-4" />
                    <span>{t('dashboard.tabs.admin')}</span>
                  </Button>
                )}
                {/* Language Switcher & Sign Out - Mobile */}
                <div className="w-full flex items-center justify-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <LanguageSwitcher variant="ghost" size="sm" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('dashboard.actions.logOut')}</span>
                  </Button>
                </div>
              </nav>
            )}
          </div>
        </header>

        <div className="container mx-auto px-2 py-4">
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
                            {userAccessibleModels.length} of {availableModels.length} models
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
                          {availableModels.map((modelOption) => {
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
                        {userAccessibleModels.length} of {availableModels.length} models
                      </span>
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white border-0 text-xs px-2 py-1 h-6">
                        {t('dashboard.generate.unlockAll')}
                      </Button>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto">
                      {!profileLoading ? (
                        <div className="space-y-3">
                          {/* Mobile Model List */}
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
                      <SmartPromptBuilder
                        initialPrompt={prompt}
                        onPromptChange={(newPrompt) => setPrompt(newPrompt)}
                        onClose={() => setShowSmartPromptBuilder(false)}
                      />
                    </div>
                  )}
                  
                  <div className="grid lg:grid-cols-2 gap-8">
                    {selectedCategories.length === 0 ? (
                      images.length > 0 && (
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
                      )
                    ) : selectedCategories.includes("Text to Image") && (
                      <>
                        {/* Generation Form */}
                        <div className="max-w-4xl mx-auto px-4 sm:px-6">
                        <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-2xl rounded-2xl sm:rounded-3xl">
                          <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6">
                            <CardTitle className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 text-2xl sm:text-3xl font-bold">
                              <span className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500 animate-pulse">
                                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                              </span>
                              {t('dashboard.generate.title')}
                            </CardTitle>
                            <CardDescription className="text-base sm:text-lg text-muted-foreground mt-2">
                              {t('dashboard.generate.description')}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-6 sm:space-y-8 px-4 sm:px-6">
                            <form onSubmit={generateImage} className="space-y-6 sm:space-y-8">
                              {/* Enhanced Prompt Input Area */}
                              <div className="space-y-4 sm:space-y-6">
                                {/* Header with actions */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <Label htmlFor="prompt" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                                      {t('dashboard.generate.prompt')}
                                    </Label>
                                    <div className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                                      <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Required</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 overflow-x-auto">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setShowExamplePrompts(!showExamplePrompts)}
                                      className="flex items-center gap-1 sm:gap-2 text-purple-600 border-purple-200 hover:bg-purple-50 whitespace-nowrap"
                                    >
                                      <Lightbulb className="w-4 h-4" />
                                      <span className="hidden sm:inline">{t('dashboard.generate.examplePrompts')}</span>
                                      <span className="sm:hidden">Examples</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setShowSmartPromptBuilder(!showSmartPromptBuilder)}
                                      className="flex items-center gap-1 sm:gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 whitespace-nowrap"
                                    >
                                      <Wand2 className="w-4 h-4" />
                                      <span className="hidden sm:inline">{t('dashboard.generate.smartBuilder')}</span>
                                      <span className="sm:hidden">Builder</span>
                                    </Button>
                                  </div>
                                </div>

                                {/* Example Prompts */}
                                {showExamplePrompts && (
                                  <div className="p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                                    <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3 flex items-center gap-2">
                                      <Lightbulb className="w-4 h-4" />
                                      {t('dashboard.generate.examplePrompts')}
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2">
                                      {examplePrompts.map((example, index) => (
                                        <button
                                          key={index}
                                          type="button"
                                          onClick={() => {
                                            setPrompt(example)
                                            setShowExamplePrompts(false)
                                            toast({ 
                                              title: "Example Applied", 
                                              description: "You can now edit and customize this prompt",
                                              duration: 2000
                                            })
                                          }}
                                          className="text-left p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all duration-200 group active:scale-95"
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 group-hover:text-purple-700 dark:group-hover:text-purple-300">
                                              {example}
                                            </p>
                                            <Copy className="w-4 h-4 text-gray-400 group-hover:text-purple-500 shrink-0 mt-0.5" />
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Main prompt input */}
                                <div className="relative">
                                  <div className="flex flex-col sm:flex-row items-start gap-3">
                                    <div className="w-full sm:flex-1 relative">
                                      <Textarea
                                        id="prompt"
                                        placeholder={t('dashboard.generate.promptPlaceholderInspiring')}
                                        value={prompt}
                                        onChange={e => setPrompt(e.target.value)}
                                        required
                                        className="min-h-[120px] sm:min-h-[140px] text-base sm:text-lg resize-none focus:ring-2 focus:ring-purple-500 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                      />
                                      {/* Character counter */}
                                      <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-md shadow-sm">
                                        {prompt.length} chars
                                      </div>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      disabled={improvingPrompt || !prompt.trim()}
                                      title="Improve prompt with AI"
                                      className="w-full sm:w-auto sm:shrink-0 sm:mt-2 h-10 sm:h-12 sm:w-12 p-2 sm:p-0 hover:bg-yellow-50 hover:border-yellow-200 border border-transparent"
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
                                        <div className="animate-spin">
                                          <Sparkles className="w-5 h-5 text-yellow-500" />
                                        </div>
                                      ) : (
                                        <div className="flex sm:flex-col items-center gap-1 sm:gap-1">
                                          <div className="flex items-center gap-1">
                                            <Sparkles className="w-4 h-4 text-yellow-500" />
                                            <span className="text-yellow-600 font-bold text-xs">AI</span>
                                          </div>
                                          <span className="text-xs text-gray-500 font-medium">{t('dashboard.generate.enhance')}</span>
                                        </div>
                                      )}
                                    </Button>
                                  </div>
                                  {/* Helper text */}
                                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                                    <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
                                    {t('dashboard.generate.promptHelperText')}
                                  </p>
                                </div>
                              </div>

                              {/* Essential Settings - Always Visible */}
                              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                                <div className="space-y-2">
                                  <Label htmlFor="current-model" className="font-semibold">{t('dashboard.generate.currentModel')}</Label>
                                  {!profileLoading ? (
                                    <div className="p-3 sm:p-4 border-2 rounded-xl bg-primary/5 border-primary/20">
                                      <div className="flex items-center gap-3">
                                        {(() => {
                                          const currentModel = availableModels.find(m => m.id === model);
                                          if (!currentModel) return null;
                                          return (
                                            <>
                                              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${currentModel.bgColor}`}>
                                                <currentModel.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${currentModel.iconColor}`} />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                  <h3 className="font-semibold text-sm sm:text-base truncate">{currentModel.name}</h3>
                                                  <div className="px-2 sm:px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 ml-2">
                                                    {t('dashboard.generate.active')}
                                                  </div>
                                                </div>
                                                <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{currentModel.description}</p>
                                                <div className="flex items-center justify-between mt-2">
                                                  <span className="text-xs sm:text-sm font-medium text-primary">{currentModel.category}</span>
                                                  {currentModel.price && (
                                                    <span className="text-xs sm:text-sm font-medium text-green-600">{currentModel.price}</span>
                                                  )}
                                                </div>
                                              </div>
                                            </>
                                          );
                                        })()}
                                      </div>
                                      <div className="mt-3 sm:mt-4 pt-3 border-t border-primary/10">
                                        <Button 
                                          type="button"
                                          variant="ghost" 
                                          size="sm" 
                                          className="w-full text-primary hover:bg-primary/10"
                                          onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setModelPanelOpen(true)
                                          }}
                                        >
                                          <Bot className="w-4 h-4 mr-2" />
                                          {t('dashboard.generate.chooseModel')}
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="h-20 sm:h-24 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse flex items-center justify-center">
                                      <span className="text-gray-500 text-sm">{t('dashboard.generate.loadingModel')}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="aspectRatio" className="font-semibold">{t('dashboard.generate.aspectRatio')}</Label>
                                  <Select value={aspectRatio} onValueChange={handleAspectRatioChange}>
                                    <SelectTrigger className="h-10 sm:h-12">
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
                                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                                  className="w-full flex items-center justify-center gap-2 p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                  <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                  <span className="font-medium text-sm sm:text-base">
                                    {showAdvancedSettings ? t('dashboard.generate.hideAdvanced') : t('dashboard.generate.showAdvanced')}
                                  </span>
                                  {showAdvancedSettings ? (
                                    <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                                  )}
                                </Button>
                              </div>

                              {/* Advanced Settings - Collapsible */}
                              {showAdvancedSettings && (
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
                                        <div className="flex gap-2 mt-2">
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
                                          <Label htmlFor="image-upload">{t('dashboard.generate.uploadImage')}</Label>
                                          <Input
                                            id="image-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0]
                                              if (file) {
                                                handleFileUpload(file)
                                              }
                                            }}
                                            className="mt-1"
                                            key={uploadedFile ? 'with-file' : 'no-file'}
                                          />
                                          {uploadedFile && uploadedFilePreview && (
                                            <div className="mt-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
                                              <div className="flex items-start gap-3">
                                                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                                  <Image
                                                    src={uploadedFilePreview}
                                                    alt="Uploaded reference image"
                                                    fill
                                                    className="object-cover"
                                                    sizes="64px"
                                                  />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
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
                                                  className="text-gray-400 hover:text-gray-600"
                                                >
                                                  ×
                                                </Button>
                                              </div>
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
                                </div>
                              )}

                              {/* Generate Button */}
                              <div className="pt-4 sm:pt-6">
                                <Button 
                                  type="submit" 
                                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95" 
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


                      {/* Latest 3 Creations - Grid Preview */}
                      {images.length > 0 && (
                        <div className="max-w-4xl mx-auto mt-6 sm:mt-8 px-4 sm:px-6">
                          <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-lg rounded-2xl">
                            <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
                              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                {t('dashboard.generate.latestCreations')}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 sm:px-6">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {images.slice(0, 3).map((image, index) => (
                                  <div key={image.id} className="group cursor-pointer" onClick={() => { setExpandedImage(image); setShowFullPrompt(false); }}>
                                    <div className="relative aspect-square rounded-xl overflow-hidden shadow-md mb-3 group-hover:shadow-lg transition-shadow">
                                      <Image
                                        src={image.image_url || "/placeholder.svg"}
                                        alt={image.prompt}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        priority={index === 0}
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                                    </div>
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                                        {image.prompt}
                                      </p>
                                      <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span className="truncate max-w-[100px]">{image.model}</span>
                                        <span>{new Date(image.created_at).toLocaleDateString()}</span>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        type="button"
                                        className="w-full"
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
                            <div className="text-3xl font-bold text-blue-600 mb-1 group-hover:scale-105 transition-transform duration-300">{new Set(images.map((img) => img.model)).size}</div>
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
                            setImageRef(img)
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
      </div>
    </div>
  )
}
