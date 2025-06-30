import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { quotaManager } from "@/lib/quota-manager"
import { fal } from "@fal-ai/client"

// Add timeout wrapper for Netlify compatibility
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

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

    // Call fal.ai API using official client with timeout
    console.log("🎨 Calling fal.ai SeedEdit V3 API...")
    const falInput = {
      prompt,
      image_url,
      guidance_scale,
      ...(seed && { seed }),
    }
    console.log("📤 Sending to fal.ai:", falInput)

    // Set timeout based on deployment environment
    const isNetlify = process.env.NETLIFY === 'true'
    const timeoutMs = isNetlify ? 18000 : 60000 // 18s for Netlify, 60s for other environments
    console.log(`⏰ Using timeout: ${timeoutMs}ms (Netlify: ${isNetlify})`)
    console.log(`🌍 Environment variables: FAL_KEY exists: ${!!process.env.FAL_KEY}`)
    
    let result
    try {
      // Use fal.run instead of fal.subscribe for faster execution
      result = await withTimeout(
        fal.run("fal-ai/bytedance/seededit/v3/edit-image", {
          input: falInput,
        }),
        timeoutMs
      )
    } catch (timeoutError) {
      if (timeoutError instanceof Error && timeoutError.message.includes('timed out')) {
        console.error("⏰ Request timed out:", timeoutError.message)
        return NextResponse.json({ 
          error: "Image editing is taking longer than expected. Please try again with a simpler prompt or different image.",
          code: "TIMEOUT_ERROR"
        }, { status: 408 })
      }
      throw timeoutError
    }
    
    console.log("📥 fal.ai response received:", JSON.stringify(result, null, 2))

    // Validate API response
    console.log("🔍 Validating API response...")
    const resultData = result as any
    if (!resultData.image || !resultData.image.url) {
      console.error("❌ Invalid fal.ai API response:", result)
      return NextResponse.json({ error: "Invalid response from image editing service" }, { status: 500 })
    }
    console.log("✅ API response valid")

    // Extract result data (fal.run returns direct result, not nested in .data)
    const imageData = resultData.image // Single image object
    const generatedSeed = resultData.seed
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
    console.error("Error type:", typeof error)
    console.error("Error name:", error instanceof Error ? error.name : "Unknown")
    console.error("Error message:", error instanceof Error ? error.message : String(error))
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace")
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('fetch failed') || error.message.includes('network')) {
        return NextResponse.json({ 
          error: "Network error connecting to image editing service. Please try again.",
          code: "NETWORK_ERROR",
          details: error.message
        }, { status: 503 })
      }
      if (error.message.includes('timed out')) {
        return NextResponse.json({ 
          error: "Image editing is taking longer than expected. Please try again.",
          code: "TIMEOUT_ERROR",
          details: error.message
        }, { status: 408 })
      }
      if (error.message.includes('quota') || error.message.includes('limit')) {
        return NextResponse.json({ 
          error: "Service quota exceeded. Please try again later.",
          code: "QUOTA_ERROR",
          details: error.message
        }, { status: 429 })
      }
    }
    
    return NextResponse.json({ 
      error: "An unknown error has occurred",
      code: "UNKNOWN_ERROR",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 