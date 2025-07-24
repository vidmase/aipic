import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { QuotaManager } from "@/lib/quota-manager"
import * as fal from "@fal-ai/serverless-client"

const quotaManager = new QuotaManager()

// Configure API route for larger request bodies
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
  maxDuration: 300, // 5 minutes timeout
}

// Helper function to get image info from URL
async function getImageInfo(imageUrl: string) {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' })
    const contentLength = response.headers.get('content-length')
    const contentType = response.headers.get('content-type')
    
    return {
      size: contentLength ? parseInt(contentLength) : null,
      type: contentType,
      isValid: response.ok
    }
  } catch (error) {
    console.error('Error getting image info:', error)
    return { size: null, type: null, isValid: false }
  }
}

// Helper function to validate image URL and size
async function validateImageForAPI(imageUrl: string) {
  const imageInfo = await getImageInfo(imageUrl)
  
  if (!imageInfo.isValid) {
    throw new Error('Invalid image URL or image not accessible')
  }
  
  // Check file size (limit to 20MB for fal.ai)
  const maxSizeBytes = 20 * 1024 * 1024 // 20MB
  if (imageInfo.size && imageInfo.size > maxSizeBytes) {
    throw new Error(`Image too large: ${(imageInfo.size / 1024 / 1024).toFixed(1)}MB. Maximum allowed: 20MB`)
  }
  
  // Check if it's an image
  if (imageInfo.type && !imageInfo.type.startsWith('image/')) {
    throw new Error('URL does not point to a valid image file')
  }
  
  return imageInfo
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      prompt, 
      image_url, 
      guidance_scale = 3.5, 
      num_inference_steps = 28,
      seed,
      num_images = 1,
      output_format = "jpeg",
      enable_safety_checker = true,
      mask_url // Optional for inpainting
    } = body

    // Validate required fields
    if (!prompt || !image_url) {
      return NextResponse.json({ 
        error: "Missing required fields: prompt and image_url are required" 
      }, { status: 400 })
    }

    // Validate image URL and size before proceeding
    try {
      console.log('Validating image URL and size...')
      const imageInfo = await validateImageForAPI(image_url)
      console.log('Image validation successful:', {
        size: imageInfo.size ? `${(imageInfo.size / 1024 / 1024).toFixed(1)}MB` : 'unknown',
        type: imageInfo.type
      })
    } catch (validationError) {
      console.error('Image validation failed:', validationError)
      return NextResponse.json({ 
        error: `Image validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`,
        suggestion: "Try using a smaller image (under 20MB) or a different image format"
      }, { status: 400 })
    }

    // Validate parameters
    if (guidance_scale < 1 || guidance_scale > 20) {
      return NextResponse.json({ error: "guidance_scale must be between 1 and 20" }, { status: 400 })
    }
    if (num_inference_steps < 1 || num_inference_steps > 50) {
      return NextResponse.json({ error: "num_inference_steps must be between 1 and 50" }, { status: 400 })
    }

    const modelId = "fal-ai/flux-pro/kontext"

    // Check quota
    console.log(`Checking quota for user ${user.id} and model ${modelId}`)
    const canGenerate = await quotaManager.checkQuota(user.id, modelId)
    console.log('Quota check result:', canGenerate)
    
    if (!canGenerate.allowed) {
      return NextResponse.json({ 
        error: canGenerate.reason || "Quota exceeded"
      }, { status: 429 })
    }

    // Get FAL API key
    const falApiKey = process.env.FAL_KEY
    if (!falApiKey) {
      console.error('FAL_KEY environment variable not set')
      return NextResponse.json({ error: "API configuration error" }, { status: 500 })
    }

    // Configure fal.ai client
    fal.config({
      credentials: falApiKey
    })

    // Prepare request payload for FLUX Kontext
    const requestPayload: any = {
      prompt: prompt,
      image_url: image_url,
      guidance_scale: guidance_scale,
      num_inference_steps: num_inference_steps,
      num_images: num_images,
      output_format: output_format,
      enable_safety_checker: enable_safety_checker
    }

    // Add optional seed if provided
    if (seed !== undefined && seed !== null) {
      requestPayload.seed = parseInt(seed)
    }

    console.log('Submitting FLUX Kontext request:', {
      ...requestPayload,
      image_url: image_url.substring(0, 50) + '...' // Log truncated URL for privacy
    })

    // Call FLUX Kontext API with better error handling
    let result: any
    try {
      result = await fal.subscribe("fal-ai/flux-pro/kontext", {
        input: requestPayload,
      })
    } catch (falError: any) {
      console.error('FLUX Kontext API error:', falError)
      
      // Handle specific error types
      if (falError?.status === 413) {
        return NextResponse.json({ 
          error: "Image too large for processing",
          details: "The image file is too large. Please use an image under 10MB or reduce the image resolution.",
          suggestion: "Try compressing your image or using a smaller resolution before uploading."
        }, { status: 413 })
      }
      
      if (falError?.status === 400) {
        return NextResponse.json({ 
          error: "Invalid request parameters",
          details: falError?.message || "The request parameters are invalid",
          suggestion: "Check that your image URL is accessible and the prompt is valid."
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: falError?.message || "FLUX Kontext API error",
        details: falError,
        suggestion: "Please try again with a different image or contact support if the issue persists."
      }, { status: 500 })
    }

    console.log('FLUX Kontext API success:', result)

    // Validate API response
    if (!result.images || !Array.isArray(result.images) || result.images.length === 0) {
      console.error('Invalid FLUX Kontext API response - no images:', result)
      return NextResponse.json({ error: "No images generated" }, { status: 500 })
    }

    const generatedImage = result.images[0]
    console.log('Generated image data:', generatedImage)

    // Determine album name based on whether this was inpainting or editing
    const albumName = mask_url ? "Inpainted" : "Edited"
    const promptPrefix = mask_url ? "[INPAINT]" : "[EDIT]"

    // Save to database
    const { data: savedImage, error: saveError } = await supabase
      .from('generated_images')
      .insert({
        user_id: user.id,
        prompt: `${promptPrefix} ${prompt}`,
        image_url: generatedImage.url,
        model: "FLUX Kontext Pro",
        guidance_scale: guidance_scale,
        aspect_ratio: "1:1",
        width: generatedImage.width || 1024,
        height: generatedImage.height || 1024
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving edited image:', saveError)
      return NextResponse.json({ 
        error: "Failed to save edited image",
        details: saveError.message,
        code: saveError.code 
      }, { status: 500 })
    }

    console.log('Database save successful, savedImage:', savedImage)

    // Create/find album and add image to it
    try {
      // First, check if user already has the appropriate album
      const { data: existingAlbum, error: albumFindError } = await supabase
        .from('albums')
        .select('id, cover_image_url')
        .eq('user_id', user.id)
        .eq('name', albumName)
        .single()

      let albumId = existingAlbum?.id

      // If no album exists, create it with cover image
      if (!existingAlbum && albumFindError) {
        console.log(`Creating new ${albumName} album for user:`, user.id)
        const { data: newAlbum, error: albumCreateError } = await supabase
          .from('albums')
          .insert({
            user_id: user.id,
            name: albumName,
            cover_image_url: generatedImage.url
          })
          .select()
          .single()

        if (albumCreateError) {
          console.error(`Error creating ${albumName} album:`, albumCreateError)
        } else {
          albumId = newAlbum.id
          console.log(`Created ${albumName} album with cover image:`, albumId)
        }
      } else if (existingAlbum && !existingAlbum.cover_image_url) {
        // Album exists but has no cover image, set this image as cover
        console.log(`Setting cover image for existing ${albumName} album:`, albumId)
        await supabase
          .from('albums')
          .update({ cover_image_url: generatedImage.url })
          .eq('id', albumId)
        console.log(`Cover image set for ${albumName} album`)
      }

      // Add image to the album if we have an album ID
      if (albumId && savedImage) {
        const { error: albumImageError } = await supabase
          .from('album_images')
          .insert({
            album_id: albumId,
            image_id: savedImage.id
          })

        if (albumImageError) {
          console.error(`Error adding image to ${albumName} album:`, albumImageError)
        } else {
          console.log(`Successfully added edited image to ${albumName} album`)
        }
      }
    } catch (albumError) {
      console.error('Warning: Album management failed, but continuing with success response:', albumError)
      // Don't fail the whole request if album management fails
    }

    // Track usage after successful generation
    try {
      const trackingResult = await quotaManager.trackUsage(user.id, modelId, 1)
      if (trackingResult) {
        console.log('Usage tracking completed successfully')
      } else {
        console.warn('Usage tracking returned false, but continuing with success response')
      }
    } catch (trackingError) {
      console.error('Warning: Usage tracking failed, but continuing with success response:', trackingError)
      // Don't fail the whole request if usage tracking fails
    }

    console.log('Preparing successful response with savedImage:', savedImage)

    // Return the result in the format expected by frontend
    const response = {
      success: true,
      image: savedImage, // Frontend expects 'image' not 'images'
      fal_result: {
        seed: result.seed,
        has_nsfw_concepts: result.has_nsfw_concepts,
        timings: result.timings,
        prompt: result.prompt
      }
    }

    console.log('Sending response:', JSON.stringify(response, null, 2))
    return NextResponse.json(response)

  } catch (error) {
    console.error('Kontext edit API error:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 