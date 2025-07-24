import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { QuotaManager } from "@/lib/quota-manager"

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
      mask_url, 
      guidance_scale = 3.5, 
      num_inference_steps = 28, 
      strength = 0.85,
      seed,
      num_images = 1,
      output_format = "jpeg",
      enable_safety_checker = true
    } = body

    // Validate required fields
    if (!prompt || !image_url || !mask_url) {
      return NextResponse.json({ 
        error: "Missing required fields: prompt, image_url, and mask_url are required" 
      }, { status: 400 })
    }

    // Validate parameters according to fal.ai schema
    if (guidance_scale < 0 || guidance_scale > 20) {
      return NextResponse.json({ error: "guidance_scale must be between 0 and 20" }, { status: 400 })
    }
    if (strength < 0.0 || strength > 1.0) {
      return NextResponse.json({ error: "strength must be between 0.0 and 1.0" }, { status: 400 })
    }
    if (num_inference_steps < 1 || num_inference_steps > 50) {
      return NextResponse.json({ error: "num_inference_steps must be between 1 and 50" }, { status: 400 })
    }

    const modelId = "rundiffusion-fal/juggernaut-flux-lora/inpainting"

    // Check quota
    const quotaManager = new QuotaManager()
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

    // Prepare request payload according to fal.ai schema
    const requestPayload: any = {
      prompt: prompt,
      image_url: image_url,
      mask_url: mask_url,
      guidance_scale: guidance_scale,
      num_inference_steps: num_inference_steps,
      strength: strength,
      num_images: num_images,
      output_format: output_format,
      enable_safety_checker: enable_safety_checker
    }

    // Add optional seed if provided
    if (seed !== undefined && seed !== null) {
      requestPayload.seed = parseInt(seed)
    }

    console.log('Submitting inpainting request:', JSON.stringify(requestPayload, null, 2))

    // Use the direct fal.ai API approach (not queue-based for this endpoint)
    let falResponse
    try {
      falResponse = await fetch("https://fal.run/rundiffusion-fal/juggernaut-flux-lora/inpainting", {
        method: "POST",
        headers: {
          "Authorization": `Key ${falApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      })
      console.log('FAL API response status:', falResponse.status, falResponse.statusText)
    } catch (fetchError) {
      console.error('Network error calling FAL API:', fetchError)
      return NextResponse.json({ 
        error: "Network error connecting to AI service",
        details: fetchError instanceof Error ? fetchError.message : "Unknown network error"
      }, { status: 502 })
    }

    if (!falResponse.ok) {
      const errorData = await falResponse.json().catch(() => ({}))
      console.error('FAL API error:', {
        status: falResponse.status,
        statusText: falResponse.statusText,
        url: falResponse.url,
        headers: Object.fromEntries(falResponse.headers.entries()),
        errorData
      })
      return NextResponse.json({ 
        error: errorData.detail || errorData.error || `FAL API error: ${falResponse.status} ${falResponse.statusText}`,
        debug: {
          status: falResponse.status,
          statusText: falResponse.statusText,
          errorData
        }
      }, { status: falResponse.status })
    }

    const result = await falResponse.json()
    console.log('FAL API success:', result)

    // Validate API response
    if (!result.images || !Array.isArray(result.images) || result.images.length === 0) {
      console.error('Invalid fal.ai API response - no images:', result)
      return NextResponse.json({ error: "No images generated" }, { status: 500 })
    }

    const generatedImage = result.images[0]
    console.log('Generated image data:', generatedImage)

    // Save to database
    const { data: savedImage, error: saveError } = await supabase
      .from('generated_images')
      .insert({
        user_id: user.id,
        prompt: `[INPAINT] ${prompt}`,
        image_url: generatedImage.url,
        model: "Juggernaut Flux Inpainting",
        guidance_scale: guidance_scale,
        aspect_ratio: "1:1",
        width: generatedImage.width || 1024,
        height: generatedImage.height || 1024
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving inpainted image:', saveError)
      return NextResponse.json({ 
        error: "Failed to save inpainted image",
        details: saveError.message,
        code: saveError.code 
      }, { status: 500 })
    }

    console.log('Database save successful, savedImage:', savedImage)

    // Create/find "Inpainted" album and add image to it
    try {
      // First, check if user already has an "Inpainted" album
      const { data: existingAlbum, error: albumFindError } = await supabase
        .from('albums')
        .select('id, cover_image_url')
        .eq('user_id', user.id)
        .eq('name', 'Inpainted')
        .single()

      let albumId = existingAlbum?.id

      // If no album exists, create it with cover image
      if (!existingAlbum && albumFindError) {
        console.log('Creating new Inpainted album for user:', user.id)
        const { data: newAlbum, error: albumCreateError } = await supabase
          .from('albums')
          .insert({
            user_id: user.id,
            name: 'Inpainted',
            cover_image_url: generatedImage.url
          })
          .select()
          .single()

        if (albumCreateError) {
          console.error('Error creating Inpainted album:', albumCreateError)
        } else {
          albumId = newAlbum.id
          console.log('Created Inpainted album with cover image:', albumId)
        }
      } else if (existingAlbum && !existingAlbum.cover_image_url) {
        // Album exists but has no cover image, set this image as cover
        console.log('Setting cover image for existing Inpainted album:', albumId)
        await supabase
          .from('albums')
          .update({ cover_image_url: generatedImage.url })
          .eq('id', albumId)
        console.log('Cover image set for Inpainted album')
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
          console.error('Error adding image to Inpainted album:', albumImageError)
        } else {
          console.log('Successfully added inpainted image to album')
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
    console.error('Inpainting API error:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
} 