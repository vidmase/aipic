import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { QuotaManager } from "@/lib/quota-manager"
import { fal } from "@fal-ai/client"

const quotaManager = new QuotaManager()

export async function POST(request: NextRequest) {
  console.log('=== Florence-2 Object Detection API Called ===')
  try {
    const supabase = await createServerClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log('User authenticated:', user.id)

    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    const { image_url } = body

    // Validate required fields
    if (!image_url) {
      console.error('Missing image_url in request')
      return NextResponse.json({ error: "image_url is required" }, { status: 400 })
    }

    // Get user information
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('user_tier, is_premium')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    // Skip quota check for now (you can implement this later)
    console.log('Skipping quota check for Florence-2 object detection (temporary)')

    console.log('Florence-2 object detection request:', { image_url })

    // Prepare request payload for Florence-2 object detection
    // Try different parameter names that might be expected by Florence-2
    const requestPayload = {
      image_url: image_url
    }

    console.log('Request payload:', JSON.stringify(requestPayload, null, 2))

    // Check FAL_KEY environment variable
    const falKey = process.env.FAL_KEY
    if (!falKey) {
      console.error('FAL_KEY environment variable is not set')
      return NextResponse.json({ error: "API configuration error - FAL_KEY not set" }, { status: 500 })
    }
    console.log('FAL_KEY is set:', falKey ? 'Yes' : 'No')

    // Call Florence-2 object detection API
    const modelId = "fal-ai/florence-2-large/object-detection"
    console.log('Using model ID:', modelId)
    let result: any
    try {
      console.log(`Attempting fal.run for ${modelId}...`)
      console.log('Request payload being sent:', JSON.stringify(requestPayload, null, 2))
      result = await fal.run(modelId, {
        input: requestPayload,
      })
      console.log(`fal.run for ${modelId} succeeded.`)
    } catch (error: any) {
      console.error('Florence-2 API error:', error)
      console.error('Florence-2 API error type:', typeof error)
      console.error('Florence-2 API error keys:', Object.keys(error || {}))
      console.error('Florence-2 API error message:', error?.message)
      console.error('Florence-2 API error stack:', error?.stack)
      return NextResponse.json({ 
        error: error?.message || "Object detection error",
        details: {
          message: error?.message,
          name: error?.name,
          status: error?.status,
          body: error?.body
        },
        stack: error?.stack || null,
        fal_error: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        requestPayload,
      }, { status: 500 })
    }

    console.log('Florence-2 API success:', JSON.stringify(result, null, 2))

    // Debug the response structure
    console.log('Response structure debug:')
    console.log('- result exists:', !!result)
    console.log('- result.data exists:', !!result?.data)
    console.log('- result.data.results exists:', !!result?.data?.results)
    console.log('- result.data.results.bboxes exists:', !!result?.data?.results?.bboxes)
    console.log('- result.data.results.bboxes is array:', Array.isArray(result?.data?.results?.bboxes))
    console.log('- bboxes length:', result?.data?.results?.bboxes?.length)

    // Extract the actual data from the response
    const responseData = result.data || result

    // Validate API response
    if (!responseData.results || !responseData.results.bboxes || !Array.isArray(responseData.results.bboxes)) {
      console.error('Invalid Florence-2 API response - no bounding boxes:', JSON.stringify(result, null, 2))
      return NextResponse.json({ 
        error: "No objects detected in the image",
        debug_info: {
          result_keys: Object.keys(result || {}),
          data_keys: Object.keys(responseData || {}),
          results_type: typeof responseData?.results,
          bboxes_type: typeof responseData?.results?.bboxes,
          full_result: result
        }
      }, { status: 500 })
    }

    // Check if we have any detections
    if (responseData.results.bboxes.length === 0) {
      return NextResponse.json({ 
        error: "No objects detected in the image",
        detections: [],
        objects_detected: 0
      }, { status: 200 })
    }

    // Convert Florence-2 bounding box format to our expected format
    const detections = responseData.results.bboxes.map((bbox: any) => ({
      x: bbox.x,
      y: bbox.y,
      w: bbox.w,
      h: bbox.h,
      label: bbox.label,
      confidence: bbox.confidence || 0.8 // Default confidence if not provided
    }))

    // Save detection results to database
    const { data: savedDetection, error: saveError } = await supabase
      .from('generated_images')
      .insert({
        user_id: user.id,
        prompt: `[OBJECT_DETECTION] Detected ${responseData.results.bboxes.length} objects`,
        image_url: responseData.image?.url || image_url,
        model: "Florence-2 Large Object Detection",
        width: responseData.image?.width || null,
        height: responseData.image?.height || null,
        parameters: {
          objects_detected: detections.length,
          detection_data: detections
        }
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving object detection data:', saveError)
      // Non-critical error, so we can still return the detection data
    }

    // Skip usage tracking for now
    console.log('Skipping usage tracking for Florence-2 object detection (temporary)')

    return NextResponse.json({
      detections: detections,
      image: responseData.image,
      objects_detected: detections.length,
      savedDetectionId: savedDetection?.id
    })

  } catch (error: any) {
    console.error('Root error in Florence-2 object detection handler:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      cause: error.cause
    })
    return NextResponse.json({
      error: "An unexpected error occurred during object detection.",
      details: error.message,
      stack: error.stack,
      errorName: error.name
    }, { status: 500 })
  }
} 