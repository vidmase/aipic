import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { quotaManager } from "@/lib/quota-manager"

export async function POST(request: NextRequest) {
  try {
    const { prompt, image_url, guidance_scale = 0.5, seed } = await request.json()

    if (!prompt || !image_url) {
      return NextResponse.json({ error: "Prompt and image URL are required" }, { status: 400 })
    }

    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check quota
    const model = "fal-ai/bytedance/seededit/v3/edit-image"
    const quotaCheck = await quotaManager.checkQuota(user.id, model)
    if (!quotaCheck.allowed) {
      return NextResponse.json({
        error: quotaCheck.reason || "Quota limit exceeded",
        quotaInfo: {
          usage: quotaCheck.usage,
          limits: quotaCheck.limits
        }
      }, { status: 429 })
    }

    // Call fal.ai API
    const response = await fetch("https://fal.run/fal-ai/bytedance/seededit/v3/edit-image", {
      method: "POST",
      headers: {
        "Authorization": `Key ${process.env.FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        image_url,
        guidance_scale,
        ...(seed && { seed }),
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("fal.ai API error:", errorData)
      return NextResponse.json({ error: "Failed to edit image" }, { status: 500 })
    }

    const result = await response.json()

    // Find or create "SeedEdit V3" album
    let { data: album } = await supabase
      .from("albums")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", "SeedEdit V3")
      .single()

    if (!album) {
      const { data: newAlbum } = await supabase
        .from("albums")
        .insert({ user_id: user.id, name: "SeedEdit V3" })
        .select("id")
        .single()
      album = newAlbum
    }

    // Save edited image to database
    const { data: savedImage, error: dbError } = await supabase
      .from("generated_images")
      .insert({
        user_id: user.id,
        prompt,
        model,
        image_url: result.image.url,
        parameters: {
          image_url,
          guidance_scale,
          ...(seed && { seed }),
        },
        metadata: {},
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: "Failed to save image" }, { status: 500 })
    }

    // Link image to album
    if (album?.id) {
      await supabase.from("album_images").insert({
        album_id: album.id,
        image_id: savedImage.id
      })
    }

    // Track usage for quota management
    await quotaManager.trackUsage(user.id, model, 1)

    return NextResponse.json({
      image: savedImage,
      quotaInfo: {
        usage: quotaCheck.usage,
        limits: quotaCheck.limits
      }
    })
  } catch (error) {
    console.error("Error editing image:", error)
    return NextResponse.json({ error: "Failed to edit image" }, { status: 500 })
  }
} 