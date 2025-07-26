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
  // Add response headers for Netlify compatibility
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  }

  console.log("🚀 FLUX Kontext Max Edit API called")
  try {
    const { prompt, image_url, guidance_scale = 0.5, seed } = await request.json()
    console.log("📝 Request data:", { prompt, image_url, guidance_scale, seed })

    if (!prompt || !image_url) {
      console.log("❌ Missing required fields:", { prompt: !!prompt, image_url: !!image_url })
      return NextResponse.json({ error: "Prompt and image URL are required" }, { status: 400, headers })
    }

    console.log("🔐 Checking authentication...")
    console.log("🌍 Supabase Environment Check:")
    console.log("- SUPABASE_URL exists:", !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log("- SUPABASE_ANON_KEY exists:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    console.log("- SUPABASE_SERVICE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    let supabase
    try {
      supabase = await createServerClient()
      console.log("✅ Supabase client created successfully")
    } catch (supabaseError) {
      console.error("❌ Failed to create Supabase client:", supabaseError)
      return NextResponse.json({ 
        error: "Database configuration error", 
        details: supabaseError instanceof Error ? supabaseError.message : String(supabaseError)
      }, { status: 500, headers })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error("❌ Supabase auth error:", authError)
      return NextResponse.json({ 
        error: "Authentication error", 
        details: authError.message 
      }, { status: 401, headers })
    }

    if (!user) {
      console.log("❌ No user found in session")
      return NextResponse.json({ error: "No authenticated user" }, { status: 401, headers })
    }
    
    console.log("✅ User authenticated:", user.id)

    // Check quota
    console.log("📊 Checking quota...")
    const model = "fal-ai/flux-pro/kontext/max"
    
    let quotaCheck
    try {
      quotaCheck = await quotaManager.checkQuota(user.id, model)
      console.log("📊 Quota check result:", quotaCheck)
    } catch (quotaError) {
      console.error("❌ Quota check failed:", quotaError)
      return NextResponse.json({
        error: "Quota system error",
        details: quotaError instanceof Error ? quotaError.message : String(quotaError)
      }, { status: 500, headers })
    }
    
    if (!quotaCheck.allowed) {
      console.log("❌ Quota exceeded:", quotaCheck.reason)
      return NextResponse.json({
        error: quotaCheck.reason || "Quota limit exceeded",
        quotaInfo: {
          usage: quotaCheck.usage,
          limits: quotaCheck.limits
        }
      }, { status: 429, headers })
    }
    console.log("✅ Quota check passed")

    // Configure fal.ai client
    console.log("🔧 Configuring fal.ai client...")
    
    if (!process.env.FAL_KEY) {
      console.error("❌ FAL_KEY environment variable is missing")
      return NextResponse.json({ error: "Configuration error: Missing API credentials" }, { status: 500, headers })
    }
    
    fal.config({
      credentials: process.env.FAL_KEY
    })
    console.log("✅ fal.ai client configured")
    

    // Call fal.ai API using official client with timeout
    console.log("🎨 Calling fal.ai FLUX Kontext Max API...")
    const falInput = {
      prompt,
      image_url,
      guidance_scale: guidance_scale || 3.5,
      num_images: 1,
      output_format: "jpeg",
      safety_tolerance: "2",
      ...(seed && { seed }),
    }
    console.log("📤 Sending to fal.ai:", falInput)

    // Set timeout based on deployment environment
    const isNetlify = process.env.NETLIFY === 'true'
    // Netlify's free tier has a 10s timeout. We set our internal timeout to 9s 
    // to fail gracefully instead of getting a generic 502 error.
    const timeoutMs = isNetlify ? 9000 : 60000 
    console.log(`⏰ Using timeout: ${timeoutMs}ms (Netlify detection: ${isNetlify})`)
    console.log(`🌍 Environment variables: FAL_KEY exists: ${!!process.env.FAL_KEY}`)
    console.log(`🌍 Platform detection: NODE_ENV=${process.env.NODE_ENV}, VERCEL=${!!process.env.VERCEL}, NETLIFY=${!!process.env.NETLIFY}`)
    
    let result
    try {
      console.log("🚀 Starting fal.ai API call with input:", JSON.stringify(falInput, null, 2))
      
      // Try fal.run first, fallback to fal.subscribe if needed
      try {
        console.log("📡 Attempting fal.run...")
        result = await withTimeout(
          fal.run("fal-ai/flux-pro/kontext/max", {
            input: falInput,
          }),
          timeoutMs
        )
        console.log("✅ fal.run succeeded")
      } catch (runError) {
        console.log("❌ fal.run failed, trying fal.subscribe:", runError)
        result = await withTimeout(
          fal.subscribe("fal-ai/flux-pro/kontext/max", {
            input: falInput,
            logs: true,
            onQueueUpdate: (update) => {
              console.log("🔄 Queue update:", update.status)
            },
          }),
          timeoutMs
        )
        console.log("✅ fal.subscribe succeeded")
      }
    } catch (timeoutError) {
      if (timeoutError instanceof Error && timeoutError.message.includes('timed out')) {
        console.error("⏰ Request timed out:", timeoutError.message)
        return NextResponse.json({ 
          error: "Image editing is taking longer than expected. Please try again with a simpler prompt or different image.",
          code: "TIMEOUT_ERROR"
        }, { status: 408, headers })
      }
      throw timeoutError
    }
    
    console.log("📥 fal.ai response received:", JSON.stringify(result, null, 2))

    // Validate API response
    console.log("🔍 Validating API response...")
    const resultData = result as any
    
    // Handle both fal.run (direct) and fal.subscribe (nested in .data) response formats
    let imageData, generatedSeed
    if (resultData.data && resultData.data.image) {
      // fal.subscribe format
      console.log("📦 Using fal.subscribe response format")
      imageData = resultData.data.image
      generatedSeed = resultData.data.seed
    } else if (resultData.image) {
      // fal.run format
      console.log("📦 Using fal.run response format")
      imageData = resultData.image
      generatedSeed = resultData.seed
    } else {
      console.error("❌ Invalid fal.ai API response:", result)
      return NextResponse.json({ error: "Invalid response from image editing service" }, { status: 500, headers })
    }
    
    if (!imageData || !imageData.url) {
      console.error("❌ No image URL in response:", imageData)
      return NextResponse.json({ error: "No image URL in response" }, { status: 500, headers })
    }
    console.log("✅ API response valid")
    console.log("🖼️ Extracted image data:", { url: imageData.url, seed: generatedSeed })

    // Find or create "FLUX Kontext Max" album (for edited images)
    console.log("📁 Finding/creating FLUX Kontext Max album...")
    let album
    try {
      const { data: albumData, error: albumError } = await supabase
        .from("albums")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", "FLUX Kontext Max")
        .single()

      if (albumError && albumError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error("❌ Error finding album:", albumError)
        throw albumError
      }
      
      album = albumData

      if (!album) {
        console.log("📁 Creating new FLUX Kontext Max album...")
        const { data: newAlbum, error: createError } = await supabase
          .from("albums")
          .insert({ 
            user_id: user.id, 
            name: "FLUX Kontext Max",
            cover_image_url: imageData.url  // Set the first image as cover
          })
          .select("id")
          .single()
          
        if (createError) {
          console.error("❌ Error creating album:", createError)
          throw createError
        }
        
        album = newAlbum
        console.log("✅ Album created with cover image:", album?.id)
      } else {
        console.log("✅ Album found:", album.id)
        
        // Check if album has a cover image, if not, set this as the cover
        const { data: albumData, error: coverError } = await supabase
          .from("albums")
          .select("cover_image_url")
          .eq("id", album.id)
          .single()
        
        if (coverError) {
          console.error("❌ Error checking cover image:", coverError)
          // Continue anyway, this is not critical
        } else if (!albumData?.cover_image_url) {
          console.log("📁 Setting cover image for existing album...")
          const { error: updateError } = await supabase
            .from("albums")
            .update({ cover_image_url: imageData.url })
            .eq("id", album.id)
            
          if (updateError) {
            console.error("❌ Error updating cover image:", updateError)
            // Continue anyway, this is not critical
          } else {
            console.log("✅ Cover image set for album")
          }
        }
      }
    } catch (albumManagementError) {
      console.error("❌ Album management failed:", albumManagementError)
      // Don't fail the whole request, just log the error
      album = null
    }

    // Save edited image to database
    console.log("💾 Saving edited image to database...")
    console.log("📋 Image data to save:", {
      user_id: user.id,
      prompt: prompt.substring(0, 50) + "...",
      model,
      image_url: imageData.url.substring(0, 50) + "...",
      has_guidance_scale: !!guidance_scale,
      has_seed: !!generatedSeed
    })
    
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
      console.error("❌ Database save error:", dbError)
      console.error("❌ Database error details:", {
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint
      })
      return NextResponse.json({ 
        error: "Failed to save image to database", 
        details: dbError.message,
        code: dbError.code
      }, { status: 500, headers })
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

    console.log("🎉 FLUX Kontext Max image editing completed successfully!")
    return NextResponse.json({
      image: savedImage,
      quotaInfo: {
        usage: quotaCheck.usage,
        limits: quotaCheck.limits
      }
    }, { headers })
  } catch (error) {
    console.error("💥 Fatal error in FLUX Kontext Max Edit API:", error)
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
        }, { status: 503, headers })
      }
      if (error.message.includes('timed out')) {
        return NextResponse.json({ 
          error: "Image editing is taking longer than expected. Please try again.",
          code: "TIMEOUT_ERROR",
          details: error.message
        }, { status: 408, headers })
      }
      if (error.message.includes('quota') || error.message.includes('limit')) {
        return NextResponse.json({ 
          error: "Service quota exceeded. Please try again later.",
          code: "QUOTA_ERROR",
          details: error.message
        }, { status: 429, headers })
      }
    }
    
    return NextResponse.json({ 
      error: "An unknown error has occurred",
      code: "UNKNOWN_ERROR",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500, headers })
  }
} 