import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { quotaManager } from "@/lib/quota-manager"
import { fal } from "@fal-ai/client"

export async function POST(request: NextRequest) {
  console.log("🚀 SeedEdit V3 API called")
  try {
    const { prompt, image_url, guidance_scale = 0.5, seed } = await request.json()
    console.log("📝 Request data:", { prompt, image_url, guidance_scale, seed })

    if (!prompt || !image_url) {
      console.log("❌ Missing required fields:", { prompt: !!prompt, image_url: !!image_url })
      return NextResponse.json({ error: "Prompt and image URL are required" }, { status: 400 })
    }

    console.log("🔐 Checking authentication...")
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("❌ Authentication failed:", authError?.message || "No user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.log("✅ User authenticated:", user.id)

    // Check quota
    console.log("📊 Checking quota...")
    const model = "fal-ai/bytedance/seededit/v3/edit-image"
    const quotaCheck = await quotaManager.checkQuota(user.id, model)
    console.log("📊 Quota check result:", quotaCheck)
    
    if (!quotaCheck.allowed) {
      console.log("❌ Quota exceeded:", quotaCheck.reason)
      return NextResponse.json({
        error: quotaCheck.reason || "Quota limit exceeded",
        quotaInfo: {
          usage: quotaCheck.usage,
          limits: quotaCheck.limits
        }
      }, { status: 429 })
    }
    console.log("✅ Quota check passed")

    // Configure fal.ai client
    console.log("🔧 Configuring fal.ai client...")
    fal.config({
      credentials: process.env.FAL_KEY
    })
    console.log("✅ fal.ai client configured")

    // Call fal.ai API using official client
    console.log("🎨 Calling fal.ai SeedEdit V3 API...")
    const falInput = {
      prompt,
      image_url,
      guidance_scale,
      ...(seed && { seed }),
    }
    console.log("📤 Sending to fal.ai:", falInput)

    const result = await fal.subscribe("fal-ai/bytedance/seededit/v3/edit-image", {
      input: falInput,
      logs: true,
      onQueueUpdate: (update) => {
        console.log("🔄 Queue update:", update.status)
        if (update.status === "IN_PROGRESS") {
          console.log("⏳ SeedEdit processing:", update.logs?.map((log) => log.message).join(", "))
        }
      },
    })
    console.log("📥 fal.ai response received:", JSON.stringify(result, null, 2))

    // Validate API response
    console.log("🔍 Validating API response...")
    if (!result.data || !result.data.image || !result.data.image.url) {
      console.error("❌ Invalid fal.ai API response:", result)
      return NextResponse.json({ error: "Invalid response from image editing service" }, { status: 500 })
    }
    console.log("✅ API response valid")

    // Extract result data (API returns result.data with image object, not array)
    const imageData = result.data.image // Single image object
    const generatedSeed = result.data.seed
    console.log("🖼️ Extracted image data:", { url: imageData.url, seed: generatedSeed })

    // Find or create "SeedEdit V3" album
    console.log("📁 Finding/creating SeedEdit V3 album...")
    let { data: album } = await supabase
      .from("albums")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", "SeedEdit V3")
      .single()

    if (!album) {
      console.log("📁 Creating new SeedEdit V3 album...")
      const { data: newAlbum } = await supabase
        .from("albums")
        .insert({ 
          user_id: user.id, 
          name: "SeedEdit V3",
          cover_image_url: imageData.url  // Set the first image as cover
        })
        .select("id")
        .single()
      album = newAlbum
      console.log("✅ Album created with cover image:", album?.id)
    } else {
      console.log("✅ Album found:", album.id)
      
      // Check if album has a cover image, if not, set this as the cover
      const { data: albumData } = await supabase
        .from("albums")
        .select("cover_image_url")
        .eq("id", album.id)
        .single()
      
      if (!albumData?.cover_image_url) {
        console.log("📁 Setting cover image for existing album...")
        await supabase
          .from("albums")
          .update({ cover_image_url: imageData.url })
          .eq("id", album.id)
        console.log("✅ Cover image set for album")
      }
    }

    // Save edited image to database
    console.log("💾 Saving edited image to database...")
    const { data: savedImage, error: dbError } = await supabase
      .from("generated_images")
      .insert({
        user_id: user.id,
        prompt,
        model,
        image_url: imageData.url,
        parameters: {
          image_url,
          guidance_scale,
          seed: generatedSeed,
        },
        metadata: {
          original_seed: seed,
          generated_seed: generatedSeed,
        },
      })
      .select()
      .single()

    if (dbError) {
      console.error("❌ Database error:", dbError)
      return NextResponse.json({ error: "Failed to save image" }, { status: 500 })
    }
    console.log("✅ Image saved to database:", savedImage.id)

    // Link image to album
    if (album?.id) {
      console.log("🔗 Linking image to album...")
      await supabase.from("album_images").insert({
        album_id: album.id,
        image_id: savedImage.id
      })
      console.log("✅ Image linked to album")
    }

    // Track usage for quota management
    console.log("📊 Tracking usage...")
    await quotaManager.trackUsage(user.id, model, 1)
    console.log("✅ Usage tracked")

    console.log("🎉 SeedEdit V3 image editing completed successfully!")
    return NextResponse.json({
      image: savedImage,
      quotaInfo: {
        usage: quotaCheck.usage,
        limits: quotaCheck.limits
      }
    })
  } catch (error) {
    console.error("💥 Fatal error in SeedEdit V3 API:", error)
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json({ error: "Failed to edit image" }, { status: 500 })
  }
} 