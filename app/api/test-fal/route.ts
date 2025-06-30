import { NextRequest, NextResponse } from "next/server"
import { fal } from "@fal-ai/client"

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 Testing fal.ai connectivity...")
    
    // Check environment variables
    const envCheck = {
      FAL_KEY: !!process.env.FAL_KEY,
      NETLIFY: process.env.NETLIFY === 'true'
    }
    
    console.log("🌍 Environment variables:", envCheck)
    
    if (!process.env.FAL_KEY) {
      return NextResponse.json({
        success: false,
        error: "Missing FAL_KEY environment variable",
        envCheck
      }, { status: 500 })
    }
    
    // Configure fal.ai client
    console.log("🔧 Configuring fal.ai client...")
    fal.config({
      credentials: process.env.FAL_KEY
    })
    console.log("✅ fal.ai client configured")
    
    // Test with a simple, fast model first
    console.log("🚀 Testing with fast-sdxl (should be quick)...")
    try {
      const testResult = await fal.run("fal-ai/fast-sdxl", {
        input: { 
          prompt: "test", 
          image_size: "square",
          num_images: 1
        }
      })
      
      console.log("✅ fal.run with fast-sdxl succeeded")
      
      return NextResponse.json({
        success: true,
        message: "fal.ai connectivity test passed",
        envCheck,
        falTest: "✅ Success (fast-sdxl)",
        resultStructure: {
          hasImages: !!(testResult as any).images,
          imageCount: (testResult as any).images?.length || 0,
          firstImageUrl: (testResult as any).images?.[0]?.url?.substring(0, 50) + "..." || "No URL"
        },
        timestamp: new Date().toISOString()
      })
      
    } catch (falError) {
      console.error("❌ fal.ai API test failed:", falError)
      
      return NextResponse.json({
        success: false,
        error: "fal.ai API test failed",
        details: falError instanceof Error ? falError.message : String(falError),
        errorName: falError instanceof Error ? falError.name : "Unknown",
        envCheck,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error("❌ fal.ai test failed:", error)
    return NextResponse.json({
      success: false,
      error: "fal.ai test failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("🧪 Testing SeedEdit V3 specifically...")
    
    const { prompt = "add sunglasses", image_url } = await request.json()
    
    if (!image_url) {
      return NextResponse.json({
        success: false,
        error: "image_url is required for SeedEdit test"
      }, { status: 400 })
    }
    
    console.log("🔧 Configuring fal.ai client...")
    fal.config({
      credentials: process.env.FAL_KEY
    })
    
    const falInput = {
      prompt,
      image_url,
      guidance_scale: 0.5,
    }
    
    console.log("📤 Testing SeedEdit V3 with input:", falInput)
    
    // Test both fal.run and fal.subscribe
    let result
    let method = "unknown"
    
    try {
      console.log("📡 Attempting fal.run...")
      result = await fal.run("fal-ai/bytedance/seededit/v3/edit-image", {
        input: falInput,
      })
      method = "fal.run"
      console.log("✅ fal.run succeeded")
    } catch (runError) {
      console.log("❌ fal.run failed, trying fal.subscribe:", runError)
      
      try {
        result = await fal.subscribe("fal-ai/bytedance/seededit/v3/edit-image", {
          input: falInput,
          logs: true,
        })
        method = "fal.subscribe"
        console.log("✅ fal.subscribe succeeded")
      } catch (subscribeError) {
        console.error("❌ Both fal.run and fal.subscribe failed")
        return NextResponse.json({
          success: false,
          error: "Both fal.run and fal.subscribe failed",
          runError: runError instanceof Error ? runError.message : String(runError),
          subscribeError: subscribeError instanceof Error ? subscribeError.message : String(subscribeError)
        }, { status: 500 })
      }
    }
    
    console.log("📥 SeedEdit V3 response received")
    
    // Analyze response structure
    const resultData = result as any
    let imageUrl = null
    let responseFormat = "unknown"
    
    if (resultData.data && resultData.data.image) {
      // fal.subscribe format
      responseFormat = "fal.subscribe"
      imageUrl = resultData.data.image.url
    } else if (resultData.image) {
      // fal.run format
      responseFormat = "fal.run"
      imageUrl = resultData.image.url
    }
    
    return NextResponse.json({
      success: true,
      message: "SeedEdit V3 test passed",
      method,
      responseFormat,
      hasImageUrl: !!imageUrl,
      imageUrlPreview: imageUrl ? imageUrl.substring(0, 80) + "..." : null,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error("❌ SeedEdit V3 test failed:", error)
    return NextResponse.json({
      success: false,
      error: "SeedEdit V3 test failed",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 