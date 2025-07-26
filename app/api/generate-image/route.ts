import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import * as fal from "@fal-ai/serverless-client"
import { quotaManager } from "@/lib/quota-manager"
import { createErrorResponse, logError, ERROR_CODES } from "@/lib/monitoring/error-utils"

// Configure fal client
fal.config({
  credentials: process.env.FAL_KEY,
})

// Image generation quota removed for now

export async function POST(request: NextRequest) {
  const timeoutMs = 45000; // 45 second timeout
  let requestBody: any;
  let user: any;
  
  try {
    const supabase = await createServerClient()

    // Check authentication
    const {
      data: { user: authenticatedUser },
    } = await supabase.auth.getUser()

    if (!authenticatedUser) {
      const error = new Error("User not authenticated");
      return createErrorResponse(error, {
        endpoint: 'generate-image',
        code: ERROR_CODES.AUTHENTICATION_ERROR,
        statusCode: 401
      });
    }

    user = authenticatedUser;
    requestBody = await request.json();
    const { prompt, model = "fal-ai/fast-sdxl", aspectRatio = "1:1", num_images = 1 } = requestBody;

    // Check model access
    const hasModelAccess = await quotaManager.checkModelAccess(user.id, model)
    if (!hasModelAccess) {
      const error = new Error("Model access denied");
      return createErrorResponse(error, {
        endpoint: 'generate-image',
        userId: user.id,
        model,
        code: ERROR_CODES.MODEL_UNAVAILABLE,
        statusCode: 403
      });
    }

    // Check quota limits
    const quotaCheck = await quotaManager.checkQuota(user.id, model)
    if (!quotaCheck.allowed) {
      const error = new Error(`Generation limit reached: ${quotaCheck.reason}`);
      return createErrorResponse(error, {
        endpoint: 'generate-image',
        userId: user.id,
        model,
        code: ERROR_CODES.QUOTA_EXCEEDED,
        statusCode: 429
      });
    }

    if (!prompt) {
      const error = new Error("Prompt is required");
      return createErrorResponse(error, {
        endpoint: 'generate-image',
        userId: user.id,
        code: ERROR_CODES.INVALID_PROMPT,
        statusCode: 400
      });
    }

    // Build FAL.AI input payload
    const input: Record<string, any> = {
      prompt,
      aspect_ratio: aspectRatio,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images,
      enable_safety_checker: true,
    };

    // Special handling for FLUX Kontext Edit
    if (model === "fal-ai/flux-pro/kontext") {
      const { image_url } = requestBody;
      if (!image_url) {
        const error = new Error("Reference image is required for this model");
        return createErrorResponse(error, {
          endpoint: 'generate-image',
          userId: user.id,
          model,
          code: ERROR_CODES.INVALID_PROMPT,
          statusCode: 400
        });
      }
      input.image_url = image_url;
    }

    // Special handling for FLUX Kontext Max model
    if (model === "fal-ai/flux-pro/kontext/max") {
      const { image_url, guidance_scale, num_images, output_format, safety_tolerance, seed } = requestBody;
      if (!image_url) {
        const error = new Error("Reference image is required for this model");
        return createErrorResponse(error, {
          endpoint: 'generate-image',
          userId: user.id,
          model,
          code: ERROR_CODES.INVALID_PROMPT,
          statusCode: 400
        });
      }
      input.image_url = image_url;
      input.guidance_scale = guidance_scale || 3.5;
      input.num_images = num_images || 1;
      input.output_format = output_format || "jpeg";
      input.safety_tolerance = safety_tolerance || "2";
      if (seed) {
        input.seed = seed;
      }
    }

    console.log("FAL.AI payload:", { model, input });

    // Generate image using fal.ai with timeout
    let result: any
    try {
      result = await Promise.race([
        fal.subscribe(model, { input }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Generation timeout')), timeoutMs)
        )
      ]);
    } catch (falError: any) {
      const isTimeout = falError.message?.includes('timeout');
      const errorCode = isTimeout ? ERROR_CODES.GENERATION_TIMEOUT : ERROR_CODES.INTERNAL_ERROR;
      
      return createErrorResponse(falError, {
        endpoint: 'generate-image',
        userId: user.id,
        model,
        prompt,
        code: errorCode,
        statusCode: isTimeout ? 408 : 500,
        retryAfter: isTimeout ? 60 : undefined
      });
    }

    if (!result.images || result.images.length === 0) {
      const error = new Error("No images generated");
      return createErrorResponse(error, {
        endpoint: 'generate-image',
        userId: user.id,
        model,
        prompt,
        code: ERROR_CODES.INTERNAL_ERROR,
        statusCode: 500
      });
    }

    // --- Image Analysis & Album Categorization ---
    // Album name is the display name from the model dropdown
    const modelDisplayNames: Record<string, string> = {
      'fal-ai/fast-sdxl': 'Fast SDXL',
      'fal-ai/flux/dev': 'FLUX Dev',
      'fal-ai/flux-pro/v1.1-ultra': 'FLUX Pro Ultra',
      'fal-ai/ideogram/v2': 'Ideogram v2',
      'fal-ai/ideogram/v3': 'Ideogram v3',
      'fal-ai/recraft-v3': 'Recraft V3',
      'fal-ai/stable-diffusion-v35-large': 'Stable Diffusion 3.5 Large',
      'fal-ai/hidream-i1-fast': 'HiDream I1 Fast',
      'fal-ai/flux-pro/kontext/text-to-image': 'FLUX Kontext T2I',
      'fal-ai/flux-pro/kontext': 'FLUX Kontext',
      'fal-ai/flux-pro/kontext/max': 'FLUX Kontext Max',
      'fal-ai/bytedance/seededit/v3/edit-image': 'SeedEdit V3',
    }
    let albumId: string | null = null
    const albumName = modelDisplayNames[model] || model.split('/').pop() || "Uncategorized"

    // Try to find an existing album for the user with a matching name
    const { data: existingAlbum } = await supabase
      .from("albums")
      .select("id")
      .eq("user_id", user.id)
      .ilike("name", albumName)
      .maybeSingle()

    if (existingAlbum && existingAlbum.id) {
      albumId = existingAlbum.id
    } else {
      // Create a new album
      const { data: newAlbum, error: albumError } = await supabase
        .from("albums")
        .insert({ user_id: user.id, name: albumName, cover_image_url: result.images[0].url })
        .select()
        .single()
      if (albumError) {
        console.error("Album creation error:", albumError)
      } else {
        albumId = newAlbum.id
      }
    }

    // Save all images to database and album
    const savedImages = []
    for (const img of result.images) {
      // Insert each image into generated_images
      const { data: savedImage, error: dbError } = await supabase
        .from("generated_images")
        .insert({
          user_id: user.id,
          prompt,
          model,
          image_url: img.url,
          parameters: {
            aspect_ratio: aspectRatio,
            num_inference_steps: 28,
            guidance_scale: 3.5,
          },
          metadata: {},
        })
        .select()
        .single()

      // Link each image to the album
      if (!dbError && albumId && savedImage?.id) {
        await supabase.from("album_images").insert({ album_id: albumId, image_id: savedImage.id })
        savedImages.push(savedImage)
      }
    }

    // Track usage for quota management
    await quotaManager.trackUsage(user.id, model, result.images.length)

    return NextResponse.json({ 
      images: savedImages,
      quotaInfo: {
        usage: quotaCheck.usage,
        limits: quotaCheck.limits
      }
    })
  } catch (error) {
    return createErrorResponse(error as Error, {
      endpoint: 'generate-image',
      userId: user?.id,
      model: requestBody?.model,
      prompt: requestBody?.prompt,
      code: ERROR_CODES.INTERNAL_ERROR,
      statusCode: 500
    });
  }
}
