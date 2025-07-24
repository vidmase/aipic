import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { QuotaManager } from '@/lib/quota-manager'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { image_url, mask_coordinates, mask_url, replacement_prompt, original_label } = await request.json()

    if (!image_url || (!mask_coordinates && !mask_url) || !replacement_prompt) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    console.log('Object replacement request:', { 
      image_url: image_url.substring(0, 50), 
      mask_coordinates, 
      mask_url: mask_url ? mask_url.substring(0, 50) + '...' : undefined,
      replacement_prompt, 
      original_label 
    })

    // Use provided mask_url or create a simple white mask as fallback
    const maskToUse = mask_url || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    
    const modelId = "rundiffusion-fal/juggernaut-flux-lora/inpainting"
    const prompt = `Replace with ${replacement_prompt}, high quality, detailed, realistic`

    // Check quota
    const quotaManager = new QuotaManager()
    const canGenerate = await quotaManager.checkQuota(user.id, modelId)
    
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

    // Prepare request payload
    const requestPayload = {
      prompt: prompt,
      image_url: image_url,
      mask_url: maskToUse,
      guidance_scale: 7.5,
      num_inference_steps: 28,
      strength: 0.85,
      num_images: 1,
      output_format: "jpeg",
      enable_safety_checker: true
    }

    console.log('Submitting replacement request to rundiffusion-fal/juggernaut-flux-lora/inpainting')

    // Call FAL API directly
    const falResponse = await fetch("https://fal.run/rundiffusion-fal/juggernaut-flux-lora/inpainting", {
      method: "POST",
      headers: {
        "Authorization": `Key ${falApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    })

    if (!falResponse.ok) {
      const errorData = await falResponse.json().catch(() => ({}))
      console.error('FAL API error:', {
        status: falResponse.status,
        statusText: falResponse.statusText,
        errorData
      })
      return NextResponse.json({ 
        error: errorData.detail || errorData.error || `FAL API error: ${falResponse.status} ${falResponse.statusText}`,
      }, { status: falResponse.status })
    }

    const result = await falResponse.json()
    console.log('Object replacement result:', result)

    if (!result.images || !Array.isArray(result.images) || result.images.length === 0) {
      throw new Error('No images generated')
    }

    const generatedImage = result.images[0]

    // Save to database
    const { data: savedImage, error: saveError } = await supabase
      .from('generated_images')
      .insert({
        user_id: user.id,
        prompt: `[OBJECT REPLACE] ${prompt}`,
        image_url: generatedImage.url,
        model: "Object Replacement",
        guidance_scale: 7.5,
        aspect_ratio: "1:1",
        width: generatedImage.width || 1024,
        height: generatedImage.height || 1024
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving replaced image:', saveError)
      // Don't fail the request if database save fails
    }

    // Track usage
    try {
      await quotaManager.trackUsage(user.id, modelId, 1)
    } catch (trackingError) {
      console.error('Warning: Usage tracking failed:', trackingError)
    }

    return NextResponse.json({
      edited_image_url: generatedImage.url,
      original_label: original_label,
      replacement_prompt: replacement_prompt
    })

  } catch (error) {
    console.error('Object replacement error:', error)
    return NextResponse.json(
      { error: 'Failed to process object replacement request' },
      { status: 500 }
    )
  }
} 