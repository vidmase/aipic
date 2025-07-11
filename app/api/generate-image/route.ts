import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import * as fal from "@fal-ai/serverless-client"
import { quotaManager } from "@/lib/quota-manager"

// Configure fal client
fal.config({
  credentials: process.env.FAL_KEY,
})

// Placeholder for image recognition/tagging
async function analyzeImageContent(imageUrl: string, prompt: string): Promise<string[]> {
  // TODO: Replace with real image recognition API (e.g., Google Vision, CLIP, etc.)
  // For now, just use prompt keywords as tags
  return prompt
    .split(/\W+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 2);
}

// --- Image Generation Quota Config ---
const IMAGE_GENERATION_QUOTA_PER_DAY = 3; // Change this value to adjust quota

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check authentication
      const {
    data: { user },
  } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json();
    const { prompt, model = "fal-ai/fast-sdxl", aspectRatio = "1:1", num_images = 1 } = body;

    // Check model access
    const hasModelAccess = await quotaManager.checkModelAccess(user.id, model)
    if (!hasModelAccess) {
      return NextResponse.json({
        error: "You don't have access to this model. Please upgrade your plan or contact support."
      }, { status: 403 })
    }

    // Check quota limits
    const quotaCheck = await quotaManager.checkQuota(user.id, model)
    if (!quotaCheck.allowed) {
      return NextResponse.json({
        error: `Generation limit reached: ${quotaCheck.reason}`,
        quotaInfo: {
          usage: quotaCheck.usage,
          limits: quotaCheck.limits
        }
      }, { status: 429 })
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
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
      const { image_url } = body;
      if (!image_url) {
        return NextResponse.json({ error: "Reference image is required for this model." }, { status: 400 });
      }
      input.image_url = image_url;
    }

    console.log("FAL.AI payload:", { model, input });

    // Generate image using fal.ai
    let result: any
    try {
      result = await fal.subscribe(model, {
        input,
      })
    } catch (falError: any) {
      console.error("FAL.AI error:", falError)
      return NextResponse.json({ error: falError?.message || "FAL.AI error", details: falError }, { status: 500 })
    }

    if (!result.images || result.images.length === 0) {
      return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
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
      'fal-ai/bytedance/seededit/v3/edit-image': 'SeedEdit V3',
    }
    let albumId: string | null = null
    let albumName = modelDisplayNames[model] || model.split('/').pop() || "Uncategorized"

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
    console.error("Error generating image:", error)
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 })
  }
}
