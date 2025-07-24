import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { fal } from "@fal-ai/client"

// Configure API route for larger request bodies
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
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
      image_url,
    } = body

    // Validate required fields
    if (!image_url) {
      return NextResponse.json({ error: "image_url is required" }, { status: 400 })
    }

    // This route now uses auto-segmentation, so point/box inputs are ignored.
    // The check for points/boxes has been removed.

    // User profile validation removed - using basic auth check only

    // Skip quota check for SAM2 segmentation until model is properly configured
    console.log('Skipping quota check for SAM2 segmentation (temporary)')

    console.log('SAM2 auto-segmentation request:', { image_url })

    // Prepare request payload for SAM2 auto-segmentation
    // Parameters are based on the OpenAPI spec for fal-ai/sam2/auto-segment
    const requestPayload: any = {
      image_url,
      points_per_side: 32,
      pred_iou_thresh: 0.88,
      stability_score_thresh: 0.95,
      min_mask_region_area: 100,
    }

    // Call SAM2 segment API
    const modelId = "fal-ai/sam2/auto-segment"
    let result: any
    try {
      // Using fal.run for simplicity as it handles the async queueing process
      // for models that might take longer.
      console.log(`Attempting fal.run for ${modelId}...`)
      result = await fal.run(modelId, {
        input: requestPayload,
      })
      console.log(`fal.run for ${modelId} succeeded.`)
    } catch (error: any) {
        console.error('SAM2 API error:', error)
        return NextResponse.json({ 
          error: error?.message || "SAM2 segmentation error",
          details: error,
          stack: error?.stack || null,
          fal_error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
          requestPayload,
        }, { status: 500 })
    }

    console.log('SAM2 API success:', JSON.stringify(result, null, 2))

    // Extract data from the nested response
    const data = result.data || result
    const individualMasks = data.individual_masks
    const combinedMask = data.combined_mask

    // Log result structure for debugging
    console.log('Result keys:', Object.keys(result || {}))
    console.log('Data keys:', Object.keys(data || {}))
    console.log('individual_masks type:', typeof individualMasks)
    console.log('individual_masks length:', individualMasks?.length)

    // Validate API response
    if (!individualMasks || !Array.isArray(individualMasks) || individualMasks.length === 0) {
      console.error('Invalid SAM2 API response - no individual_masks:', JSON.stringify(result, null, 2))
      return NextResponse.json({ 
        error: "No objects detected for segmentation",
        debug_info: {
          result_keys: Object.keys(result || {}),
          data_keys: Object.keys(data || {}),
          individual_masks_type: typeof individualMasks,
          individual_masks_length: individualMasks?.length,
          full_result: result
        }
      }, { status: 500 })
    }

    // Skip usage tracking for SAM2 segmentation until model is properly configured
    console.log('Skipping usage tracking for SAM2 segmentation (temporary)')

    // Log the successful generation to generated_images table
    const { error: logError } = await supabase
      .from('generated_images')
      .insert({
        user_id: user.id,
        model: 'fal-ai/sam2',
        prompt: `SAM2 segmentation: ${individualMasks.length} objects detected`,
        image_url: data.image_url || image_url,
        parameters: {
          points: null, // Points are now ignored
          boxes: null, // Boxes are now ignored
          multimask_output: null, // This parameter is no longer used
          objects_detected: individualMasks.length
        }
      })

    if (logError) {
      console.error('Error logging generation:', logError)
    }

    // Process masks to add bounding box information
    const processedMasks = individualMasks.map((mask: any, index: number) => {
      const maskUrl = typeof mask === 'string' ? mask : (mask.url || mask.mask_url)
      
      return {
        id: `mask_${index}`,
        mask_url: maskUrl,
        url: maskUrl, // For compatibility
        confidence: 0.8,
        label: `Object ${index + 1}`,
        // Note: bbox will be calculated on the frontend from mask image
        bbox: null,
        width: mask.width || data.combined_mask?.width || 730,
        height: mask.height || data.combined_mask?.height || 960
      }
    })

    return NextResponse.json({
      success: true,
      individual_masks: processedMasks,
      combined_mask: combinedMask,
      image_url: data.image_url || image_url,
      objects_detected: processedMasks.length,
      metadata: {
        points: null, // Points are now ignored
        boxes: null, // Boxes are now ignored
        multimask_output: null, // This parameter is no longer used
        processing_time: result.timings?.total_time,
        image_dimensions: {
          width: data.combined_mask?.width || 730,
          height: data.combined_mask?.height || 960
        }
      }
    })

  } catch (error: any) {
    console.error('SAM2 segmentation error:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message
    }, { status: 500 })
  }
} 